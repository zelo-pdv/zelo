"use client";

import { useEffect, useState, useMemo } from "react";
import { toast } from "sonner";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Combobox } from "@/components/ui/combobox";
import { LoadingButton } from "@/components/ui/loading-button";
import { BoxIcon } from "@/components/ui/box-icon";
import { useIsMobile } from "@/hooks/use-mobile";
import { productsService } from "@/services/products.service";
import { stockMovementsService } from "@/services/stock-movements.service";
import { notifyLocalSync } from "@/hooks/use-data-sync";
import type { ProductFrontend } from "@/app/(auth)/produtos/columns";

type AddedProductItem = {
  id: string;
  productId: string;
  productName: string;
  variantId?: string | null;
  variantName?: string | null;
  type: "ENTRY" | "OUT" | "ADJUSTMENT";
  quantity: number;
  currentStock: number;
  resultingStock: number;
};

type StockMovementDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  initialProductId?: string;
};

export function StockMovementDialog({
  open,
  onOpenChange,
  onSuccess,
  initialProductId,
}: StockMovementDialogProps) {
  const isMobile = useIsMobile();
  const [products, setProducts] = useState<ProductFrontend[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [busy, setBusy] = useState(false);

  // Título e Observações gerais da movimentação
  const [title, setTitle] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  // Estado do Card de Seleção Atual
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [selectedVariantId, setSelectedVariantId] = useState<string>("");
  const [selectedType, setSelectedType] = useState<
    "ENTRY" | "OUT" | "ADJUSTMENT"
  >("ENTRY");
  const [selectedQuantity, setSelectedQuantity] = useState<number>(1);

  // Lista de Produtos Adicionados (que vão para baixo)
  const [addedItems, setAddedItems] = useState<AddedProductItem[]>([]);

  // Inicialização quando o modal abre
  useEffect(() => {
    if (open) {
      setLoadingProducts(true);
      productsService
        .list()
        .then((data) => {
          const prods = data as ProductFrontend[];
          setProducts(prods);

          const defaultId =
            initialProductId || (prods.length > 0 ? prods[0].id : "");
          setSelectedProductId(defaultId);

          const prod = prods.find((p) => p.id === defaultId);
          const activeVars = (prod?.variants ?? []).filter(
            (v: any) => !v.deletedAt,
          );
          setSelectedVariantId(activeVars.length > 0 ? activeVars[0].id : "");
        })
        .catch(() => {
          toast.error("Erro ao carregar lista de produtos.");
        })
        .finally(() => {
          setLoadingProducts(false);
        });

      setTitle("");
      setNotes("");
      setSelectedType("ENTRY");
      setSelectedQuantity(1);
      setAddedItems([]);
    } else {
      setTitle("");
      setNotes("");
      setAddedItems([]);
    }
  }, [open, initialProductId]);

  // Informações do produto atualmente selecionado no card
  const currentProduct = useMemo(
    () => products.find((p) => p.id === selectedProductId),
    [products, selectedProductId],
  );

  const currentActiveVariants = useMemo(
    () => (currentProduct?.variants ?? []).filter((v: any) => !v.deletedAt),
    [currentProduct],
  );

  const hasVariants = currentActiveVariants.length > 0;

  // Atualiza variação caso mude o produto
  useEffect(() => {
    if (hasVariants) {
      if (
        !selectedVariantId ||
        !currentActiveVariants.some((v: any) => v.id === selectedVariantId)
      ) {
        setSelectedVariantId(currentActiveVariants[0]?.id || "");
      }
    } else {
      setSelectedVariantId("");
    }
  }, [hasVariants, currentActiveVariants, selectedVariantId]);

  const selectedVariant = useMemo(
    () => currentActiveVariants.find((v: any) => v.id === selectedVariantId),
    [currentActiveVariants, selectedVariantId],
  );

  // Cálculo de estoque atual e resultante do card ativo
  const currentStock = useMemo(() => {
    if (!currentProduct) return 0;
    if (hasVariants) {
      return Number(selectedVariant?.stock ?? 0);
    }
    return Number(currentProduct.stock ?? 0);
  }, [currentProduct, hasVariants, selectedVariant]);

  const resultingStock = useMemo(() => {
    const qty = Number(selectedQuantity) || 0;
    if (selectedType === "ENTRY") return currentStock + qty;
    if (selectedType === "OUT") return currentStock - qty;
    if (selectedType === "ADJUSTMENT") return qty;
    return currentStock;
  }, [currentStock, selectedQuantity, selectedType]);

  const canAddCurrentProduct = useMemo(() => {
    if (!selectedProductId || !currentProduct) return false;
    if (hasVariants && !selectedVariantId) return false;
    if (!selectedQuantity || selectedQuantity <= 0) return false;
    return true;
  }, [
    selectedProductId,
    currentProduct,
    hasVariants,
    selectedVariantId,
    selectedQuantity,
  ]);

  // Adiciona o produto do card à lista abaixo
  const handleAddProductToList = () => {
    if (!canAddCurrentProduct || !currentProduct) {
      toast.error("Preencha corretamente o produto e a quantidade.");
      return;
    }

    const newItem: AddedProductItem = {
      id: Math.random().toString(36).substring(2, 9),
      productId: currentProduct.id,
      productName: currentProduct.name,
      variantId: hasVariants ? selectedVariantId : null,
      variantName: hasVariants ? selectedVariant?.name : null,
      type: selectedType,
      quantity: Number(selectedQuantity),
      currentStock,
      resultingStock,
    };

    setAddedItems((prev) => [...prev, newItem]);
    toast.success(`"${currentProduct.name}" adicionado à lista.`);

    // Sugere o próximo produto que ainda não foi adicionado
    const usedIds = new Set([...addedItems.map((i) => i.productId), currentProduct.id]);
    const nextProduct = products.find((p) => !usedIds.has(p.id)) || currentProduct;
    if (nextProduct && nextProduct.id !== currentProduct.id) {
      setSelectedProductId(nextProduct.id);
      const nextVars = (nextProduct.variants ?? []).filter((v: any) => !v.deletedAt);
      setSelectedVariantId(nextVars.length > 0 ? nextVars[0].id : "");
    }
    setSelectedQuantity(1);
  };

  const handleRemoveItemFromList = (id: string) => {
    setAddedItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!title.trim()) {
      toast.error("O título da movimentação é obrigatório.");
      return;
    }

    let finalItems = [...addedItems];

    // Se a lista estiver vazia, mas o card estiver preenchido com produto válido, adiciona automaticamente
    if (finalItems.length === 0) {
      if (canAddCurrentProduct && currentProduct) {
        finalItems = [
          {
            id: Math.random().toString(36).substring(2, 9),
            productId: currentProduct.id,
            productName: currentProduct.name,
            variantId: hasVariants ? selectedVariantId : null,
            variantName: hasVariants ? selectedVariant?.name : null,
            type: selectedType,
            quantity: Number(selectedQuantity),
            currentStock,
            resultingStock,
          },
        ];
      } else {
        toast.error("Adicione pelo menos um produto à lista para movimentar.");
        return;
      }
    }

    setBusy(true);
    try {
      if (finalItems.length === 1) {
        const item = finalItems[0];
        await stockMovementsService.create({
          title: title.trim(),
          productId: item.productId,
          variantId: item.variantId || undefined,
          type: item.type,
          quantity: item.quantity,
          notes: notes.trim() || undefined,
        });
      } else {
        await stockMovementsService.create({
          title: title.trim(),
          notes: notes.trim() || undefined,
          items: finalItems.map((item) => ({
            productId: item.productId,
            variantId: item.variantId || undefined,
            type: item.type,
            quantity: item.quantity,
          })),
        });
      }

      toast.success(
        finalItems.length === 1
          ? "Movimentação registrada com sucesso!"
          : `${finalItems.length} movimentações registradas com sucesso!`,
      );

      notifyLocalSync("products");
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      const msg =
        error instanceof Error
          ? error.message
          : "Erro ao registrar movimentação.";
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  const getTypeBadge = (type: AddedProductItem["type"]) => {
    switch (type) {
      case "ENTRY":
        return (
          <Badge
            variant="outline"
            className="border-emerald-500/40 text-emerald-700 bg-emerald-500/10 text-[11px] font-medium">
            Entrada (+)
          </Badge>
        );
      case "OUT":
        return (
          <Badge
            variant="outline"
            className="border-amber-500/40 text-amber-700 bg-amber-500/10 text-[11px] font-medium">
            Saída (-)
          </Badge>
        );
      case "ADJUSTMENT":
        return (
          <Badge
            variant="outline"
            className="border-sky-500/40 text-sky-700 bg-sky-500/10 text-[11px] font-medium">
            Ajuste (=)
          </Badge>
        );
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  const ContentBody = (
    <div className="space-y-4 py-2">
      {/* 1. Título Obrigatório da Movimentação */}
      <div className="space-y-1.5">
        <Label required className="text-xs font-semibold">
          Título da movimentação
        </Label>
        <Input
          placeholder="Ex.: Recebimento de fornecedor, Correção de contagem, Descarte..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={100}
          disabled={busy}
          className="h-10 text-base md:text-sm rounded-xl"
        />
      </div>

      {/* 2. Card Único de Seleção de Produto */}
      <div className="rounded-2xl border border-border/70 bg-card p-4 space-y-3.5 shadow-2xs">
        <div className="flex items-center justify-between border-b border-border/50 pb-2">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <BoxIcon name="package" className="text-base text-primary" />
            Adicionar Produto à Movimentação
          </span>
          {addedItems.length > 0 && (
            <span className="text-[11px] text-muted-foreground">
              {addedItems.length} na lista
            </span>
          )}
        </div>

        {/* Seletor de Produto */}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Produto</Label>
          <Combobox
            value={selectedProductId}
            onValueChange={(val) => {
              if (val) {
                setSelectedProductId(val);
                setSelectedVariantId("");
              }
            }}
            options={products.map((p) => ({
              value: p.id,
              label: p.name,
              keywords: [p.code || "", p.category?.name || ""],
            }))}
            placeholder="Selecione o produto"
            searchPlaceholder="Buscar produto..."
            emptyText="Nenhum produto encontrado"
            disabled={loadingProducts || busy}
            triggerClassName="w-full h-9 rounded-lg text-xs sm:text-sm justify-between"
          />
        </div>

        {/* Seletor de Variação (se houver) */}
        {hasVariants && (
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Variação do Produto</Label>
            <Combobox
              value={selectedVariantId}
              onValueChange={(val) => {
                if (val) setSelectedVariantId(val);
              }}
              options={currentActiveVariants.map((v: any) => ({
                value: v.id,
                label: `${v.name} (atual: ${Number(v.stock ?? 0)} un)`,
              }))}
              placeholder="Selecione a variação"
              searchPlaceholder="Buscar variação..."
              emptyText="Nenhuma variação encontrada"
              disabled={busy}
              triggerClassName="w-full h-9 rounded-lg text-xs sm:text-sm justify-between"
            />
          </div>
        )}

        {/* Tipo de Operação e Quantidade */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Tipo de operação</Label>
            <Combobox
              value={selectedType}
              onValueChange={(val) => {
                if (val) setSelectedType(val as any);
              }}
              options={[
                { value: "ENTRY", label: "Entrada (+)" },
                { value: "OUT", label: "Saída (-)" },
                { value: "ADJUSTMENT", label: "Ajuste de saldo (=)" },
              ]}
              placeholder="Selecione o tipo"
              searchPlaceholder="Buscar tipo de operação..."
              disabled={busy}
              triggerClassName="w-full h-9 rounded-lg text-xs sm:text-sm justify-between"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">
              {selectedType === "ADJUSTMENT"
                ? "Novo saldo desejado"
                : "Quantidade"}
            </Label>
            <Input
              type="number"
              min={0.001}
              step="any"
              value={selectedQuantity}
              onChange={(e) =>
                setSelectedQuantity(parseFloat(e.target.value) || 0)
              }
              disabled={busy}
              inputMode="decimal"
              onFocus={(e) => e.target.select()}
              className="h-9 text-xs sm:text-sm rounded-lg"
            />
          </div>
        </div>

        {/* Pré-visualização do Saldo deste Item */}
        <div className="flex items-center justify-between text-xs bg-muted/40 px-3 py-1.5 rounded-lg border border-border/50">
          <span className="text-muted-foreground">
            Estoque atual:{" "}
            <strong className="text-foreground">{currentStock} un</strong>
          </span>
          <span className="text-muted-foreground">
            Resultante:{" "}
            <strong
              className={
                resultingStock < 0
                  ? "text-rose-600 dark:text-rose-400 font-semibold"
                  : "text-foreground font-semibold"
              }>
              {resultingStock} un
            </strong>
          </span>
        </div>

        {/* Botão de Adicionar à Lista dentro do Card */}
        <Button
          type="button"
          onClick={handleAddProductToList}
          disabled={!canAddCurrentProduct || busy}
          className="w-full h-10 rounded-xl gap-2 text-xs sm:text-sm font-semibold cursor-pointer">
          <BoxIcon name="plus" className="text-base" />
          <span>Adicionar este produto à lista</span>
        </Button>
      </div>

      {/* 3. Lista de Produtos Adicionados (vai para baixo) */}
      <div className="space-y-2 pt-1">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <BoxIcon name="list-check" className="text-base text-primary" />
            Produtos Selecionados ({addedItems.length})
          </span>
          {addedItems.length > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setAddedItems([])}
              className="h-6 text-[11px] text-muted-foreground hover:text-rose-600 px-2 rounded-md">
              Limpar lista
            </Button>
          )}
        </div>

        {addedItems.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/80 p-5 text-center text-xs text-muted-foreground bg-muted/10 space-y-1">
            <p className="font-medium text-foreground/80">
              Nenhum produto adicionado à lista ainda.
            </p>
            <p>
              Preencha os campos no card acima e clique em{" "}
              <strong>&ldquo;Adicionar este produto à lista&rdquo;</strong>.
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-border/70 divide-y divide-border/50 bg-card overflow-hidden max-h-[30vh] overflow-y-auto">
            {addedItems.map((item, index) => (
              <div
                key={item.id}
                className="p-3 flex items-center justify-between gap-3 hover:bg-muted/30 transition-colors">
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="flex h-4.5 w-4.5 items-center justify-center rounded-full bg-primary/10 text-primary text-[10px] font-bold shrink-0">
                      {index + 1}
                    </span>
                    <span className="font-semibold text-xs sm:text-sm text-foreground truncate">
                      {item.productName}
                    </span>
                    <span className="shrink-0">{getTypeBadge(item.type)}</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground pl-6">
                    {item.variantName && (
                      <span className="text-muted-foreground">
                        Var: {item.variantName} •
                      </span>
                    )}
                    <span className="tabular-nums font-semibold text-primary">
                      {item.type === "ENTRY"
                        ? `+${item.quantity}`
                        : item.type === "OUT"
                          ? `-${item.quantity}`
                          : `${item.quantity}`}{" "}
                      un
                    </span>
                    <span className="tabular-nums">
                      (Saldo: {item.currentStock} → {item.resultingStock} un)
                    </span>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveItemFromList(item.id)}
                  disabled={busy}
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-rose-600 rounded-full shrink-0"
                  title="Remover produto da lista">
                  <BoxIcon name="trash" className="text-base" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4. Observações Gerais */}
      <div className="space-y-1.5 pt-1">
        <Label className="text-xs">Observações adicionais (opcional)</Label>
        <Textarea
          placeholder="Ex.: Fornecedor XYZ, nota fiscal nº 1234, conferência física de estoque..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          disabled={busy}
          maxLength={500}
          className="resize-none h-16 text-xs sm:text-sm rounded-lg"
        />
      </div>
    </div>
  );

  const isReadyToSubmit =
    title.trim().length > 0 &&
    (addedItems.length > 0 || (canAddCurrentProduct && Boolean(currentProduct)));

  const ActionButtons = (
    <div className="flex w-full items-center justify-end gap-2 pt-2">
      <Button
        type="button"
        variant="ghost"
        onClick={() => onOpenChange(false)}
        disabled={busy}
        className="rounded-xl h-10 px-4 text-xs sm:text-sm">
        Cancelar
      </Button>
      <LoadingButton
        loading={busy}
        disabled={!isReadyToSubmit}
        onClick={handleSubmit}
        className="rounded-xl h-10 px-6 text-xs sm:text-sm font-semibold">
        {addedItems.length > 1
          ? `Salvar ${addedItems.length} movimentações`
          : "Salvar movimentação"}
      </LoadingButton>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer
        open={open}
        onOpenChange={onOpenChange}
        blur
        preventEscapeClose={true}
        disablePointerDismissal={true}>
        <DrawerContent className="p-4 max-h-[92vh] flex flex-col">
          <DrawerHeader className="px-0 text-center shrink-0">
            <DrawerTitle className="text-center">
              Nova Movimentação de Estoque
            </DrawerTitle>
          </DrawerHeader>

          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain pr-1">
            {ContentBody}
          </div>

          <div className="shrink-0 flex flex-col gap-2 pt-3 w-full border-t border-border mt-auto">
            <LoadingButton
              loading={busy}
              disabled={!isReadyToSubmit}
              onClick={handleSubmit}
              className="h-11 w-full rounded-full font-medium">
              {addedItems.length > 1
                ? `Salvar ${addedItems.length} movimentações`
                : "Salvar movimentação"}
            </LoadingButton>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={busy}
              className="h-10 w-full rounded-full text-sm font-medium text-muted-foreground hover:text-foreground">
              Cancelar
            </Button>
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      blur
      preventEscapeClose={true}
      disablePointerDismissal={true}>
      <DialogContent className="sm:max-w-xl md:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle>Nova Movimentação de Estoque</DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto pr-1">
          {ContentBody}
        </div>

        <DialogFooter className="shrink-0">{ActionButtons}</DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
