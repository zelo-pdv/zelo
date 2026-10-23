import "dotenv/config";
import bcrypt from "bcryptjs";
import prisma from "../src/lib/prisma";

async function main() {
  const email = process.env.ADMIN_EMAIL || "admin@zelo.app";
  const password = process.env.ADMIN_PASSWORD || "Admin@123456";
  const name = process.env.ADMIN_NAME || "Super Administrador";

  console.log(`[Provisioning] Iniciando provisionamento do PlatformAdmin...`);
  console.log(`[Provisioning] Email alvo: ${email}`);

  if (!email || !password) {
    console.error("[Provisioning] ERRO: ADMIN_EMAIL ou ADMIN_PASSWORD não definidos.");
    process.exit(1);
  }

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  const admin = await prisma.platformAdmin.upsert({
    where: { email },
    update: {
      name,
      passwordHash,
      role: "SUPERADMIN",
      active: true,
      updatedAt: new Date(),
    },
    create: {
      name,
      email,
      passwordHash,
      role: "SUPERADMIN",
      active: true,
    },
  });

  console.log(`[Provisioning] SUCESSO: PlatformAdmin configurado com sucesso!`);
  console.log(`[Provisioning] ID: ${admin.id}`);
  console.log(`[Provisioning] Nome: ${admin.name}`);
  console.log(`[Provisioning] Email: ${admin.email}`);
  console.log(`[Provisioning] Papel: ${admin.role}`);
  console.log(`[Provisioning] Ativo: ${admin.active}`);
}

main()
  .catch((e) => {
    console.error("[Provisioning] Erro durante provisionamento:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
