"use client";

import { useState, useEffect, useCallback } from "react";
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

interface CategoryItem {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  active: boolean;
  createdAt: string;
}

const COMMON_ICONS = [
  { id: "category", label: "Geral" },
  { id: "spray-can", label: "Perfumaria" },
  { id: "brush", label: "Maquiagem" },
  { id: "sparkles", label: "Cuidados" },
  { id: "droplet", label: "Hidratação" },
  { id: "sun", label: "Solar / Verão" },
  { id: "heart", label: "Bem-estar" },
  { id: "smile", label: "Rosto" },
  { id: "gift", label: "Presentes" },
  { id: "star", label: "Destaques" },
];

export function CategoriesClient() {
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  // Modal Criar / Editar
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryItem | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("category");
  const [active, setActive] = useState(true);
  const [saving, setSaving] = useState(false);

  // Modal Exclusão
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<CategoryItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ status: statusFilter });
      if (search) params.set("search", search);

      const res = await fetch(`/api/admin/global-categories?${params.toString()}`);
      const data = await res.json();

      if (res.ok) {
        setCategories(data.data);
      } else {
        toast.error(data.error || "Erro ao carregar categorias.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Erro de conexão ao buscar categorias.");
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const openCreateDialog = () => {
    setEditingCategory(null);
    setName("");
    setDescription("");
    setIcon("category");
    setActive(true);
    setDialogOpen(true);
  };

  const openEditDialog = (cat: CategoryItem) => {
    setEditingCategory(cat);
    setName(cat.name);
    setDescription(cat.description || "");
    setIcon(cat.icon || "category");
    setActive(cat.active);
    setDialogOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("O nome da categoria é obrigatório.");
      return;
    }

    setSaving(true);
    try {
      const isEdit = Boolean(editingCategory);
      const url = isEdit
        ? `/api/admin/global-categories/${editingCategory!.id}`
        : "/api/admin/global-categories";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          icon: icon.trim() || "category",
          active,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Erro ao salvar categoria.");
        return;
      }

      toast.success(data.message || (isEdit ? "Categoria atualizada!" : "Categoria criada!"));
      setDialogOpen(false);
      fetchCategories();
    } catch (err) {
      console.error(err);
      toast.error("Erro de comunicação com o servidor.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!categoryToDelete) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/global-categories/${categoryToDelete.id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Erro ao excluir categoria.");
        return;
      }

      toast.success(data.message || "Categoria excluída com sucesso.");
      setDeleteModalOpen(false);
      setCategoryToDelete(null);
      fetchCategories();
    } catch (err) {
      console.error(err);
      toast.error("Erro de comunicação com o servidor.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Controles: Busca, Filtro e Botão Nova Categoria */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Input
            placeholder="Buscar categorias globais por nome..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 text-base md:text-sm h-10 rounded-lg"
          />
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
            <BoxIcon name="search" className="size-4" />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
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
            Nova Categoria
          </Button>
        </div>
      </div>

      {/* Tabela de Categorias */}
      <div className="rounded-xl border border-border/60 bg-card shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-16">Ícone</TableHead>
                <TableHead>Nome da Categoria</TableHead>
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
                      Carregando categorias...
                    </div>
                  </TableCell>
                </TableRow>
              ) : categories.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground text-xs">
                    Nenhuma categoria encontrada com os critérios informados.
                  </TableCell>
                </TableRow>
              ) : (
                categories.map((cat) => (
                  <TableRow key={cat.id}>
                    <TableCell>
                      <div className="size-10 rounded-lg border border-border/60 bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <BoxIcon name={cat.icon || "category"} className="size-5" />
                      </div>
                    </TableCell>
                    <TableCell className="font-semibold text-foreground">
                      {cat.name}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {cat.slug}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                      {cat.description || "-"}
                    </TableCell>
                    <TableCell>
                      {cat.active ? (
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
                          onClick={() => openEditDialog(cat)}
                          className="h-8 px-2.5 text-xs font-medium"
                        >
                          <BoxIcon name="edit-alt" className="size-3.5 mr-1" />
                          Editar
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setCategoryToDelete(cat);
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

      {/* Modal Criar / Editar Categoria */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleSave}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <BoxIcon name="category" className="size-5 text-primary" />
                {editingCategory ? `Editar Categoria: ${editingCategory.name}` : "Nova Categoria Global"}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Categorias padronizadas facilitam a curadoria de produtos e filtros para os lojistas.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4 text-xs">
              <div className="space-y-1.5">
                <Label htmlFor="cat-name">Nome da Categoria *</Label>
                <Input
                  id="cat-name"
                  placeholder="Ex: Perfumaria, Maquiagem, Cuidados Diários"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={saving}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="cat-description">Descrição (Opcional)</Label>
                <Textarea
                  id="cat-description"
                  placeholder="Breve descrição dos produtos pertencentes a esta categoria..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={saving}
                  rows={2}
                />
              </div>

              {/* Seletor de Ícone Boxicons */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Ícone da Categoria</Label>
                  <div className="flex items-center gap-1.5 text-primary">
                    <span className="text-[11px] text-muted-foreground">Preview:</span>
                    <BoxIcon name={icon || "category"} className="size-4" />
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5 p-2 rounded-lg border border-border/60 bg-muted/20">
                  {COMMON_ICONS.map((i) => (
                    <button
                      key={i.id}
                      type="button"
                      onClick={() => setIcon(i.id)}
                      className={`p-1.5 rounded-md flex items-center gap-1 text-[11px] transition-all ${
                        icon === i.id
                          ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                          : "bg-background text-muted-foreground hover:text-foreground border border-border/40"
                      }`}
                    >
                      <BoxIcon name={i.id} className="size-3.5" />
                      <span>{i.label}</span>
                    </button>
                  ))}
                </div>

                <Input
                  placeholder="Ou digite o nome do ícone Boxicons (ex: star, heart)"
                  value={icon}
                  onChange={(e) => setIcon(e.target.value)}
                  disabled={saving}
                  className="text-xs h-8 mt-1"
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border border-border/60 p-3 bg-muted/20">
                <div className="space-y-0.5">
                  <Label htmlFor="cat-active" className="cursor-pointer">Categoria Ativa</Label>
                  <p className="text-[11px] text-muted-foreground">
                    Categorias ativas aparecem para seleção nos catálogos e produtos.
                  </p>
                </div>
                <Switch
                  id="cat-active"
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
                disabled={saving}
                className="text-xs"
              >
                {saving ? (
                  <span className="flex items-center gap-1.5">
                    <BoxIcon name="loader-alt" className="size-3.5 animate-spin" />
                    Salvando...
                  </span>
                ) : editingCategory ? (
                  "Salvar Alterações"
                ) : (
                  "Cadastrar Categoria"
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
              Excluir categoria &ldquo;{categoryToDelete?.name}&rdquo;?
            </DialogTitle>
            <DialogDescription className="text-xs pt-2">
              Esta ação removerá a categoria global permanentemente.
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
