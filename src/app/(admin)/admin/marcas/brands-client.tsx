"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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

interface BrandItem {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  description: string | null;
  active: boolean;
  createdAt: string;
}

export function BrandsClient() {
  const [brands, setBrands] = useState<BrandItem[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  // Modal de Criação / Edição
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<BrandItem | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [active, setActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Modal de Exclusão
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [brandToDelete, setBrandToDelete] = useState<BrandItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchBrands = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ status: statusFilter });
      if (search) params.set("search", search);

      const res = await fetch(`/api/admin/brands?${params.toString()}`);
      const data = await res.json();

      if (res.ok) {
        setBrands(data.data);
      } else {
        toast.error(data.error || "Erro ao carregar marcas.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Erro de conexão ao buscar marcas.");
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    fetchBrands();
  }, [fetchBrands]);

  const openCreateDialog = () => {
    setEditingBrand(null);
    setName("");
    setDescription("");
    setLogoUrl("");
    setActive(true);
    setDialogOpen(true);
  };

  const openEditDialog = (brand: BrandItem) => {
    setEditingBrand(brand);
    setName(brand.name);
    setDescription(brand.description || "");
    setLogoUrl(brand.logoUrl || "");
    setActive(brand.active);
    setDialogOpen(true);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingLogo(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/admin/brands/upload-logo", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Falha ao enviar logotipo.");
        return;
      }

      setLogoUrl(data.url);
      toast.success("Logotipo enviado com sucesso para o Supabase Storage!");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao fazer upload do arquivo.");
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("O nome da marca é obrigatório.");
      return;
    }

    setSaving(true);
    try {
      const isEdit = Boolean(editingBrand);
      const url = isEdit
        ? `/api/admin/brands/${editingBrand!.id}`
        : "/api/admin/brands";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          logoUrl: logoUrl.trim() || null,
          active,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Erro ao salvar marca.");
        return;
      }

      toast.success(data.message || (isEdit ? "Marca atualizada!" : "Marca criada!"));
      setDialogOpen(false);
      fetchBrands();
    } catch (err) {
      console.error(err);
      toast.error("Erro de comunicação com o servidor.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!brandToDelete) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/brands/${brandToDelete.id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Erro ao excluir marca.");
        return;
      }

      toast.success(data.message || "Marca excluída com sucesso.");
      setDeleteModalOpen(false);
      setBrandToDelete(null);
      fetchBrands();
    } catch (err) {
      console.error(err);
      toast.error("Erro de comunicação com o servidor.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Barra de Ações: Busca, Filtros e Botão Criar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Input
            placeholder="Buscar marcas por nome ou descrição..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 text-base md:text-sm h-10 rounded-lg"
          />
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
            <BoxIcon name="search" className="size-4" />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Filtros de Status */}
          <div className="flex items-center gap-1 p-1 rounded-lg bg-muted/60 border border-border/50">
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

          <Button
            onClick={openCreateDialog}
            className="h-9 px-3.5 text-xs font-medium gap-1.5 rounded-lg shadow-xs"
          >
            <BoxIcon name="plus" className="size-4" />
            Nova Marca
          </Button>
        </div>
      </div>

      {/* Tabela de Marcas */}
      <div className="rounded-xl border border-border/60 bg-card shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-16">Logo</TableHead>
                <TableHead>Nome da Marca</TableHead>
                <TableHead>Identificador (Slug)</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                    <div className="flex items-center justify-center gap-2 text-xs">
                      <BoxIcon name="loader-alt" className="size-4 animate-spin text-primary" />
                      Carregando marcas...
                    </div>
                  </TableCell>
                </TableRow>
              ) : brands.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground text-xs">
                    Nenhuma marca encontrada com os critérios informados.
                  </TableCell>
                </TableRow>
              ) : (
                brands.map((brand) => (
                  <TableRow key={brand.id}>
                    <TableCell>
                      <div className="size-10 rounded-lg border border-border/60 bg-muted/30 flex items-center justify-center overflow-hidden shrink-0">
                        {brand.logoUrl ? (
                          <Image
                            src={brand.logoUrl}
                            alt={brand.name}
                            width={40}
                            height={40}
                            className="size-full object-contain p-1"
                          />
                        ) : (
                          <span className="font-bold text-xs text-muted-foreground">
                            {brand.name.slice(0, 2).toUpperCase()}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-semibold text-foreground">
                      {brand.name}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {brand.slug}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                      {brand.description || "-"}
                    </TableCell>
                    <TableCell>
                      {brand.active ? (
                        <Badge
                          variant="default"
                          className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-medium text-[10px]"
                        >
                          Ativa
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="font-medium text-[10px]">
                          Inativa
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditDialog(brand)}
                          className="h-8 px-2.5 text-xs font-medium"
                        >
                          <BoxIcon name="edit-alt" className="size-3.5 mr-1" />
                          Editar
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setBrandToDelete(brand);
                            setDeleteModalOpen(true);
                          }}
                          className="h-8 px-2.5 text-xs text-destructive hover:bg-destructive/10"
                        >
                          <BoxIcon name="trash" className="size-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Modal Criar / Editar Marca */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <form onSubmit={handleSave}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <BoxIcon name="purchase-tag" className="size-5 text-primary" />
                {editingBrand ? `Editar Marca: ${editingBrand.name}` : "Cadastrar Nova Marca"}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Marcas parceiras permitem agrupar catálogos, revistas digitais e o catálogo mestre de produtos.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4 text-xs">
              <div className="space-y-1.5">
                <Label htmlFor="brand-name">Nome da Marca *</Label>
                <Input
                  id="brand-name"
                  placeholder="Ex: Natura, O Boticário, Avon, Eudora"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={saving}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="brand-description">Descrição (Opcional)</Label>
                <Textarea
                  id="brand-description"
                  placeholder="Breve descrição institucional da marca ou segmento..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={saving}
                  rows={2}
                />
              </div>

              {/* Upload de Logotipo */}
              <div className="space-y-2">
                <Label>Logotipo da Marca</Label>
                <div className="flex items-center gap-3">
                  <div className="size-14 rounded-lg border border-border/80 bg-muted/40 flex items-center justify-center overflow-hidden shrink-0">
                    {logoUrl ? (
                      <Image
                        src={logoUrl}
                        alt="Preview"
                        width={56}
                        height={56}
                        className="size-full object-contain p-1"
                      />
                    ) : (
                      <BoxIcon name="image" className="size-6 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      accept="image/png,image/jpeg,image/webp,image/svg+xml,image/avif"
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingLogo || saving}
                      className="h-8 text-xs gap-1.5"
                    >
                      {uploadingLogo ? (
                        <>
                          <BoxIcon name="loader-alt" className="size-3.5 animate-spin" />
                          Enviando para Supabase...
                        </>
                      ) : (
                        <>
                          <BoxIcon name="upload" className="size-3.5" />
                          Upload de Imagem
                        </>
                      )}
                    </Button>
                    <p className="text-[11px] text-muted-foreground">
                      PNG, JPG, SVG ou WEBP até 5MB.
                    </p>
                  </div>
                </div>

                <div className="space-y-1 pt-1">
                  <span className="text-[11px] text-muted-foreground">Ou insira a URL direta da imagem:</span>
                  <Input
                    placeholder="https://exemplo.com/logo.png"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    disabled={saving}
                    className="text-xs h-8"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-border/60 p-3 bg-muted/20">
                <div className="space-y-0.5">
                  <Label htmlFor="brand-active" className="cursor-pointer">Marca Ativa</Label>
                  <p className="text-[11px] text-muted-foreground">
                    Marcas ativas ficam visíveis para curadoria de catálogos e produtos.
                  </p>
                </div>
                <Switch
                  id="brand-active"
                  checked={active}
                  onCheckedChange={setActive}
                  disabled={saving}
                />
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDialogOpen(false)}
                disabled={saving}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={saving || uploadingLogo}
                className="text-xs"
              >
                {saving ? (
                  <span className="flex items-center gap-1.5">
                    <BoxIcon name="loader-alt" className="size-3.5 animate-spin" />
                    Salvando...
                  </span>
                ) : editingBrand ? (
                  "Salvar Alterações"
                ) : (
                  "Cadastrar Marca"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal de Exclusão */}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <BoxIcon name="error" className="size-5" />
              Excluir marca &ldquo;{brandToDelete?.name}&rdquo;?
            </DialogTitle>
            <DialogDescription className="text-xs pt-2">
              Esta ação removerá a marca permanentemente. Se a marca já estiver vinculada a catálogos ou produtos globais, recomenda-se apenas desativá-la.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="pt-3 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteModalOpen(false)}
              disabled={deleting}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={deleting}
              className="text-xs"
            >
              {deleting ? "Excluindo..." : "Confirmar Exclusão"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
