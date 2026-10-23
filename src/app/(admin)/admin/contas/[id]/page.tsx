import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import prisma from "@/lib/prisma";
import { BoxIcon } from "@/components/ui/box-icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StoreStatusToggle } from "./store-status-toggle";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const store = await prisma.loja.findUnique({
    where: { id },
    select: { name: true },
  });
  return {
    title: store ? `${store.name} | Zelo Admin` : "Detalhes da Loja | Zelo Admin",
  };
}

export default async function AdminStoreDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const store = await prisma.loja.findUnique({
    where: { id },
    include: {
      address: true,
      owner: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          active: true,
          createdAt: true,
        },
      },
      _count: {
        select: {
          products: true,
          productVariants: true,
          sales: true,
          users: true,
          clients: true,
          categories: true,
        },
      },
    },
  });

  if (!store) {
    notFound();
  }

  const [salesAggregate, recentSales, recentAuditLogs] = await Promise.all([
    prisma.sale.aggregate({
      where: {
        lojaId: id,
        status: "PAGO",
        deletedAt: null,
      },
      _sum: {
        total: true,
      },
      _count: {
        id: true,
      },
    }),
    prisma.sale.findMany({
      where: { lojaId: id },
      take: 5,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        total: true,
        status: true,
        paymentMethod: true,
        clientName: true,
        createdAt: true,
      },
    }),
    prisma.auditLog.findMany({
      where: { lojaId: id },
      take: 5,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        action: true,
        createdAt: true,
        user: {
          select: { name: true },
        },
      },
    }),
  ]);

  const totalPaidVolume = Number(salesAggregate._sum.total || 0);
  const formattedGmv = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(totalPaidVolume);

  const mainAddress = store.address[0] || null;

  return (
    <div className="space-y-6">
      {/* Botão de Retorno */}
      <div>
        <Button
          variant="ghost"
          size="sm"
          render={
            <Link href="/admin/contas" className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground">
              <BoxIcon name="arrow-back" className="size-4" />
              Voltar para Lojas e Contas
            </Link>
          }
          className="h-8 px-2 text-xs -ml-2"
        />
      </div>

      {/* Cabeçalho da Loja */}
      <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="text-xl font-bold tracking-tight text-foreground md:text-2xl">
              {store.name}
            </h2>
            {store.active ? (
              <Badge variant="default" className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-medium">
                Loja Ativa
              </Badge>
            ) : (
              <Badge variant="destructive" className="font-medium">
                Loja Inativa
              </Badge>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span>ID: <code className="text-foreground">{store.id}</code></span>
            <span>Documento: <strong className="text-foreground">{store.document || "Não informado"}</strong></span>
            <span>
              Cadastrada em:{" "}
              <strong className="text-foreground">
                {new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" }).format(new Date(store.createdAt))}
              </strong>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <StoreStatusToggle
            storeId={store.id}
            storeName={store.name}
            isActive={store.active}
          />
        </div>
      </div>

      {/* Cards de Métricas da Loja */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border/60 bg-card p-5 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Volume Faturado</span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
              <BoxIcon name="badge-dollar" className="size-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold tracking-tight text-foreground">
              {formattedGmv}
            </span>
            <p className="text-xs text-muted-foreground mt-0.5">
              {salesAggregate._count.id} vendas quitadas
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-border/60 bg-card p-5 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Total de Vendas</span>
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
              <BoxIcon name="receipt" className="size-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold tracking-tight text-foreground">
              {store._count.sales}
            </span>
            <p className="text-xs text-muted-foreground mt-0.5">
              Operações registradas
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-border/60 bg-card p-5 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Produtos no Catálogo</span>
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-500">
              <BoxIcon name="package" className="size-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold tracking-tight text-foreground">
              {store._count.products}
            </span>
            <p className="text-xs text-muted-foreground mt-0.5">
              {store._count.productVariants} variações ativas
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-border/60 bg-card p-5 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Clientes Cadastrados</span>
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500">
              <BoxIcon name="user" className="size-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold tracking-tight text-foreground">
              {store._count.clients}
            </span>
            <p className="text-xs text-muted-foreground mt-0.5">
              {store._count.users} operadores de equipe
            </p>
          </div>
        </div>
      </div>

      {/* Grid de Informações Detalhadas */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Dados Cadastrais da Empresa */}
        <div className="rounded-xl border border-border/60 bg-card p-5 space-y-4 shadow-xs">
          <div className="flex items-center gap-2 border-b border-border/50 pb-3">
            <BoxIcon name="store" className="size-5 text-primary" />
            <h3 className="font-semibold text-sm text-foreground">Dados Cadastrais da Loja</h3>
          </div>
          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between py-1 border-b border-border/30">
              <span className="text-muted-foreground">Nome Fantasia:</span>
              <span className="font-medium text-foreground">{store.name}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border/30">
              <span className="text-muted-foreground">CNPJ / CPF:</span>
              <span className="font-medium text-foreground">{store.document || "Não informado"}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border/30">
              <span className="text-muted-foreground">E-mail Comercial:</span>
              <span className="font-medium text-foreground">{store.email || "Não informado"}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border/30">
              <span className="text-muted-foreground">Telefone / WhatsApp:</span>
              <span className="font-medium text-foreground">{store.phone || "Não informado"}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border/30">
              <span className="text-muted-foreground">Endereço Comercial:</span>
              <span className="font-medium text-foreground text-right max-w-xs">
                {mainAddress
                  ? `${mainAddress.street || ""}, ${mainAddress.number || "S/N"} - ${mainAddress.neighborhood || ""}, ${mainAddress.city || ""}/${mainAddress.state || ""}`
                  : "Sem endereço cadastrado"}
              </span>
            </div>
          </div>
        </div>

        {/* Dados do Proprietário */}
        <div className="rounded-xl border border-border/60 bg-card p-5 space-y-4 shadow-xs">
          <div className="flex items-center gap-2 border-b border-border/50 pb-3">
            <BoxIcon name="user-pin" className="size-5 text-purple-500" />
            <h3 className="font-semibold text-sm text-foreground">Proprietário da Conta</h3>
          </div>
          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between py-1 border-b border-border/30">
              <span className="text-muted-foreground">Nome do Titular:</span>
              <span className="font-medium text-foreground">{store.owner?.name || store.ownerName}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border/30">
              <span className="text-muted-foreground">E-mail de Login:</span>
              <span className="font-medium text-foreground">{store.owner?.email || "-"}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border/30">
              <span className="text-muted-foreground">Telefone:</span>
              <span className="font-medium text-foreground">{store.owner?.phone || store.phone || "-"}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border/30">
              <span className="text-muted-foreground">Status do Titular:</span>
              <span className="font-medium text-foreground">
                {store.owner?.active ? (
                  <span className="text-emerald-500 font-semibold">Ativo</span>
                ) : (
                  <span className="text-destructive font-semibold">Inativo</span>
                )}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-border/30">
              <span className="text-muted-foreground">Cadastrado em:</span>
              <span className="font-medium text-foreground">
                {store.owner?.createdAt
                  ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(new Date(store.owner.createdAt))
                  : "-"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Últimas Vendas da Loja */}
      <div className="rounded-xl border border-border/60 bg-card shadow-xs overflow-hidden">
        <div className="p-5 border-b border-border/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BoxIcon name="receipt" className="size-4 text-primary" />
            <h3 className="font-semibold text-sm text-foreground">Últimas Vendas Registradas</h3>
          </div>
          <span className="text-xs text-muted-foreground">5 registros mais recentes</span>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Data</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Forma de Pagamento</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead className="text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentSales.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-20 text-center text-xs text-muted-foreground">
                    Nenhuma venda realizada por esta loja até o momento.
                  </TableCell>
                </TableRow>
              ) : (
                recentSales.map((sale) => (
                  <TableRow key={sale.id}>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Intl.DateTimeFormat("pt-BR", {
                        dateStyle: "short",
                        timeStyle: "short",
                      }).format(new Date(sale.createdAt))}
                    </TableCell>
                    <TableCell className="text-xs font-medium text-foreground">
                      {sale.clientName || "Consumidor Final"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground capitalize">
                      {sale.paymentMethod}
                    </TableCell>
                    <TableCell className="text-xs font-semibold text-foreground">
                      {new Intl.NumberFormat("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      }).format(Number(sale.total))}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge
                        variant={sale.status === "PAGO" ? "default" : sale.status === "PENDENTE" ? "secondary" : "destructive"}
                        className="text-[10px] font-medium"
                      >
                        {sale.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Histórico Recente de Auditoria */}
      <div className="rounded-xl border border-border/60 bg-card shadow-xs overflow-hidden">
        <div className="p-5 border-b border-border/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BoxIcon name="history" className="size-4 text-purple-500" />
            <h3 className="font-semibold text-sm text-foreground">Histórico Operacional da Loja</h3>
          </div>
          <span className="text-xs text-muted-foreground">Últimas 5 ações registradas</span>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Data</TableHead>
                <TableHead>Ação</TableHead>
                <TableHead className="text-right">Operador</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentAuditLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="h-20 text-center text-xs text-muted-foreground">
                    Nenhum registro de auditoria disponível para esta loja.
                  </TableCell>
                </TableRow>
              ) : (
                recentAuditLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Intl.DateTimeFormat("pt-BR", {
                        dateStyle: "short",
                        timeStyle: "short",
                      }).format(new Date(log.createdAt))}
                    </TableCell>
                    <TableCell className="text-xs font-medium text-foreground">
                      <code className="text-primary font-mono text-[11px] bg-primary/10 px-1.5 py-0.5 rounded">
                        {log.action}
                      </code>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground text-right font-medium">
                      {log.user?.name || "Sistema"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
