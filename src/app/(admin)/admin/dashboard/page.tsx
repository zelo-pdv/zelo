import type { Metadata } from "next";
import Link from "next/link";
import prisma from "@/lib/prisma";
import { BoxIcon } from "@/components/ui/box-icon";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const metadata: Metadata = {
  title: "Dashboard Global | Zelo Admin",
  description: "Painel de controle e administração global da plataforma Zelo.",
};

export default async function AdminDashboardPage() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [
    totalStores,
    activeStores,
    newStoresLast30Days,
    totalUsers,
    totalProducts,
    totalSalesCount,
    salesAggregation,
    recentStores,
  ] = await Promise.all([
    prisma.loja.count(),
    prisma.loja.count({ where: { active: true } }),
    prisma.loja.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
    prisma.user.count(),
    prisma.product.count({ where: { deletedAt: null } }),
    prisma.sale.count({ where: { deletedAt: null } }),
    prisma.sale.aggregate({
      where: {
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
    prisma.loja.findMany({
      take: 6,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        ownerName: true,
        email: true,
        phone: true,
        active: true,
        createdAt: true,
        _count: {
          select: {
            products: true,
            sales: true,
          },
        },
      },
    }),
  ]);

  const totalGmv = Number(salesAggregation._sum.total || 0);
  const formattedGmv = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(totalGmv);

  const kpis = [
    {
      label: "Lojas na Plataforma",
      value: totalStores,
      sub: `${activeStores} ativas (${totalStores > 0 ? Math.round((activeStores / totalStores) * 100) : 0}%)`,
      icon: "store",
      color: "text-blue-500 bg-blue-500/10",
      change: `+${newStoresLast30Days} nos últimos 30 dias`,
    },
    {
      label: "Volume Transacionado (GMV)",
      value: formattedGmv,
      sub: `${salesAggregation._count.id} vendas quitadas`,
      icon: "badge-dollar",
      color: "text-emerald-500 bg-emerald-500/10",
      change: "Vendas pagas na rede",
    },
    {
      label: "Vendas Registradas",
      value: totalSalesCount,
      sub: "Em todas as lojas ativas",
      icon: "receipt",
      color: "text-amber-500 bg-amber-500/10",
      change: "Operações no PDV",
    },
    {
      label: "Catálogo & Usuários",
      value: totalProducts,
      sub: `${totalUsers} operadores cadastrados`,
      icon: "package",
      color: "text-purple-500 bg-purple-500/10",
      change: "Itens gerenciados",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Banner de Boas-Vindas */}
      <div className="rounded-2xl border border-border/60 bg-gradient-to-r from-primary/10 via-background to-background p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold tracking-tight text-foreground md:text-2xl">
                Visão Geral da Plataforma Zelo
              </h2>
              <span className="rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-semibold text-xs px-2.5 py-0.5">
                Plataforma Ativa
              </span>
            </div>
            <p className="text-sm text-muted-foreground max-w-2xl">
              Acompanhamento central de volumetria, faturamento global das lojas e administração
              do ecossistema multi-tenant.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/admin/contas"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-primary text-primary-foreground font-medium text-xs hover:bg-primary/90 transition-all shadow-xs"
            >
              <BoxIcon name="store" className="size-4" />
              Gerenciar Lojas
            </Link>
          </div>
        </div>
      </div>

      {/* Grid de KPIs Principais */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className="rounded-xl border border-border/60 bg-card p-5 shadow-xs transition-all hover:border-border"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                {kpi.label}
              </span>
              <div className={`p-2 rounded-lg ${kpi.color}`}>
                <BoxIcon name={kpi.icon} className="size-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-bold tracking-tight text-foreground">
                {kpi.value}
              </span>
              <p className="text-xs text-muted-foreground mt-0.5">{kpi.sub}</p>
            </div>
            <div className="mt-3 pt-3 border-t border-border/40 text-[11px] text-muted-foreground flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              {kpi.change}
            </div>
          </div>
        ))}
      </div>

      {/* Seção de Lojas Recentes */}
      <div className="rounded-xl border border-border/60 bg-card shadow-xs overflow-hidden">
        <div className="p-5 border-b border-border/60 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-base text-foreground">
              Lojas Cadastradas Recentemente
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Últimas contas criadas na plataforma e status de operação
            </p>
          </div>
          <Link
            href="/admin/contas"
            className="text-xs font-medium text-primary hover:underline inline-flex items-center gap-1"
          >
            Ver todas as lojas ({totalStores}) →
          </Link>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Loja</TableHead>
                <TableHead>Responsável</TableHead>
                <TableHead className="text-center">Produtos</TableHead>
                <TableHead className="text-center">Vendas</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Data de Cadastro</TableHead>
                <TableHead className="text-right">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentStores.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground text-xs">
                    Nenhuma loja cadastrada até o momento.
                  </TableCell>
                </TableRow>
              ) : (
                recentStores.map((store) => (
                  <TableRow key={store.id} className="transition-colors">
                    <TableCell className="font-medium text-foreground">
                      <div className="flex flex-col">
                        <span className="font-semibold">{store.name}</span>
                        <span className="text-[11px] text-muted-foreground">{store.email || "Sem e-mail"}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span>{store.ownerName}</span>
                        <span className="text-[11px] text-muted-foreground">{store.phone || "-"}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center font-medium">
                      {store._count.products}
                    </TableCell>
                    <TableCell className="text-center font-medium">
                      {store._count.sales}
                    </TableCell>
                    <TableCell>
                      {store.active ? (
                        <Badge variant="default" className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-medium">
                          Ativa
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="font-medium">
                          Inativa
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Intl.DateTimeFormat("pt-BR", {
                        dateStyle: "short",
                        timeStyle: "short",
                      }).format(new Date(store.createdAt))}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link
                        href={`/admin/contas/${store.id}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-muted/60 hover:bg-muted text-xs font-medium text-foreground transition-colors"
                      >
                        Detalhes
                        <BoxIcon name="chevron-right" className="size-3" />
                      </Link>
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
