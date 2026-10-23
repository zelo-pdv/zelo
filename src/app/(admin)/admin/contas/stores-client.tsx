"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { BoxIcon } from "@/components/ui/box-icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface StoreItem {
  id: string;
  name: string;
  ownerName: string;
  email: string | null;
  phone: string | null;
  document: string | null;
  active: boolean;
  createdAt: string;
  _count: {
    products: number;
    sales: number;
    users: number;
    clients: number;
  };
}

interface PaginationData {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export function StoresClient() {
  const [stores, setStores] = useState<StoreItem[]>([]);
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  // Modal de alternância de status
  const [selectedStore, setSelectedStore] = useState<StoreItem | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [toggleLoading, setToggleLoading] = useState(false);

  const fetchStores = useCallback(
    async (page = 1) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: "10",
          status: statusFilter,
        });
        if (search) params.set("search", search);

        const res = await fetch(`/api/admin/stores?${params.toString()}`);
        const data = await res.json();

        if (res.ok) {
          setStores(data.data);
          setPagination(data.pagination);
        } else {
          toast.error(data.error || "Erro ao carregar lojas.");
        }
      } catch (err) {
        console.error(err);
        toast.error("Erro de conexão ao buscar lojas.");
      } finally {
        setLoading(false);
      }
    },
    [search, statusFilter]
  );

  useEffect(() => {
    fetchStores(1);
  }, [fetchStores]);

  const handleToggleStatus = async () => {
    if (!selectedStore) return;
    setToggleLoading(true);
    try {
      const res = await fetch(`/api/admin/stores/${selectedStore.id}/toggle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: `Alteração de status realizada via interface administrativa por decisão operacional.`,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Falha ao alterar status da loja.");
        return;
      }

      toast.success(data.message || "Status da loja atualizado com sucesso.");
      setModalOpen(false);
      setSelectedStore(null);
      fetchStores(pagination.page);
    } catch (err) {
      console.error(err);
      toast.error("Erro de comunicação com o servidor.");
    } finally {
      setToggleLoading(false);
    }
  };

  const openToggleModal = (store: StoreItem) => {
    setSelectedStore(store);
    setModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Controles de Filtro e Busca */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Input
            placeholder="Buscar por nome, responsável, documento ou e-mail..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 text-base md:text-sm h-10 rounded-lg"
          />
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
            <BoxIcon name="search" className="size-4" />
          </div>
        </div>

        {/* Filtros de Status */}
        <div className="flex items-center gap-1.5 p-1 rounded-lg bg-muted/60 border border-border/50 self-start sm:self-auto">
          {[
            { id: "all", label: "Todas" },
            { id: "active", label: "Ativas" },
            { id: "inactive", label: "Inativas" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                statusFilter === tab.id
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tabela de Lojas */}
      <div className="rounded-xl border border-border/60 bg-card shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Loja & Documento</TableHead>
                <TableHead>Responsável</TableHead>
                <TableHead className="text-center">Produtos</TableHead>
                <TableHead className="text-center">Vendas</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Criada em</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                    <div className="flex items-center justify-center gap-2 text-xs">
                      <BoxIcon name="loader-alt" className="size-4 animate-spin text-primary" />
                      Carregando lojas...
                    </div>
                  </TableCell>
                </TableRow>
              ) : stores.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-muted-foreground text-xs">
                    Nenhuma loja encontrada com os filtros selecionados.
                  </TableCell>
                </TableRow>
              ) : (
                stores.map((store) => (
                  <TableRow key={store.id} className="transition-colors">
                    <TableCell className="font-medium text-foreground">
                      <div className="flex flex-col">
                        <span className="font-semibold">{store.name}</span>
                        <span className="text-[11px] text-muted-foreground">
                          {store.document || "Sem documento"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span>{store.ownerName}</span>
                        <span className="text-[11px] text-muted-foreground">
                          {store.email || store.phone || "-"}
                        </span>
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
                        <Badge
                          variant="default"
                          className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-medium"
                        >
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
                      }).format(new Date(store.createdAt))}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          render={
                            <Link href={`/admin/contas/${store.id}`} className="flex items-center">
                              <BoxIcon name="show" className="size-3.5 mr-1" />
                              Detalhes
                            </Link>
                          }
                          className="h-8 px-2.5 text-xs font-medium"
                        />
                        <Button
                          variant={store.active ? "destructive" : "default"}
                          size="sm"
                          onClick={() => openToggleModal(store)}
                          className={`h-8 px-2.5 text-xs font-medium ${
                            !store.active
                              ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                              : ""
                          }`}
                        >
                          <BoxIcon
                            name={store.active ? "block" : "check"}
                            className="size-3.5 mr-1"
                          />
                          {store.active ? "Desativar" : "Ativar"}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Paginação */}
        <div className="p-4 border-t border-border/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <div>
            Mostrando <strong>{stores.length}</strong> de{" "}
            <strong>{pagination.total}</strong> lojas cadastradas
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page <= 1 || loading}
              onClick={() => fetchStores(pagination.page - 1)}
              className="h-8 px-3 text-xs"
            >
              Anterior
            </Button>
            <span className="px-2">
              Página {pagination.page} de {pagination.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page >= pagination.totalPages || loading}
              onClick={() => fetchStores(pagination.page + 1)}
              className="h-8 px-3 text-xs"
            >
              Próxima
            </Button>
          </div>
        </div>
      </div>

      {/* Modal de Confirmação de Alteração de Status */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BoxIcon
                name={selectedStore?.active ? "error" : "check-shield"}
                className={`size-5 ${
                  selectedStore?.active ? "text-destructive" : "text-emerald-500"
                }`}
              />
              {selectedStore?.active
                ? `Desativar loja "${selectedStore?.name}"?`
                : `Ativar loja "${selectedStore?.name}"?`}
            </DialogTitle>
            <DialogDescription className="text-xs pt-2">
              {selectedStore?.active ? (
                <span className="space-y-2 block">
                  <span>
                    Atenção: Ao desativar a loja, <strong>todos os usuários vinculados</strong>{" "}
                    perderão o acesso imediatamente ao sistema.
                  </span>
                  <span className="block text-destructive font-medium">
                    Sessões ativas no PDV e catálogo serão bloqueadas em tempo real na próxima
                    requisição.
                  </span>
                </span>
              ) : (
                <span>
                  A loja será reativada e todos os operadores cadastrados poderão voltar a fazer
                  login e operar vendas normalmente.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="pt-3 gap-2">
            <Button
              variant="outline"
              onClick={() => setModalOpen(false)}
              disabled={toggleLoading}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              variant={selectedStore?.active ? "destructive" : "default"}
              onClick={handleToggleStatus}
              disabled={toggleLoading}
              className={`text-xs ${
                !selectedStore?.active
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                  : ""
              }`}
            >
              {toggleLoading ? (
                <span className="flex items-center gap-1.5">
                  <BoxIcon name="loader-alt" className="size-3.5 animate-spin" />
                  Processando...
                </span>
              ) : selectedStore?.active ? (
                "Confirmar Desativação"
              ) : (
                "Confirmar Ativação"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
