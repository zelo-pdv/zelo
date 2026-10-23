"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { BoxIcon } from "@/components/ui/box-icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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

interface BrandOption {
  id: string;
  name: string;
  logoUrl: string | null;
}

interface CategoryOption {
  id: string;
  name: string;
  icon: string | null;
}

interface GlobalProductItem {
  id: string;
  name: string;
  brandId: string;
  brand: {
    id: string;
    name: string;
    slug: string;
    logoUrl: string | null;
  };
  globalCategoryId: string | null;
  globalCategory: {
    id: string;
    name: string;
    icon: string | null;
  } | null;
  barcode: string | null;
  referenceSku: string | null;
  description: string | null;
  imageUrl: string | null;
  suggestedPrice: number | null;
  costPrice: number | null;
  active: boolean;
  createdAt: string;
}

export function GlobalProductsClient() {
  const [products, setProducts] = useState<GlobalProductItem[]>([]);
  const [brands, setBrands] = useState<BrandOption[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [search, setSearch] = useState("");
  const [brandFilter, setBrandFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Modal de Criação / Edição
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<GlobalProductItem | null>(null);
  const [name, setName] = useState("");
  const [brandId, setBrandId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [barcode, setBarcode] = useState("");
  const [referenceSku, setReferenceSku] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [suggestedPrice, setSuggestedPrice] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [active, setActive] = useState(true);
  const [saving, setSaving] = useState(false);

  // Modal de Exclusão
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<GlobalProductItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Carrega marcas e categorias
  const fetchAuxData = useCallback(async () => {
    try {
      const [resB, resC] = await Promise.all([
        fetch("/api/admin/brands?status=active"),
        fetch("/api/admin/global-categories?status=active"),
      ]);
      const jsonB = await resB.json();
      const jsonC = await resC.json();
      if (jsonB.success && Array.isArray(jsonB.data)) setBrands(jsonB.data);
      if (jsonC.success && Array.isArray(jsonC.data)) setCategories(jsonC.data);
    } catch {
      console.warn("Falha ao carregar opções auxiliares.");
    }
  }, []);

  // Busca produtos globais
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (brandFilter !== "all") params.set("brandId", brandFilter);
      if (categoryFilter !== "all") params.set("categoryId", categoryFilter);
      if (statusFilter !== "all") params.set("status", statusFilter);
      params.set("limit", "50");

      const res = await fetch(`/api/admin/global-products?${params.toString()}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setProducts(json.data);
      } else {
        toast.error(json.error || "Erro ao carregar produtos globais.");
      }
    } catch {
      toast.error("Erro de conexão ao carregar produtos.");
    } finally {
      setLoading(false);
    }
  }, [search, brandFilter, categoryFilter, statusFilter]);

  useEffect(() => {
    fetchAuxData();
  }, [fetchAuxData]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProducts();
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchProducts]);

  const handleOpenCreate = () => {
    setEditingProduct(null);
    setName("");
    setBrandId(brands.length > 0 ? brands[0].id : "");
    setCategoryId("");
    setBarcode("");
    setReferenceSku("");
    setDescription("");
    setImageUrl("");
    setSuggestedPrice("");
    setCostPrice("");
    setActive(true);
    setDialogOpen(true);
  };

  const handleOpenEdit = (product: GlobalProductItem) => {
    setEditingProduct(product);
    setName(product.name);
    setBrandId(product.brandId);
    setCategoryId(product.globalCategoryId || "");
    setBarcode(product.barcode || "");
    setReferenceSku(product.referenceSku || "");
    setDescription(product.description || "");
    setImageUrl(product.imageUrl || "");
    setSuggestedPrice(product.suggestedPrice ? String(product.suggestedPrice) : "");
    setCostPrice(product.costPrice ? String(product.costPrice) : "");
    setActive(product.active);
    setDialogOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("O nome do produto é obrigatório.");
      return;
    }
    if (!brandId) {
      toast.error("Selecione a marca oficial do produto.");
      return;
    }

    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        name: name.trim(),
        brandId,
        globalCategoryId: categoryId || null,
        barcode: barcode.trim() || null,
        referenceSku: referenceSku.trim() || null,
        description: description.trim() || null,
        imageUrl: imageUrl.trim() || null,
        suggestedPrice: suggestedPrice ? parseFloat(suggestedPrice) : null,
        costPrice: costPrice ? parseFloat(costPrice) : null,
        active,
      };

      const url = editingProduct
        ? `/api/admin/global-products/${editingProduct.id}`
        : "/api/admin/global-products";
      const method = editingProduct ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (json.success) {
        toast.success(
          editingProduct
            ? "Produto atualizado com sucesso."
            : "Produto global cadastrado com sucesso!"
        );
        setDialogOpen(false);
        fetchProducts();
      } else {
        toast.error(json.error || "Erro ao salvar produto.");
      }
    } catch {
      toast.error("Erro de conexão ao salvar produto.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProduct = async () => {
    if (!productToDelete) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/global-products/${productToDelete.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Produto global removido com sucesso.");
        setDeleteModalOpen(false);
        setProductToDelete(null);
        fetchProducts();
      } else {
        toast.error(json.error || "Erro ao remover produto.");
      }
    } catch {
      toast.error("Erro de conexão ao remover produto.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Filtros e Ação */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <div className="relative w-full sm:w-64">
            <BoxIcon
              name="search"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground size-4"
            />
            <Input
              placeholder="Buscar por nome, EAN, SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Filtro por Marca */}
          <select
            value={brandFilter}
            onChange={(e) => setBrandFilter(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="all">Todas as marcas</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>

          {/* Filtro por Categoria */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="all">Todas as categorias</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          {/* Filtro por Status */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="all">Todos os status</option>
            <option value="active">Ativos</option>
            <option value="inactive">Inativos</option>
          </select>
        </div>

        <Button onClick={handleOpenCreate} className="gap-2 shrink-0">
          <BoxIcon name="plus" className="size-4" />
          Novo Produto Global
        </Button>
      </div>

      {/* Tabela de Produtos Globais */}
      <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="w-14">Foto</TableHead>
              <TableHead>Produto</TableHead>
              <TableHead>Marca & Categoria</TableHead>
              <TableHead>SKU / Barcode</TableHead>
              <TableHead>Preço Sugerido</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                  Carregando produtos mestres...
                </TableCell>
              </TableRow>
            ) : products.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                  Nenhum produto global encontrado com os filtros selecionados.
                </TableCell>
              </TableRow>
            ) : (
              products.map((p) => (
                <TableRow key={p.id} className="hover:bg-muted/30">
                  <TableCell>
                    {p.imageUrl ? (
                      <div className="relative h-10 w-10 rounded-md overflow-hidden border bg-muted">
                        <Image
                          src={p.imageUrl}
                          alt={p.name}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      </div>
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-md border bg-muted/60 text-muted-foreground">
                        <BoxIcon name="package" className="size-5" />
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="font-semibold text-foreground text-sm">{p.name}</div>
                    {p.description && (
                      <div className="text-xs text-muted-foreground line-clamp-1 max-w-xs">
                        {p.description}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm font-medium">{p.brand?.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {p.globalCategory?.name || "Geral"}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-mono text-xs text-foreground">
                      {p.referenceSku || "—"}
                    </div>
                    {p.barcode && (
                      <div className="font-mono text-[11px] text-muted-foreground">
                        EAN: {p.barcode}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="font-semibold text-xs text-emerald-600">
                      {p.suggestedPrice
                        ? Number(p.suggestedPrice).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
                        : "—"}
                    </div>
                    {p.costPrice && (
                      <div className="text-[11px] text-muted-foreground">
                        Custo: {Number(p.costPrice).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {p.active ? (
                      <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white font-medium text-[11px]">
                        Ativo
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground border-border text-[11px]">
                        Inativo
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenEdit(p)}
                        title="Editar"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      >
                        <BoxIcon name="edit" className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setProductToDelete(p);
                          setDeleteModalOpen(true);
                        }}
                        title="Excluir"
                        className="h-8 w-8 text-destructive hover:bg-destructive/10"
                      >
                        <BoxIcon name="trash" className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Modal de Criação / Edição de Produto Global */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>
              {editingProduct ? "Editar Produto Global" : "Novo Produto Global"}
            </DialogTitle>
            <DialogDescription>
              Cadastre um item padronizado com referência, código de barras e preços sugeridos para os catálogos.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveProduct} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="gp-name">Nome do Produto *</Label>
              <Input
                id="gp-name"
                placeholder="Ex: Essencial Exclusivo Deo Parfum Masculino 100ml"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="gp-brand">Marca Oficial *</Label>
                <select
                  id="gp-brand"
                  value={brandId}
                  onChange={(e) => setBrandId(e.target.value)}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  required
                >
                  <option value="" disabled>Selecione uma marca</option>
                  {brands.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="gp-cat">Categoria Global</Label>
                <select
                  id="gp-cat"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="">Nenhuma (Geral)</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="gp-sku">Código de Referência / SKU</Label>
                <Input
                  id="gp-sku"
                  placeholder="Ex: 50412"
                  value={referenceSku}
                  onChange={(e) => setReferenceSku(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="gp-barcode">Código de Barras (EAN)</Label>
                <Input
                  id="gp-barcode"
                  placeholder="Ex: 7908132204561"
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="gp-price">Preço Sugerido (R$)</Label>
                <Input
                  id="gp-price"
                  type="number"
                  step="0.01"
                  placeholder="Ex: 239.90"
                  value={suggestedPrice}
                  onChange={(e) => setSuggestedPrice(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="gp-cost">Preço de Custo (R$)</Label>
                <Input
                  id="gp-cost"
                  type="number"
                  step="0.01"
                  placeholder="Ex: 167.90"
                  value={costPrice}
                  onChange={(e) => setCostPrice(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="gp-image">URL da Imagem Oficial</Label>
              <Input
                id="gp-image"
                placeholder="https://.../produto.png"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="gp-desc">Descrição do Produto</Label>
              <Textarea
                id="gp-desc"
                placeholder="Notas olfativas, modo de uso, composição..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label className="text-sm font-semibold">Produto Ativo</Label>
                <p className="text-xs text-muted-foreground">
                  Produtos inativos não aparecem nos catálogos nem na busca de lojistas.
                </p>
              </div>
              <Switch checked={active} onCheckedChange={setActive} />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={saving}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Salvando..." : editingProduct ? "Atualizar Produto" : "Cadastrar Produto"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal de Exclusão */}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Excluir Produto Global?</DialogTitle>
            <DialogDescription>
              Esta ação removerá o produto &quot;{productToDelete?.name}&quot; do cadastro mestre da plataforma.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteModalOpen(false)}
              disabled={deleting}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteProduct}
              disabled={deleting}
            >
              {deleting ? "Excluindo..." : "Sim, Excluir Produto"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
