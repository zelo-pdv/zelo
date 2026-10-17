import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useSettingsStore } from '@/store/useSettingsStore';
import { categoriesService } from '@/services/categories.service';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { LoadingButton } from '@/components/ui/loading-button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BoxIcon } from '@/components/ui/box-icon';
import { useIsMobile } from '@/hooks/use-mobile';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { GlobalLoader } from '@/components/ui/global-loader';
import { ActionTooltip } from '@/components/ui/tooltip';

export function ProductsConfigModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const isMobile = useIsMobile();
  const productsSettings = useSettingsStore((s) => s.products) ?? {
    trackStock: false,
  };
  const setProductsSettings = useSettingsStore((s) => s.setProductsSettings);
  const salesSettings = useSettingsStore((s) => s.sales);
  const setSalesSettings = useSettingsStore((s) => s.setSalesSettings);

  const [categories, setCategories] = useState<{ id: string; name: string }[]>(
    [],
  );

  const [loading, setLoading] = useState(true);

  // States for Category Modal
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<{
    id: string;
    name: string;
    lowStockThreshold?: number | null;
  } | null>(null);

  const [categoryName, setCategoryName] = useState("");
  const [categoryLowStockThreshold, setCategoryLowStockThreshold] = useState("");
  const [savingCategory, setSavingCategory] = useState(false);

  const fetchData = async (showLoading = false) => {
    if (showLoading) setLoading(true);

    try {
      const cats = await categoriesService.list();
      setCategories((cats as any[]) || []);
    } catch {
      toast.error("Erro ao carregar configurações de produtos.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchData(false);
    }
  }, [isOpen]);

  // Category Actions

  const handleSaveCategory = async () => {
    if (!categoryName.trim())
      return toast.error("O nome da categoria é obrigatório.");

    setSavingCategory(true);
    try {
      const payload = { 
        name: categoryName, 
        lowStockThreshold: categoryLowStockThreshold ? Number(categoryLowStockThreshold) : null 
      };

      if (editingCategory) {
        await categoriesService.update(editingCategory.id, payload);

        toast.success("Categoria atualizada!");
      } else {
        await categoriesService.create(payload);

        toast.success("Categoria criada!");
      }

      setIsCategoryModalOpen(false);

      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Erro ao salvar categoria.");
    } finally {
      setSavingCategory(false);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm("Tem certeza que deseja remover esta categoria?")) return;

    try {
      await categoriesService.delete(id);

      toast.success("Categoria removida.");

      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Erro ao remover categoria.");
    }
  };

  const openCategoryModal = (cat?: { id: string; name: string; lowStockThreshold?: number | null }) => {
    if (cat) {
      setEditingCategory(cat);

      setCategoryName(cat.name);
      setCategoryLowStockThreshold(cat.lowStockThreshold ? String(cat.lowStockThreshold) : "");
    } else {
      setEditingCategory(null);

      setCategoryName("");
      setCategoryLowStockThreshold("");
    }

    setIsCategoryModalOpen(true);
  };

  const content = (
    <div className="space-y-4 pt-4">
      
          {/* Parâmetros de Produtos */}
          <div className="grid grid-cols-1 gap-3 rounded-xl border border-border/70 p-4">
            {/* Toggle Controlar Estoque */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5 pr-4">
                <Label
                  id="toggle-track-stock-label"
                  className="text-sm font-medium"
                >
                  Controlar estoque de produtos
                </Label>
                <p id="toggle-track-stock-desc" className="text-xs text-muted-foreground">
                  Ativa o controle e rastreamento de estoque. Ao desativar, oculta o estoque atual e mínimo, entradas de mercadoria e alertas em todo o sistema.
                </p>
              </div>
              <Switch
                id="toggle-track-stock"
                aria-labelledby="toggle-track-stock-label"
                aria-describedby="toggle-track-stock-desc"
                checked={productsSettings.trackStock ?? false}
                onCheckedChange={async (checked) => {
                  try {
                    await setProductsSettings({ trackStock: checked });
                    if (checked) {
                      toast.success("Controle de estoque ativado");
                    } else {
                      toast.info("Controle de estoque desativado. Dados e ações de estoque foram ocultados.");
                    }
                  } catch (err: any) {
                    toast.error(err?.message || "Erro ao salvar configuração de estoque.");
                  }
                }}
              />
            </div>

            <Separator className="my-1" />

            {/* Exibir / Ocultar Imagens dos Produtos */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5 pr-4">
                <Label
                  id="toggle-show-product-images-label"
                  className="text-sm font-medium"
                >
                  Exibir imagens dos produtos
                </Label>
                <p id="toggle-show-product-images-desc" className="text-xs text-muted-foreground">
                  Exibe ou oculta as imagens e miniaturas de produtos na listagem de produtos, tela de vendas e demais páginas.
                </p>
              </div>
              <Switch
                id="toggle-show-product-images"
                aria-labelledby="toggle-show-product-images-label"
                aria-describedby="toggle-show-product-images-desc"
                checked={productsSettings.showProductImages ?? true}
                onCheckedChange={async (checked) => {
                  try {
                    await setProductsSettings({ showProductImages: checked });
                    if (checked) {
                      toast.success("Exibição de imagens ativada");
                    } else {
                      toast.info("Exibição de imagens desativada");
                    }
                  } catch (err: any) {
                    toast.error(err?.message || "Erro ao salvar configuração de imagens.");
                  }
                }}
              />
            </div>

            <Separator className="my-1" />

            {/* Preço Aberto na hora da venda */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5 pr-4">
                <Label
                  id="toggle-open-price-modal-label"
                  className="text-sm font-medium"
                >
                  Permitir alteração de preço na venda (Preço Aberto)
                </Label>
                <p id="toggle-open-price-modal-desc" className="text-xs text-muted-foreground">
                  Permite editar o valor unitário do produto na primeira etapa da venda (no carrinho), sem alterar o preço cadastrado no produto.
                </p>
              </div>
              <Switch
                id="toggle-open-price-modal"
                aria-labelledby="toggle-open-price-modal-label"
                aria-describedby="toggle-open-price-modal-desc"
                checked={salesSettings?.openPriceEnabled ?? false}
                onCheckedChange={async (checked) => {
                  try {
                    await setSalesSettings({ openPriceEnabled: checked });
                    if (checked) {
                      toast.success("Preço aberto na venda ativado");
                    } else {
                      toast.info("Preço aberto na venda desativado");
                    }
                  } catch (err: any) {
                    toast.error(err?.message || "Erro ao salvar configuração de preço aberto.");
                  }
                }}
              />
            </div>
          </div>

        {loading ? (
          <GlobalLoader />
        ) : (
          <div className="w-full">
            {/* Categorias */}
            <div className="border rounded-md p-4 flex flex-col h-100">
              <div className="flex justify-between items-center mb-4 shrink-0">
                <h3 className="font-semibold text-lg">Categorias</h3>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openCategoryModal()}
                >
                  <BoxIcon name="plus" className="mr-2 text-base" /> Nova Categoria
                </Button>
              </div>

              {categories.length === 0 ? (
                <div className="flex-1 flex items-center justify-center">
                  <p className="text-sm text-muted-foreground text-center">
                    Nenhuma categoria cadastrada.
                  </p>
                </div>
              ) : (
                <ScrollArea className="flex-1 min-h-0">
                  <ul className="space-y-2">
                    {categories.map((cat) => (
                      <li
                        key={cat.id}
                        className="flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-center bg-muted/50 px-3 py-2 rounded-md"
                      >
                        <span className="text-sm font-medium">{cat.name}</span>

                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <Label className="text-[10px] uppercase text-muted-foreground whitespace-nowrap hidden sm:block">Min.</Label>
                            <Input 
                              type="number" 
                              className="h-7 w-16 text-xs text-center" 
                              placeholder="Min"
                              value={productsSettings.categoryLowStockThresholds?.[cat.id] ?? ""}
                              onChange={async (e) => {
                                const val = e.target.value;
                                const current = productsSettings.categoryLowStockThresholds || {};
                                try {
                                  if (!val) {
                                    const rest = { ...current };
                                    delete rest[cat.id];
                                    await setProductsSettings({ categoryLowStockThresholds: rest });
                                  } else {
                                    await setProductsSettings({ categoryLowStockThresholds: { ...current, [cat.id]: Number(val) } });
                                  }
                                } catch (err: any) {
                                  toast.error(err?.message || "Erro ao salvar estoque mínimo da categoria.");
                                }
                              }}
                              title="Estoque mínimo para esta categoria"
                            />
                          </div>

                          <div className="flex gap-1">
                            <ActionTooltip label="Editar categoria">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openCategoryModal(cat)}
                                aria-label="Editar categoria"
                              >
                                <BoxIcon name="pencil" className="text-base text-muted-foreground hover:text-foreground" />
                              </Button>
                            </ActionTooltip>

                            <ActionTooltip label="Excluir categoria">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteCategory(cat.id)}
                                aria-label="Excluir categoria"
                              >
                                <BoxIcon name="trash" className="text-base text-muted-foreground hover:text-destructive" />
                              </Button>
                            </ActionTooltip>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </ScrollArea>
              )}
            </div>
          </div>
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
                  {editingCategory ? "Editar categoria" : "Nova categoria"}
                </DrawerTitle>
              </DrawerHeader>

              <div className="py-4 space-y-4">
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
                  <Label>Estoque Mínimo</Label>
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
                  {editingCategory ? "Editar categoria" : "Nova categoria"}
                </DialogTitle>
              </DialogHeader>

              <div className="py-4 space-y-4">
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
                  <Label>Estoque Mínimo</Label>
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

              <DialogFooter>
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
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={(val) => !val && onClose()} blur>
        <DrawerContent className="max-h-[85vh] p-4 flex flex-col">
          <DrawerHeader className="px-0 text-center">
            <DrawerTitle className="text-center">Configurações de Produtos</DrawerTitle>
          </DrawerHeader>
          <div className="flex-1 overflow-y-auto">
            {content}
          </div>
          <div className="pt-4 mt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="h-10 w-full rounded-full text-sm font-medium"
            >
              Fechar
            </Button>
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={(val) => !val && onClose()} blur>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configurações de Produtos</DialogTitle>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
}
