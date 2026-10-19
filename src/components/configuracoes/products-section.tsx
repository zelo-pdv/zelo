"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { BoxIcon } from "@/components/ui/box-icon";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ActionTooltip } from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { GlobalLoader } from "@/components/ui/global-loader";
import { cn } from "@/lib/utils";
import { useSettingsStore } from "@/store/useSettingsStore";
import { categoriesService } from "@/services/categories.service";
import { notifyLocalSync } from "@/hooks/use-data-sync";
import { useIsMobile } from "@/hooks/use-mobile";

type CategoryItem = {
  id: string;
  name: string;
  lowStockThreshold?: number | null;
};

export function ProductsSection() {
  const isMobile = useIsMobile();
  const [isExpanded, setIsExpanded] = useState(false);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const productsSettings = useSettingsStore((s) => s.products) ?? {
    trackStock: false,
    showProductImages: true,
  };
  const setProductsSettings = useSettingsStore((s) => s.setProductsSettings);

  const salesSettings = useSettingsStore((s) => s.sales);
  const setSalesSettings = useSettingsStore((s) => s.setSalesSettings);

  // Estados do Modal/Drawer de Categoria
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryItem | null>(null);
  const [categoryName, setCategoryName] = useState("");
  const [categoryLowStockThreshold, setCategoryLowStockThreshold] = useState("");
  const [savingCategory, setSavingCategory] = useState(false);

  // Estado de Exclusão de Categoria
  const [deletingCategory, setDeletingCategory] = useState<CategoryItem | null>(null);
  const [deletingCategoryBusy, setDeletingCategoryBusy] = useState(false);

  const fetchCategories = async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const cats = await categoriesService.list();
      setCategories((cats as CategoryItem[]) || []);
    } catch (error) {
      console.error("Erro ao carregar categorias:", error);
      toast.error("Erro ao carregar categorias.");
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories(true);
  }, []);

  const handleToggleTrackStock = async (checked: boolean) => {
    try {
      await setProductsSettings({ trackStock: checked });
      notifyLocalSync("settings");
      notifyLocalSync("products");
      if (checked) {
        toast.success("Controle de estoque ativado");
      } else {
        toast.info("Controle de estoque desativado. Dados e ações de estoque foram ocultados.");
      }
    } catch (err: any) {
      toast.error(err?.message || "Erro ao salvar configuração de estoque.");
    }
  };

  const handleToggleShowProductImages = async (checked: boolean) => {
    try {
      await setProductsSettings({ showProductImages: checked });
      notifyLocalSync("settings");
      notifyLocalSync("products");
      if (checked) {
        toast.success("Exibição de imagens ativada");
      } else {
        toast.info("Exibição de imagens desativada");
      }
    } catch (err: any) {
      toast.error(err?.message || "Erro ao salvar configuração de imagens.");
    }
  };

  const handleToggleOpenPrice = async (checked: boolean) => {
    try {
      await setSalesSettings({ openPriceEnabled: checked });
      notifyLocalSync("settings");
      if (checked) {
        toast.success("Preço aberto na venda ativado");
      } else {
        toast.info("Preço aberto na venda desativado");
      }
    } catch (err: any) {
      toast.error(err?.message || "Erro ao salvar configuração de preço aberto.");
    }
  };

  const openCategoryModal = (cat?: CategoryItem) => {
    if (cat) {
      setEditingCategory(cat);
      setCategoryName(cat.name);
      setCategoryLowStockThreshold(
        cat.lowStockThreshold !== null && cat.lowStockThreshold !== undefined
          ? String(cat.lowStockThreshold)
          : "",
      );
    } else {
      setEditingCategory(null);
      setCategoryName("");
      setCategoryLowStockThreshold("");
    }
    setIsCategoryModalOpen(true);
  };

  const handleSaveCategory = async () => {
    if (!categoryName.trim()) {
      return toast.error("O nome da categoria é obrigatório.");
    }

    setSavingCategory(true);
    try {
      const payload = {
        name: categoryName.trim(),
        lowStockThreshold: categoryLowStockThreshold.trim()
          ? Number(categoryLowStockThreshold)
          : null,
      };

      if (editingCategory) {
        await categoriesService.update(editingCategory.id, payload);
        toast.success("Categoria atualizada com sucesso!");
      } else {
        await categoriesService.create(payload);
        toast.success("Categoria criada com sucesso!");
      }

      setIsCategoryModalOpen(false);
      notifyLocalSync("categories");
      fetchCategories();
    } catch (error: any) {
      toast.error(error?.message || "Erro ao salvar categoria.");
    } finally {
      setSavingCategory(false);
    }
  };

  const handleConfirmDeleteCategory = async () => {
    if (!deletingCategory) return;
    setDeletingCategoryBusy(true);
    try {
      await categoriesService.delete(deletingCategory.id);
      toast.success(`Categoria "${deletingCategory.name}" removida.`);
      setDeletingCategory(null);
      notifyLocalSync("categories");
      fetchCategories();
    } catch (error: any) {
      toast.error(error?.message || "Erro ao remover categoria.");
    } finally {
      setDeletingCategoryBusy(false);
    }
  };

  const categoryFormFields = (
    <div className="py-2 space-y-4">
      <div className="space-y-2">
        <Label required>Nome da Categoria</Label>
        <Input
          className="border-primary/50 focus:ring-primary/50 bg-primary/3"
          value={categoryName}
          onChange={(e) => setCategoryName(e.target.value)}
          placeholder="Ex: Bebidas"
        />
      </div>
      <div className="space-y-2">
        <Label>Estoque Mínimo Padrão</Label>
        <Input
          type="number"
          min="0"
          className="border-primary/50 focus:ring-primary/50 bg-primary/3"
          value={categoryLowStockThreshold}
          onChange={(e) => setCategoryLowStockThreshold(e.target.value)}
          placeholder="Ex: 10"
        />
        <p className="text-xs text-muted-foreground">
          Define o nível de estoque baixo específico para produtos desta categoria.
        </p>
      </div>
    </div>
  );

  return (
    <Card className="mb-4">
      <CardHeader className="py-4">
        <button
          type="button"
          onClick={() => setIsExpanded((prev) => !prev)}
          className="flex w-full items-center justify-between text-left cursor-pointer group hover:opacity-80 transition-opacity"
          aria-expanded={isExpanded}
        >
          <div className="flex items-center gap-2 flex-wrap">
            <CardTitle className="text-base font-semibold">
              Configurações de Produtos
            </CardTitle>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground group-hover:text-foreground shrink-0 ml-2">
            <BoxIcon
              name="chevron-down"
              className={cn(
                "text-base transition-transform duration-200",
                isExpanded && "rotate-180",
              )}
            />
          </div>
        </button>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-4 pt-0 animate-in fade-in-50 duration-150">
          {/* 1. Controlar Estoque de Produtos */}
          <div className="flex items-center justify-between rounded-xl border border-border/70 p-4">
            <div className="space-y-0.5 pr-4">
              <Label
                id="toggle-track-stock-label"
                className="text-sm font-medium"
              >
                Controlar estoque de produtos
              </Label>
              <p
                id="toggle-track-stock-desc"
                className="text-xs text-muted-foreground"
              >
                Ativa o controle e rastreamento de estoque. Ao desativar, oculta o
                estoque atual e mínimo, entradas de mercadoria e alertas em todo o
                sistema.
              </p>
            </div>
            <Switch
              id="toggle-track-stock"
              aria-labelledby="toggle-track-stock-label"
              aria-describedby="toggle-track-stock-desc"
              checked={productsSettings.trackStock ?? false}
              onCheckedChange={handleToggleTrackStock}
            />
          </div>

          {/* 2. Exibir Imagens dos Produtos */}
          <div className="flex items-center justify-between rounded-xl border border-border/70 p-4">
            <div className="space-y-0.5 pr-4">
              <Label
                id="toggle-show-product-images-label"
                className="text-sm font-medium"
              >
                Exibir imagens dos produtos
              </Label>
              <p
                id="toggle-show-product-images-desc"
                className="text-xs text-muted-foreground"
              >
                Exibe ou oculta as imagens e miniaturas de produtos na listagem de
                produtos, tela de vendas e demais páginas.
              </p>
            </div>
            <Switch
              id="toggle-show-product-images"
              aria-labelledby="toggle-show-product-images-label"
              aria-describedby="toggle-show-product-images-desc"
              checked={productsSettings.showProductImages ?? true}
              onCheckedChange={handleToggleShowProductImages}
            />
          </div>

          {/* 3. Preço Aberto na Venda */}
          <div className="flex items-center justify-between rounded-xl border border-border/70 p-4">
            <div className="space-y-0.5 pr-4">
              <Label
                id="toggle-open-price-prod-label"
                className="text-sm font-medium"
              >
                Permitir alteração de preço na venda (Preço Aberto)
              </Label>
              <p
                id="toggle-open-price-prod-desc"
                className="text-xs text-muted-foreground"
              >
                Permite editar o valor unitário do produto na primeira etapa da
                venda (no carrinho), sem alterar o preço cadastrado no produto.
              </p>
            </div>
            <Switch
              id="toggle-open-price-prod"
              aria-labelledby="toggle-open-price-prod-label"
              aria-describedby="toggle-open-price-prod-desc"
              checked={salesSettings?.openPriceEnabled ?? false}
              onCheckedChange={handleToggleOpenPrice}
            />
          </div>

          {/* 4. Categorias */}
          <div className="rounded-xl border border-border/70 p-4 flex flex-col space-y-4">
            <div className="flex justify-between items-center shrink-0">
              <div className="space-y-0.5">
                <h4 className="text-sm font-semibold">Categorias de Produtos</h4>
                <p className="text-xs text-muted-foreground">
                  Gerencie categorias e configure níveis de estoque mínimo específicos.
                </p>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => openCategoryModal()}
                className="rounded-full gap-1.5 cursor-pointer text-xs"
              >
                <BoxIcon name="plus" className="text-sm" />
                <span>Nova Categoria</span>
              </Button>
            </div>

            {loading ? (
              <div className="py-6 flex items-center justify-center">
                <GlobalLoader />
              </div>
            ) : categories.length === 0 ? (
              <div className="py-8 flex items-center justify-center">
                <p className="text-sm text-muted-foreground text-center">
                  Nenhuma categoria cadastrada.
                </p>
              </div>
            ) : (
              <ScrollArea className="max-h-64 pr-2">
                <ul className="space-y-2">
                  {categories.map((cat) => {
                    const isDefaultCategory =
                      cat.name.trim().toLowerCase() === "geral" ||
                      cat.name.trim().toLowerCase() === "diversos";

                    return (
                      <li
                        key={cat.id}
                        className="flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-center bg-muted/40 px-3.5 py-2.5 rounded-lg border border-border/50"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{cat.name}</span>
                          {isDefaultCategory && (
                            <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded border border-border/50">
                              Padrão
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1.5">
                            <Label className="text-[10px] uppercase text-muted-foreground whitespace-nowrap">
                              Mín:
                            </Label>
                            <Input
                              type="number"
                              className="h-7 w-16 text-xs text-center"
                              placeholder="Mín"
                              value={
                                productsSettings.categoryLowStockThresholds?.[
                                  cat.id
                                ] ?? ""
                              }
                              onChange={async (e) => {
                                const val = e.target.value;
                                const current =
                                  productsSettings.categoryLowStockThresholds || {};
                                try {
                                  if (!val) {
                                    const rest = { ...current };
                                    delete rest[cat.id];
                                    await setProductsSettings({
                                      categoryLowStockThresholds: rest,
                                    });
                                  } else {
                                    await setProductsSettings({
                                      categoryLowStockThresholds: {
                                        ...current,
                                        [cat.id]: Number(val),
                                      },
                                    });
                                  }
                                  notifyLocalSync("settings");
                                } catch (err: any) {
                                  toast.error(
                                    err?.message ||
                                      "Erro ao salvar estoque mínimo da categoria.",
                                  );
                                }
                              }}
                              title="Estoque mínimo para esta categoria"
                            />
                          </div>

                          <div className="flex items-center gap-1">
                            <ActionTooltip label="Editar categoria">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer"
                                onClick={() => openCategoryModal(cat)}
                                aria-label="Editar categoria"
                              >
                                <BoxIcon name="pencil" className="text-base" />
                              </Button>
                            </ActionTooltip>

                            <ActionTooltip
                              label={
                                isDefaultCategory
                                  ? "Categoria padrão não pode ser excluída"
                                  : "Excluir categoria"
                              }
                            >
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-destructive cursor-pointer disabled:opacity-40"
                                disabled={isDefaultCategory}
                                onClick={() => setDeletingCategory(cat)}
                                aria-label="Excluir categoria"
                              >
                                <BoxIcon name="trash" className="text-base" />
                              </Button>
                            </ActionTooltip>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </ScrollArea>
            )}
          </div>
        </CardContent>
      )}

      {/* Modal / Drawer Categoria */}
      {isMobile ? (
        <Drawer
          open={isCategoryModalOpen}
          onOpenChange={setIsCategoryModalOpen}
          blur
        >
          <DrawerContent className="p-4">
            <DrawerHeader className="px-0 text-center">
              <DrawerTitle className="text-center">
                {editingCategory ? "Editar Categoria" : "Nova Categoria"}
              </DrawerTitle>
            </DrawerHeader>

            {categoryFormFields}

            <div className="flex flex-col gap-2 w-full pt-4">
              <LoadingButton
                onClick={handleSaveCategory}
                loading={savingCategory}
                className="h-11 w-full rounded-full font-medium"
              >
                Salvar
              </LoadingButton>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsCategoryModalOpen(false)}
                className="h-10 w-full rounded-full text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                Cancelar
              </Button>
            </div>
          </DrawerContent>
        </Drawer>
      ) : (
        <Dialog
          open={isCategoryModalOpen}
          onOpenChange={setIsCategoryModalOpen}
          blur
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingCategory ? "Editar Categoria" : "Nova Categoria"}
              </DialogTitle>
            </DialogHeader>

            {categoryFormFields}

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsCategoryModalOpen(false)}
              >
                Cancelar
              </Button>
              <LoadingButton
                onClick={handleSaveCategory}
                loading={savingCategory}
              >
                Salvar
              </LoadingButton>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Confirmação de Exclusão de Categoria */}
      <AlertDialog
        open={!!deletingCategory}
        onOpenChange={(open) => !open && setDeletingCategory(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover categoria?</AlertDialogTitle>
            <AlertDialogDescription>
              A categoria &quot;{deletingCategory?.name}&quot; será removida. Os
              produtos associados a ela permanecerão no sistema sem categoria.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingCategoryBusy}>
              Cancelar
            </AlertDialogCancel>
            <LoadingButton
              loading={deletingCategoryBusy}
              onClick={handleConfirmDeleteCategory}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover
            </LoadingButton>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
