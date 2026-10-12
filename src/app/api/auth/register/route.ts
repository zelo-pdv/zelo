import { NextResponse } from "next/server";
import { SignJWT } from "jose";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { registerSchema } from "@/lib/validations/auth";
import { setAuthCookies } from "@/lib/cookies";
import { JWT_SECRET } from "@/lib/jwt-secret";
import { checkRateLimit } from "@/lib/rate-limit";

const defaultAccessGroups = [
  {
    name: "ADMIN",
    description: "Administrador do Sistema (Acesso Total)",
    permissions: {
      dashboard: ["Visualizar"],
      historico: ["Visualizar", "Editar", "Excluir"],
      "nova-venda": ["Visualizar", "Adicionar"],
      clientes: ["Visualizar", "Adicionar", "Editar", "Excluir"],
      produtos: ["Visualizar", "Adicionar", "Editar", "Excluir"],
      categorias: ["Visualizar", "Adicionar", "Editar", "Excluir"],
      configuracoes: ["Visualizar", "Editar", "Excluir"],
      usuarios: ["Visualizar", "Adicionar", "Editar", "Excluir"],
    },
  },
  {
    name: "Gerente",
    description: "Acesso gerencial com controle de vendas, produtos e clientes",
    permissions: {
      dashboard: ["Visualizar"],
      historico: ["Visualizar", "Editar", "Excluir"],
      "nova-venda": ["Visualizar", "Adicionar"],
      clientes: ["Visualizar", "Adicionar", "Editar", "Excluir"],
      produtos: ["Visualizar", "Adicionar", "Editar", "Excluir"],
      categorias: ["Visualizar", "Adicionar", "Editar", "Excluir"],
    },
  },
  {
    name: "Operador de Caixa",
    description: "Pode registrar vendas e consultar produtos e clientes",
    permissions: {
      dashboard: ["Visualizar"],
      "nova-venda": ["Visualizar", "Adicionar"],
      clientes: ["Visualizar", "Adicionar"],
      produtos: ["Visualizar"],
      historico: ["Visualizar"],
    },
  },
];

export async function POST(req: Request) {
  // Limite de requisições para evitar abusos no cadastro
  const rateLimit = checkRateLimit(req, 10, 15 * 60 * 1000);
  if (!rateLimit.success) return rateLimit.response;

  try {
    const body = await req.json();
    const parseResult = registerSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: parseResult.error.issues[0]?.message || "Dados inválidos.",
          details: parseResult.error.issues,
        },
        { status: 400 }
      );
    }

    const { ownerName, storeName, email, password, phone } = parseResult.data;
    const normalizedEmail = email.trim().toLowerCase();
    const trimmedStoreName = storeName.trim();
    const trimmedOwnerName = ownerName.trim();

    // 1. Verificar duplicidade de e-mail
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });
    if (existingUser) {
      return NextResponse.json(
        { error: "Este e-mail já está em uso por outro usuário." },
        { status: 400 }
      );
    }

    // 2. Verificar duplicidade de nome de loja
    const existingLoja = await prisma.loja.findUnique({
      where: { name: trimmedStoreName },
    });
    if (existingLoja) {
      return NextResponse.json(
        { error: "Já existe uma loja cadastrada com este nome. Escolha outro nome." },
        { status: 400 }
      );
    }

    // 3. Hash da senha
    const hashedPassword = await bcrypt.hash(password, 10);

    // 4. Criação atômica no banco de dados via Transaction
    const { loja, ownerUser, adminGroup } = await prisma.$transaction(
      async (tx) => {
        // A. Cria a Loja com relacionamentos padrões e Settings com onboarding pendente
        const newLoja = await tx.loja.create({
          data: {
            name: trimmedStoreName,
            ownerName: trimmedOwnerName,
            email: normalizedEmail,
            phone: phone || null,
            active: true,
            accessGroups: {
              create: defaultAccessGroups.map((g) => ({
                name: g.name,
                description: g.description,
                permissions: g.permissions,
                active: true,
              })),
            },
            clients: {
              create: {
                name: "Consumidor Final",
                phone: "",
              },
            },
            categories: {
              create: {
                name: "Geral",
              },
            },
            settings: {
              create: {
                config: {
                  onboarding: {
                    completed: false,
                    step: 1,
                    createdAt: new Date().toISOString(),
                  },
                  store: {
                    name: trimmedStoreName,
                    ownerName: trimmedOwnerName,
                    email: normalizedEmail,
                    phone: phone || "",
                    address: "",
                    document: "",
                  },
                  products: {
                    trackStock: true,
                    globalLowStockThreshold: 5,
                    hideCostPrice: false,
                    showProductImages: true,
                    categoryLowStockThresholds: {},
                  },
                  sales: {
                    requireClient: false,
                    blockOutOfStock: false,
                    defaultPaymentMethod: "PIX",
                    defaultSaleStatus: "PAGO",
                    paymentMethods: [
                      "DINHEIRO",
                      "PIX",
                      "CARTAO_DE_CREDITO",
                      "CARTAO_DEBITO",
                    ],
                    openPriceEnabled: false,
                    openPriceMode: "ALL",
                    openPriceProductIds: [],
                    discountLimitEnabled: false,
                  },
                  dashboard: {
                    defaultPeriod: "today",
                    recentSalesCount: 5,
                    hideLowStockCard: false,
                    hideRecentSales: false,
                  },
                  notifications: {
                    enableToasts: true,
                    outOfStockWarning: true,
                  },
                  voucher: {
                    logo: "",
                    resellerName: trimmedStoreName,
                    footerText: "Obrigado pela preferência!",
                    showContact: true,
                  },
                },
              },
            },
          },
          include: {
            accessGroups: true,
          },
        });

        // B. Localiza o grupo ADMIN criado para esta loja
        const createdAdminGroup = newLoja.accessGroups.find(
          (g) => g.name === "ADMIN"
        );
        if (!createdAdminGroup) {
          throw new Error("Grupo ADMIN não pôde ser criado para a loja.");
        }

        // C. Cria o Usuário Administrador (Dono)
        const newOwner = await tx.user.create({
          data: {
            name: trimmedOwnerName,
            email: normalizedEmail,
            password: hashedPassword,
            phone: phone || null,
            lojaId: newLoja.id,
            groupId: createdAdminGroup.id,
            active: true,
          },
        });

        // D. Atualiza a Loja com ownerId
        await tx.loja.update({
          where: { id: newLoja.id },
          data: { ownerId: newOwner.id },
        });

        return {
          loja: newLoja,
          ownerUser: newOwner,
          adminGroup: createdAdminGroup,
        };
      },
      { maxWait: 15000, timeout: 30000 }
    );

    // 5. Gera JWT e autentica automaticamente o usuário
    const payload = {
      sub: ownerUser.id,
      email: ownerUser.email,
      name: ownerUser.name,
      groupName: adminGroup.name,
      isAdmin: true,
      permissions: adminGroup.permissions as any,
      lojaId: loja.id,
      onboardingCompleted: false,
    };

    const token = await new SignJWT(payload)
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("8h")
      .sign(JWT_SECRET);

    await setAuthCookies(token, payload);

    return NextResponse.json(
      {
        success: true,
        user: payload,
        redirectTo: "/onboarding",
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Erro no cadastro de conta:", error);
    return NextResponse.json(
      { error: "Erro interno ao criar conta. Tente novamente." },
      { status: 500 }
    );
  }
}
