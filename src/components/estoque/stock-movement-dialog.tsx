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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LoadingButton } from "@/components/ui/loading-button";
import { useIsMobile } from "@/hooks/use-mobile";
import { productsService } from "@/services/products.service";
import { stockMovementsService } from "@/services/stock-movements.service";
import { notifyLocalSync } from "@/hooks/use-data-sync";
import type { ProductFrontend } from "@/app/(auth)/produtos/columns";

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

  const [productId, setProductId] = useState<string>("");
  const [variantId, setVariantId] = useState<string>("");
  const [type, setType] = useState<"ENTRY" | "OUT" | "ADJUSTMENT">("ENTRY");
  const [quantity, setQuantity] = useState<number>(1);
  const [notes, setNotes] = useState<string>("");

  useEffect(() => {
    if (open) {
      setLoadingProducts(true);
      productsService
        .list()
        .then((data) => {
          setProducts(data as ProductFrontend[]);
          if (initialProductId) {
            setProductId(initialProductId);
          } else if (data.length > 0) {
            setProductId((prev) => prev || data[0].id);
          }
        })
        .catch(() => {
          toast.error("Erro ao carregar lista de produtos.");
        })
        .finally(() => {
          setLoadingProducts(false);
        });
    } else {
      setVariantId("");
      setType("ENTRY");
      setQuantity(1);
      setNotes("");
    }
  }, [open, initialProductId]);

  const selectedProduct = useMemo(
    () => products.find((p) => p.id === productId),
    [products, productId]
  );

  const activeVariants = useMemo(
    () =>
      (selectedProduct?.variants ?? []).filter((v: any) => !v.deletedAt),
    [selectedProduct]
  );

  const hasVariants = activeVariants.length > 0;

  useEffect(() => {
    if (hasVariants) {
      if (!variantId || !activeVariants.some((v: any) => v.id === variantId)) {
        setVariantId(activeVariants[0]?.id || "");
      }
    } else {
      setVariantId("");
    }
  }, [hasVariants, activeVariants, variantId]);

  const selectedVariant = useMemo(
    () => activeVariants.find((v: any) => v.id === variantId),
    [activeVariants, variantId]
  );

  const currentStock = useMemo(() => {
    if (!selectedProduct) return 0;
    if (hasVariants) {
      return Number(selectedVariant?.stock ?? 0);
    }
    return Number(selectedProduct.stock ?? 0);
  }, [selectedProduct, hasVariants, selectedVariant]);

  const resultingStock = useMemo(() => {
    const qty = Number(quantity) || 0;
    if (type === "ENTRY") return currentStock + qty;
    if (type === "OUT") return currentStock - qty;
    if (type === "ADJUSTMENT") return qty;
    return currentStock;
  }, [currentStock, quantity, type]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!productId) {
      toast.error("Selecione um produto.");
      return;
    }
    if (hasVariants && !variantId) {
      toast.error("Selecione uma variação.");
      return;
    }
    if (!quantity || quantity <= 0) {
      toast.error("A quantidade deve ser maior que zero.");
      return;
    }

    setBusy(true);
    try {
      await stockMovementsService.create({
        productId,
        variantId: hasVariants ? variantId : undefined,
        type,
        quantity: Number(quantity),
        notes: notes.trim() || undefined,
      });

      toast.success(
        type === "ENTRY"
          ? "Entrada registrada com sucesso!"
          : type === "OUT"
          ? "Saída registrada com sucesso!"
          : "Ajuste de estoque salvo com sucesso!"
      );

      notifyLocalSync("products");
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Erro ao registrar movimentação.";
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  const ContentBody = (
    <div className="space-y-4 py-2">
      <div className="space-y-2">
        <Label required>Produto</Label>
        <Select
          value={productId}
          onValueChange={(val) => {
            if (val) {
              setProductId(val as string);
              setVariantId("");
            }
          }}
          disabled={loadingProducts || busy}
        >
          <SelectTrigger className="w-full h-9 rounded-md text-sm justify-between">
            <SelectValue placeholder="Selecione o produto">
              {selectedProduct ? selectedProduct.name : "Selecione o produto"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="max-h-60">
            {products.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {hasVariants && (
        <div className="space-y-2">
          <Label required>Variação</Label>
          <Select
            value={variantId}
            onValueChange={(val) => {
              if (val) setVariantId(val as string);
            }}
            disabled={busy}
          >
            <SelectTrigger className="w-full h-9 rounded-md text-sm justify-between">
              <SelectValue placeholder="Selecione a variação">
                {selectedVariant
                  ? `${selectedVariant.name} (atual: ${Number(selectedVariant.stock ?? 0)} un)`
                  : "Selecione a variação"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {activeVariants.map((v: any) => (
                <SelectItem key={v.id} value={v.id}>
                  {v.name} (atual: {Number(v.stock ?? 0)} un)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label required>Tipo de operação</Label>
          <Select
            value={type}
            onValueChange={(val) => {
              if (val) setType(val as any);
            }}
            disabled={busy}
          >
            <SelectTrigger className="w-full h-9 rounded-md text-sm justify-between">
              <SelectValue>
                {type === "ENTRY"
                  ? "Entrada (+)"
                  : type === "OUT"
                  ? "Saída (-)"
                  : "Ajuste de saldo (=)"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ENTRY">Entrada (+)</SelectItem>
              <SelectItem value="OUT">Saída (-)</SelectItem>
              <SelectItem value="ADJUSTMENT">Ajuste de saldo (=)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label required>
            {type === "ADJUSTMENT" ? "Novo saldo desejado" : "Quantidade"}
          </Label>
          <Input
            type="number"
            min={0.001}
            step="any"
            value={quantity}
            onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
            disabled={busy}
            inputMode="decimal"
            onFocus={(e) => e.target.select()}
          />
        </div>
      </div>

      {/* Box de Pré-visualização do saldo */}
      <div className="rounded-lg border bg-muted/40 p-3 space-y-1 text-sm">
        <div className="flex justify-between items-center text-muted-foreground">
          <span>Estoque atual:</span>
          <span className="font-medium text-foreground tabular-nums">
            {currentStock} un
          </span>
        </div>
        <div className="flex justify-between items-center border-t border-border/50 pt-1 font-semibold">
          <span>Estoque resultante:</span>
          <span
            className={`tabular-nums ${
              resultingStock < 0
                ? "text-rose-600 dark:text-rose-400"
                : "text-foreground"
            }`}
          >
            {resultingStock} un
          </span>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Observação</Label>
        <Textarea
          placeholder="Ex.: Entrada de fornecedor, devolução, correção de contagem..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          disabled={busy}
          maxLength={500}
          className="resize-none h-20 text-sm"
        />
      </div>
    </div>
  );

  const ActionButtons = (
    <div className="flex w-full justify-end gap-2">
      <Button
        type="button"
        variant="ghost"
        onClick={() => onOpenChange(false)}
        disabled={busy}
      >
        Cancelar
      </Button>
      <LoadingButton
        loading={busy}
        disabled={!productId || (hasVariants && !variantId) || quantity <= 0}
        onClick={handleSubmit}
      >
        Salvar movimentação
      </LoadingButton>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange} blur>
        <DrawerContent className="p-4">
          <DrawerHeader className="px-0 text-center">
            <DrawerTitle className="text-center">Nova Movimentação de Estoque</DrawerTitle>
          </DrawerHeader>
          {ContentBody}
          <div className="flex flex-col gap-2 pt-4 w-full">
            <LoadingButton
              loading={busy}
              disabled={!productId || (hasVariants && !variantId) || quantity <= 0}
              onClick={handleSubmit}
              className="h-11 w-full rounded-full font-medium"
            >
              Salvar movimentação
            </LoadingButton>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={busy}
              className="h-10 w-full rounded-full text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              Cancelar
            </Button>
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} blur>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nova Movimentação de Estoque</DialogTitle>
        </DialogHeader>

        {ContentBody}

        <DialogFooter>{ActionButtons}</DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
