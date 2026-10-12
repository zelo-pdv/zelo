import { currency } from "@/lib/format";
import { maskPhone } from "@/lib/masks";

export interface FormattedAudit {
  title: string;
  categoryLabel: string;
  icon: string;
  colorClass: string;
  badgeClass: string;
  primaryDetail: string;
  secondaryDetail?: string;
  tags: { text: string; variant?: "default" | "success" | "warning" | "danger" | "info" }[];
}

export const PAYMENT_METHOD_NAMES: Record<string, string> = {
  DINHEIRO: "Dinheiro",
  PIX: "PIX",
  CARTAO_CREDITO: "Cartão de Crédito",
  CARTAO_DEBITO: "Cartão de Débito",
  BOLETO: "Boleto",
  CREDIARIO: "Crediário / Fiado",
  OUTRO: "Outro",
};

export const SALE_STATUS_NAMES: Record<string, string> = {
  PAGO: "Pago",
  PENDENTE: "Pendente",
  CANCELADO: "Cancelado",
};

export function parseAuditDetails(raw: any): Record<string, any> {
  if (!raw) return {};
  if (typeof raw === "object") return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export function formatAuditLog(log: {
  action: string;
  entity: string;
  details: any;
  user?: { name?: string; email?: string } | null;
  createdAt: string | Date;
}): FormattedAudit {
  const details = parseAuditDetails(log.details);
  const action = (log.action || "").toUpperCase();
  const entity = (log.entity || "").toLowerCase();

  // 1. VENDAS
  if (action.includes("SALE") || entity === "sale") {
    const saleNum = details.saleNumber ? `#${details.saleNumber}` : "";
    const totalFormatted = details.total !== undefined ? currency(details.total) : "";
    const clientName = details.clientName || details.client || "";
    const payment = details.paymentMethod ? (PAYMENT_METHOD_NAMES[details.paymentMethod] || details.paymentMethod) : "";
    const status = details.status || details.newStatus;
    const statusName = status ? (SALE_STATUS_NAMES[status] || status) : "";

    if (action === "CREATE_SALE") {
      const tags: FormattedAudit["tags"] = [];
      if (payment) tags.push({ text: payment, variant: "info" });
      if (statusName) {
        tags.push({
          text: statusName,
          variant: status === "PAGO" ? "success" : status === "PENDENTE" ? "warning" : "danger",
        });
      }

      return {
        title: `Nova venda realizada ${saleNum}`.trim(),
        categoryLabel: "Vendas",
        icon: "cart",
        colorClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
        badgeClass: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
        primaryDetail: totalFormatted ? `Valor total: ${totalFormatted}` : "Venda registrada",
        secondaryDetail: clientName ? `Cliente: ${clientName}` : undefined,
        tags,
      };
    }

    if (action === "CANCEL_SALE") {
      return {
        title: `Venda cancelada ${saleNum}`.trim(),
        categoryLabel: "Vendas",
        icon: "x-circle",
        colorClass: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
        badgeClass: "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 border-red-200 dark:border-red-800",
        primaryDetail: totalFormatted ? `Estorno da venda no valor de ${totalFormatted}` : "A venda foi cancelada e o estoque estornado.",
        secondaryDetail: clientName ? `Cliente: ${clientName}` : undefined,
        tags: [{ text: "Cancelada", variant: "danger" }],
      };
    }

    if (action === "UPDATE_SALE_STATUS") {
      const oldStatusName = details.oldStatus ? (SALE_STATUS_NAMES[details.oldStatus] || details.oldStatus) : "";
      return {
        title: `Status da venda ${saleNum} alterado`.trim(),
        categoryLabel: "Vendas",
        icon: "refresh",
        colorClass: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
        badgeClass: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-800",
        primaryDetail: oldStatusName && statusName
          ? `Status alterado de "${oldStatusName}" para "${statusName}"`
          : `Status atualizado para ${statusName || "novo valor"}`,
        secondaryDetail: clientName ? `Cliente: ${clientName}` : undefined,
        tags: statusName ? [{ text: statusName, variant: status === "PAGO" ? "success" : "warning" }] : [],
      };
    }

    if (action === "UPDATE_SALE") {
      const oldTotalFormatted = details.oldTotal !== undefined ? currency(details.oldTotal) : "";
      const newTotalFormatted = details.newTotal !== undefined ? currency(details.newTotal) : "";
      return {
        title: `Venda ${saleNum} editada`.trim(),
        categoryLabel: "Vendas",
        icon: "pencil",
        colorClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
        badgeClass: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800",
        primaryDetail: oldTotalFormatted && newTotalFormatted
          ? `Valor alterado de ${oldTotalFormatted} para ${newTotalFormatted}`
          : "Itens ou condições da venda foram atualizados.",
        secondaryDetail: clientName ? `Cliente: ${clientName}` : undefined,
        tags: [{ text: "Editada", variant: "warning" }],
      };
    }
  }

  // 2. PRODUTOS & ESTOQUE
  if (action.includes("PRODUCT") || action.includes("STOCK") || entity === "product") {
    const prodName = details.name || details.newName || "Produto";

    if (action === "CREATE_PRODUCT" || action === "CREATE") {
      const price = details.salePrice !== undefined ? currency(details.salePrice) : "";
      const stock = details.stock !== undefined ? `${details.stock} un.` : "";
      return {
        title: "Novo produto cadastrado",
        categoryLabel: "Produtos",
        icon: "package",
        colorClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
        badgeClass: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
        primaryDetail: `Produto: "${prodName}"`,
        secondaryDetail: price ? `Preço de venda: ${price}${stock ? ` • Estoque inicial: ${stock}` : ""}` : undefined,
        tags: [{ text: "Produto", variant: "info" }],
      };
    }

    if (action === "UPDATE_STOCK") {
      const oldStock = details.oldStock ?? "?";
      const newStock = details.newStock ?? "?";
      const diff = details.increment !== undefined ? details.increment : (Number(newStock) - Number(oldStock));
      const diffText = diff > 0 ? `+${diff}` : `${diff}`;
      return {
        title: "Ajuste de estoque",
        categoryLabel: "Estoque",
        icon: "layer",
        colorClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
        badgeClass: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800",
        primaryDetail: `Produto: "${prodName}"`,
        secondaryDetail: `Estoque alterado de ${oldStock} para ${newStock} (${diffText} un.)`,
        tags: [{ text: "Estoque", variant: "warning" }],
      };
    }

    if (action === "UPDATE_PRODUCT") {
      const changes: string[] = [];
      if (details.newSalePrice !== undefined && details.oldSalePrice !== undefined) {
        changes.push(`Preço: de ${currency(details.oldSalePrice)} para ${currency(details.newSalePrice)}`);
      }
      if (details.newStock !== undefined && details.oldStock !== undefined) {
        changes.push(`Estoque: de ${details.oldStock} para ${details.newStock}`);
      }
      if (details.newName && details.oldName) {
        changes.push(`Nome alterado de "${details.oldName}" para "${details.newName}"`);
      }

      return {
        title: "Produto atualizado",
        categoryLabel: "Produtos",
        icon: "pencil",
        colorClass: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
        badgeClass: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-800",
        primaryDetail: `Produto: "${prodName}"`,
        secondaryDetail: changes.length > 0 ? changes.join(" • ") : "Informações do produto foram atualizadas.",
        tags: [{ text: "Editado", variant: "info" }],
      };
    }

    if (action === "DELETE_PRODUCT") {
      return {
        title: "Produto excluído",
        categoryLabel: "Produtos",
        icon: "trash",
        colorClass: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
        badgeClass: "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 border-red-200 dark:border-red-800",
        primaryDetail: `Produto removido: "${prodName}"`,
        secondaryDetail: "O produto foi desativado do catálogo.",
        tags: [{ text: "Excluído", variant: "danger" }],
      };
    }
  }

  // 3. CLIENTES
  if (action.includes("CLIENT") || entity === "client") {
    const clientName = details.name || "Cliente";
    const phone = details.phone ? maskPhone(details.phone) : "";
    const email = details.email || "";

    if (action === "CREATE_CLIENT") {
      return {
        title: "Novo cliente cadastrado",
        categoryLabel: "Clientes",
        icon: "user-plus",
        colorClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
        badgeClass: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
        primaryDetail: `Cliente: "${clientName}"`,
        secondaryDetail: [phone, email].filter(Boolean).join(" • ") || undefined,
        tags: [{ text: "Novo", variant: "success" }],
      };
    }

    if (action === "UPDATE_CLIENT") {
      return {
        title: "Dados do cliente atualizados",
        categoryLabel: "Clientes",
        icon: "user-check",
        colorClass: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
        badgeClass: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-800",
        primaryDetail: `Cliente: "${clientName}"`,
        secondaryDetail: [phone, email].filter(Boolean).join(" • ") || "Informações de contato ou endereço foram alteradas.",
        tags: [{ text: "Atualizado", variant: "info" }],
      };
    }

    if (action === "DELETE_CLIENT") {
      return {
        title: "Cliente removido",
        categoryLabel: "Clientes",
        icon: "user-x",
        colorClass: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
        badgeClass: "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 border-red-200 dark:border-red-800",
        primaryDetail: `Cliente: "${clientName}"`,
        secondaryDetail: "O cadastro do cliente foi desativado.",
        tags: [{ text: "Removido", variant: "danger" }],
      };
    }
  }

  // 4. USUÁRIOS
  if (action.includes("USER") || entity === "user") {
    const userName = details.name || "Usuário";
    const groupName = details.groupName || "";

    if (action === "CREATE_USER") {
      return {
        title: "Novo colaborador cadastrado",
        categoryLabel: "Equipe",
        icon: "user-plus",
        colorClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
        badgeClass: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
        primaryDetail: `Colaborador: "${userName}"`,
        secondaryDetail: details.email ? `E-mail: ${details.email}${groupName ? ` • Grupo: ${groupName}` : ""}` : undefined,
        tags: [{ text: "Equipe", variant: "success" }],
      };
    }

    if (action === "UPDATE_USER") {
      return {
        title: "Dados do colaborador atualizados",
        categoryLabel: "Equipe",
        icon: "user-check",
        colorClass: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
        badgeClass: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-800",
        primaryDetail: `Colaborador: "${userName}"`,
        secondaryDetail: details.email ? `E-mail: ${details.email}` : "Informações do usuário foram atualizadas.",
        tags: [{ text: "Editado", variant: "info" }],
      };
    }

    if (action === "DELETE_USER") {
      return {
        title: "Colaborador removido",
        categoryLabel: "Equipe",
        icon: "user-x",
        colorClass: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
        badgeClass: "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 border-red-200 dark:border-red-800",
        primaryDetail: `Colaborador: "${userName}"`,
        secondaryDetail: details.email ? `E-mail: ${details.email}` : undefined,
        tags: [{ text: "Removido", variant: "danger" }],
      };
    }
  }

  // 5. GRUPOS DE ACESSO
  if (action.includes("ACCESS_GROUP") || entity === "accessgroup") {
    const groupName = details.name || "Grupo de Acesso";

    if (action === "CREATE_ACCESS_GROUP") {
      return {
        title: "Grupo de permissões criado",
        categoryLabel: "Permissões",
        icon: "shield-quarter",
        colorClass: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
        badgeClass: "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800",
        primaryDetail: `Grupo: "${groupName}"`,
        secondaryDetail: "Novo grupo de acesso e permissões configurado.",
        tags: [{ text: "Permissões", variant: "info" }],
      };
    }

    if (action === "UPDATE_ACCESS_GROUP") {
      return {
        title: "Grupo de permissões alterado",
        categoryLabel: "Permissões",
        icon: "shield",
        colorClass: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
        badgeClass: "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800",
        primaryDetail: `Grupo: "${groupName}"`,
        secondaryDetail: "Permissões ou regras do grupo foram alteradas.",
        tags: [{ text: "Permissões", variant: "info" }],
      };
    }

    if (action === "DELETE_ACCESS_GROUP") {
      return {
        title: "Grupo de permissões excluído",
        categoryLabel: "Permissões",
        icon: "shield-x",
        colorClass: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
        badgeClass: "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 border-red-200 dark:border-red-800",
        primaryDetail: `Grupo: "${groupName}"`,
        secondaryDetail: "O grupo de acesso foi removido do sistema.",
        tags: [{ text: "Excluído", variant: "danger" }],
      };
    }
  }

  // 6. CONFIGURAÇÕES & DADOS DA LOJA
  if (action === "UPDATE_SETTINGS" || entity === "settings") {
    return {
      title: "Configurações da loja atualizadas",
      categoryLabel: "Configurações",
      icon: "cog",
      colorClass: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20",
      badgeClass: "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200 border-zinc-200 dark:border-zinc-700",
      primaryDetail: "Preferências operacionais alteradas",
      secondaryDetail: "Regras de vendas, estoque ou métodos de pagamento foram salvas.",
      tags: [{ text: "Sistema", variant: "info" }],
    };
  }

  if (action === "UPDATE_STORE" || entity === "loja") {
    const storeName = details.name || "Dados da Loja";
    return {
      title: "Dados cadastrais da loja atualizados",
      categoryLabel: "Loja",
      icon: "store",
      colorClass: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
      badgeClass: "bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border-purple-200 dark:border-purple-800",
      primaryDetail: `Loja: "${storeName}"`,
      secondaryDetail: "Nome, contato ou endereço da loja foram alterados.",
      tags: [{ text: "Loja", variant: "info" }],
    };
  }

  // 7. FALLBACK ELEGANTE (Sem jargões técnicos)
  // Converte chaves de detalhes em leitura simples
  const cleanPairs: string[] = [];
  for (const [k, v] of Object.entries(details)) {
    if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
      cleanPairs.push(`${k}: ${v}`);
    }
  }

  return {
    title: "Ação no sistema registrada",
    categoryLabel: "Geral",
    icon: "info-circle",
    colorClass: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20",
    badgeClass: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700",
    primaryDetail: cleanPairs.length > 0 ? cleanPairs.slice(0, 2).join(" • ") : "Registro operacional do sistema.",
    secondaryDetail: undefined,
    tags: [],
  };
}
