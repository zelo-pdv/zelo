"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";
import { BoxIcon } from "@/components/ui/box-icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface CurationClientProps {
  catalog: {
    id: string;
    title: string;
    cycle: string | null;
    status: string;
    pdfPath: string | null;
    brand: {
      name: string;
      logoUrl: string | null;
    };
  };
}

interface ProductVariantItem {
  id: string;
  name: string;
  size: string | null;
  colorName: string | null;
  colorCode: string | null;
}

interface CatalogProductItem {
  id: string;
  catalogId: string;
  globalProductId: string;
  pageNumber: number | null;
  regularPrice: number | null;
  promoPrice: number | null;
  promoRule: string | null;
  promoMinQuantity: number | null;
  cropUrl: string | null;
  cropBox: any;
  curationStatus: "PENDING_REVIEW" | "APPROVED" | "REJECTED" | "FLAGGED";
  curationNotes: string | null;
  globalProduct: {
    id: string;
    name: string;
    referenceSku: string | null;
    description: string | null;
    suggestedPrice: number | null;
    variants: ProductVariantItem[];
  };
}

export function CurationClient({ catalog }: CurationClientProps) {
  const [items, setItems] = useState<CatalogProductItem[]>([]);
  const [counts, setCounts] = useState({
    TOTAL: 0,
    PENDING_REVIEW: 0,
    APPROVED: 0,
    REJECTED: 0,
    FLAGGED: 0,
  });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [catalogStatus, setCatalogStatus] = useState(catalog.status);

  // Modal de edição manual do item
  const [editingItem, setEditingItem] = useState<CatalogProductItem | null>(null);
  const [editRegularPrice, setEditRegularPrice] = useState("");
  const [editPromoPrice, setEditPromoPrice] = useState("");
  const [editPromoRule, setEditPromoRule] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  // Modal de Zoom da Foto
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (search.trim()) params.set("search", search.trim());

      const res = await fetch(`/api/admin/catalogs/${catalog.id}/products?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setItems(data.items);
        setCounts(data.counts);
      } else {
        toast.error(data.error || "Erro ao carregar produtos para curadoria.");
      }
    } catch {
      toast.error("Erro de conexão ao carregar produtos.");
    } finally {
      setLoading(false);
    }
  }, [catalog.id, statusFilter, search]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleUpdateStatus = async (
    catalogProductId: string,
    newStatus: "APPROVED" | "REJECTED" | "FLAGGED"
  ) => {
    try {
      const res = await fetch(`/api/admin/catalogs/${catalog.id}/products`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          catalogProductId,
          curationStatus: newStatus,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Status atualizado para ${newStatus}.`);
        fetchItems();
      } else {
        toast.error(data.error || "Falha ao atualizar status.");
      }
    } catch {
      toast.error("Erro de conexão ao atualizar.");
    }
  };

  const handleApproveAllPending = async () => {
    if (!confirm("Deseja realmente aprovar todos os itens pendentes deste catálogo?")) return;

    try {
      const res = await fetch(`/api/admin/catalogs/${catalog.id}/products`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve_all_pending" }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
        fetchItems();
      } else {
        toast.error(data.error || "Falha ao aprovar itens.");
      }
    } catch {
      toast.error("Erro de conexão ao aprovar itens.");
    }
  };

  const handlePublishCatalog = async () => {
    if (
      !confirm(
        "Deseja publicar este catálogo? Ele ficará imediatamente disponível para as lojas do Zelo importarem."
      )
    )
      return;

    try {
      const res = await fetch(`/api/admin/catalogs/${catalog.id}/publish`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Catálogo publicado com sucesso!");
        setCatalogStatus("PUBLISHED");
      } else {
        toast.error(data.error || "Falha ao publicar catálogo.");
      }
    } catch {
      toast.error("Erro de conexão ao publicar.");
    }
  };

  const handleOpenEdit = (item: CatalogProductItem) => {
    setEditingItem(item);
    setEditRegularPrice(item.regularPrice !== null ? String(item.regularPrice) : "");
    setEditPromoPrice(item.promoPrice !== null ? String(item.promoPrice) : "");
    setEditPromoRule(item.promoRule || "");
  };

  const handleSaveEdit = async () => {
    if (!editingItem) return;
    setSavingEdit(true);

    try {
      const res = await fetch(`/api/admin/catalogs/${catalog.id}/products`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          catalogProductId: editingItem.id,
          regularPrice: editRegularPrice ? parseFloat(editRegularPrice) : null,
          promoPrice: editPromoPrice ? parseFloat(editPromoPrice) : null,
          promoRule: editPromoRule.trim() || null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Preços e regras atualizados com sucesso.");
        setEditingItem(null);
        fetchItems();
      } else {
        toast.error(data.error || "Falha ao salvar edições.");
      }
    } catch {
      toast.error("Erro ao salvar.");
    } finally {
      setSavingEdit(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "APPROVED":
        return <Badge className="bg-emerald-600 text-white">Aprovado</Badge>;
      case "FLAGGED":
        return <Badge className="bg-amber-600 text-white">Ambíguo / Revisar</Badge>;
      case "REJECTED":
        return <Badge variant="destructive">Rejeitado</Badge>;
      case "PENDING_REVIEW":
      default:
        return <Badge variant="secondary" className="bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300">Pendente</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Navegação e Cabeçalho */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Link href="/admin/catalogos" className="hover:underline flex items-center gap-1">
              <BoxIcon name="arrow-back" className="size-3.5" /> Voltar para Catálogos
            </Link>
            <span>/</span>
            <span>Curadoria de Produtos</span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold tracking-tight text-foreground md:text-2xl">
              {catalog.title}
            </h1>
            <Badge
              variant={
                catalogStatus === "PUBLISHED"
                  ? "default"
                  : catalogStatus === "CURATION"
                  ? "secondary"
                  : "outline"
              }
              className="text-xs uppercase"
            >
              {catalogStatus}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Marca: <span className="font-semibold text-foreground">{catalog.brand.name}</span>
            {catalog.cycle && <span> • Ciclo: {catalog.cycle}</span>}
          </p>
        </div>

        {/* Ações Globais */}
        <div className="flex flex-wrap items-center gap-2">
          {counts.PENDING_REVIEW > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleApproveAllPending}
              className="h-9 gap-1.5 text-xs text-emerald-600 hover:text-emerald-700"
            >
              <BoxIcon name="check-double" className="size-4" />
              Aprovar Todos Pendentes ({counts.PENDING_REVIEW})
            </Button>
          )}

          {catalogStatus !== "PUBLISHED" && (
            <Button
              variant="default"
              size="sm"
              onClick={handlePublishCatalog}
              className="h-9 gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <BoxIcon name="globe" className="size-4" />
              Publicar Catálogo
            </Button>
          )}
        </div>
      </div>

      {/* Cards de Métricas de Curadoria */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <div className="rounded-xl border border-border bg-card p-3 shadow-xs">
          <p className="text-xs font-medium text-muted-foreground">Total Extraídos</p>
          <p className="text-xl font-bold text-foreground">{counts.TOTAL}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-3 shadow-xs">
          <p className="text-xs font-medium text-sky-600 dark:text-sky-400">Pendentes</p>
          <p className="text-xl font-bold text-sky-700 dark:text-sky-300">{counts.PENDING_REVIEW}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-3 shadow-xs">
          <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Aprovados</p>
          <p className="text-xl font-bold text-emerald-700 dark:text-emerald-300">{counts.APPROVED}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-3 shadow-xs">
          <p className="text-xs font-medium text-amber-600 dark:text-amber-400">Ambíguos (Alerta)</p>
          <p className="text-xl font-bold text-amber-700 dark:text-amber-300">{counts.FLAGGED}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-3 shadow-xs">
          <p className="text-xs font-medium text-destructive">Rejeitados</p>
          <p className="text-xl font-bold text-destructive">{counts.REJECTED}</p>
        </div>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-1.5">
          <Button
            variant={statusFilter === "ALL" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("ALL")}
            className="h-8 text-xs"
          >
            Todos ({counts.TOTAL})
          </Button>
          <Button
            variant={statusFilter === "PENDING_REVIEW" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("PENDING_REVIEW")}
            className="h-8 text-xs"
          >
            Pendentes ({counts.PENDING_REVIEW})
          </Button>
          <Button
            variant={statusFilter === "FLAGGED" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("FLAGGED")}
            className="h-8 text-xs"
          >
            Com Alerta ({counts.FLAGGED})
          </Button>
          <Button
            variant={statusFilter === "APPROVED" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("APPROVED")}
            className="h-8 text-xs"
          >
            Aprovados ({counts.APPROVED})
          </Button>
          <Button
            variant={statusFilter === "REJECTED" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("REJECTED")}
            className="h-8 text-xs"
          >
            Rejeitados ({counts.REJECTED})
          </Button>
        </div>

        <div className="relative w-full md:w-64">
          <BoxIcon name="search" className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 pl-9 text-xs"
          />
        </div>
      </div>

      {/* Grid de Produtos da Curadoria */}
      {loading ? (
        <div className="flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground">
          <BoxIcon name="loader-alt" className="size-6 animate-spin text-primary" />
          <p className="text-xs">Carregando produtos para curadoria...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border py-16 text-center text-muted-foreground">
          <BoxIcon name="package" className="size-8 text-muted-foreground/50" />
          <p className="text-sm font-semibold">Nenhum produto encontrado neste filtro.</p>
          <p className="text-xs text-muted-foreground">
            Ajuste a busca ou selecione outra aba de status.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((item) => {
            const hasPromo = item.promoPrice && item.promoPrice > 0;
            return (
              <div
                key={item.id}
                className="flex flex-col justify-between overflow-hidden rounded-xl border border-border bg-card shadow-xs transition-shadow hover:shadow-md"
              >
                <div>
                  {/* Cabeçalho do Card: Foto Recortada + Badges */}
                  <div className="relative h-48 w-full bg-muted/40">
                    {item.cropUrl ? (
                      <button
                        type="button"
                        onClick={() => setPreviewImageUrl(item.cropUrl)}
                        className="relative h-full w-full cursor-zoom-in"
                        title="Clique para ampliar o recorte"
                      >
                        <Image
                          src={item.cropUrl}
                          alt={item.globalProduct.name}
                          fill
                          className="object-contain p-2"
                          unoptimized
                        />
                      </button>
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-muted-foreground/40">
                        <BoxIcon name="image" className="size-10" />
                      </div>
                    )}

                    {/* Selos Flutuantes */}
                    <div className="absolute left-2 top-2 flex flex-col gap-1">
                      {item.pageNumber && (
                        <Badge variant="outline" className="bg-background/90 text-[10px] font-mono shadow-xs">
                          Pág. {item.pageNumber}
                        </Badge>
                      )}
                      <Badge variant="outline" className="bg-background/90 text-[10px] font-mono font-bold shadow-xs">
                        #{item.globalProduct.referenceSku}
                      </Badge>
                    </div>

                    <div className="absolute right-2 top-2">
                      {getStatusBadge(item.curationStatus)}
                    </div>
                  </div>

                  {/* Detalhes do Produto */}
                  <div className="p-3.5 space-y-2.5">
                    <div>
                      <h3 className="line-clamp-2 text-sm font-semibold text-foreground leading-snug">
                        {item.globalProduct.name}
                      </h3>
                      {item.globalProduct.description && (
                        <p className="line-clamp-2 mt-1 text-xs text-muted-foreground leading-relaxed">
                          {item.globalProduct.description}
                        </p>
                      )}
                    </div>

                    {/* Preços e Promoções */}
                    <div className="rounded-lg bg-muted/40 p-2 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Preço de Tabela:</span>
                        <span className="font-semibold text-foreground">
                          {item.regularPrice ? `R$ ${item.regularPrice.toFixed(2)}` : "—"}
                        </span>
                      </div>

                      {hasPromo && (
                        <div className="flex flex-col gap-0.5 pt-1 border-t border-border/60">
                          <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 font-semibold">
                            <span>Oferta da Edição:</span>
                            <span>R$ {item.promoPrice?.toFixed(2)}</span>
                          </div>
                          {item.promoRule && (
                            <p className="text-[10px] text-muted-foreground italic leading-tight">
                              Regra: &quot;{item.promoRule}&quot;
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Variantes (Tamanhos e Cores) */}
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>Grades:</span>
                      <span className="font-medium text-foreground">
                        {item.globalProduct.variants?.length || 0} variações
                      </span>
                    </div>
                  </div>
                </div>

                {/* Barra de Ações Rápidas de Curadoria */}
                <div className="flex items-center justify-between border-t border-border/60 bg-muted/20 px-3 py-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleOpenEdit(item)}
                    className="h-8 gap-1 text-xs text-muted-foreground hover:text-foreground"
                    title="Editar preços e regras"
                  >
                    <BoxIcon name="edit" className="size-3.5" />
                    Editar
                  </Button>

                  <div className="flex items-center gap-1">
                    <Button
                      variant={item.curationStatus === "REJECTED" ? "destructive" : "ghost"}
                      size="icon"
                      onClick={() => handleUpdateStatus(item.id, "REJECTED")}
                      className="size-8 text-destructive hover:bg-destructive/10"
                      title="Rejeitar produto"
                    >
                      <BoxIcon name="x" className="size-4" />
                    </Button>
                    <Button
                      variant={item.curationStatus === "FLAGGED" ? "default" : "ghost"}
                      size="icon"
                      onClick={() => handleUpdateStatus(item.id, "FLAGGED")}
                      className="size-8 text-amber-600 hover:bg-amber-500/10"
                      title="Sinalizar para revisão detalhada"
                    >
                      <BoxIcon name="error" className="size-4" />
                    </Button>
                    <Button
                      variant={item.curationStatus === "APPROVED" ? "default" : "ghost"}
                      size="icon"
                      onClick={() => handleUpdateStatus(item.id, "APPROVED")}
                      className="size-8 text-emerald-600 hover:bg-emerald-500/10"
                      title="Aprovar produto"
                    >
                      <BoxIcon name="check" className="size-4" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Edição de Preços e Regras */}
      <Dialog open={!!editingItem} onOpenChange={(open) => !open && setEditingItem(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Preços e Regras</DialogTitle>
          </DialogHeader>

          {editingItem && (
            <div className="space-y-4 py-2">
              <div className="text-xs text-muted-foreground">
                <p className="font-semibold text-foreground">{editingItem.globalProduct.name}</p>
                <p>SKU: #{editingItem.globalProduct.referenceSku}</p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="reg-price" className="text-xs font-medium">Preço de Tabela (R$)</Label>
                <Input
                  id="reg-price"
                  type="number"
                  step="0.01"
                  value={editRegularPrice}
                  onChange={(e) => setEditRegularPrice(e.target.value)}
                  placeholder="Ex: 26.99"
                  className="text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="promo-price" className="text-xs font-medium">Preço Promocional (R$)</Label>
                <Input
                  id="promo-price"
                  type="number"
                  step="0.01"
                  value={editPromoPrice}
                  onChange={(e) => setEditPromoPrice(e.target.value)}
                  placeholder="Ex: 17.99 (ou deixe vazio se não houver promoção)"
                  className="text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="promo-rule" className="text-xs font-medium">Regra Promocional Textual</Label>
                <Input
                  id="promo-rule"
                  value={editPromoRule}
                  onChange={(e) => setEditPromoRule(e.target.value)}
                  placeholder="Ex: 3 ou + por 17,99 CADA"
                  className="text-xs"
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setEditingItem(null)} disabled={savingEdit}>
              Cancelar
            </Button>
            <Button size="sm" onClick={handleSaveEdit} disabled={savingEdit}>
              {savingEdit ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Zoom da Foto Recortada */}
      <Dialog open={!!previewImageUrl} onOpenChange={(open) => !open && setPreviewImageUrl(null)}>
        <DialogContent className="sm:max-w-lg p-3">
          {previewImageUrl && (
            <div className="relative h-96 w-full">
              <Image
                src={previewImageUrl}
                alt="Foto do produto"
                fill
                className="object-contain"
                unoptimized
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
