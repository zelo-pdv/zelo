"use client";

import { useMemo, useState } from "react";
import { BoxIcon } from "@/components/ui/box-icon";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useIsMobile } from "@/hooks/use-mobile";
import { currency } from "@/lib/format";
import { textIncludes, textEquals } from "@/lib/search";
import { ProductThumb } from "@/components/product-thumb";
import { BarcodeScanner } from "@/components/barcode-scanner";

import { cn } from "@/lib/utils";
import { useSettingsStore } from "@/store/useSettingsStore";
import { getProductTotalStock } from "@/lib/stock";

export function ProductPicker({
  open,
  onClose,
  products,
  cartItems,
  onPick,
  onQuickCreate,
}: {
  open: boolean;
  onClose: () => void;
  products: import("@/types").Product[];
  cartItems: { productId: string; quantity: number }[];
  onPick: (p: import("@/types").Product) => void;
  onQuickCreate?: (data: {
    name: string;
    salePrice: number;
    stock: number;
    barcode?: string;
  }) => Promise<void>;
}) {
  const [q, setQ] = useState("");
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [justAddedId, setJustAddedId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newStock, setNewStock] = useState("1");
  const [newBarcode, setNewBarcode] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const isMobile = useIsMobile();
  const trackStock = useSettingsStore((s) => s.products?.trackStock ?? true);
  const blockOutOfStock = useSettingsStore(
    (s) => s.sales?.blockOutOfStock ?? false,
  );
  const outOfStockWarning = useSettingsStore(
    (s) => s.notifications?.outOfStockWarning ?? true,
  );

  const handlePick = (p: import("@/types").Product) => {
    const totalStock = getProductTotalStock(p);
    const cartQty = cartItems
      .filter((i) => i.productId === p.id)
      .reduce((sum, i) => sum + i.quantity, 0);

    if (trackStock && blockOutOfStock) {
      if (totalStock <= cartQty) {
        toast.error(`Produto ${p.name} sem estoque disponível.`);
        return;
      }
    } else if (trackStock && !blockOutOfStock && outOfStockWarning) {
      if (totalStock <= cartQty) {
        toast.warning(`Aviso: Produto ${p.name} com estoque insuficiente/zerado.`, {
          id: `warn-stock-${p.id}`,
        });
      }
    }
    setJustAddedId(p.id);
    onPick(p);
    setTimeout(() => {
      setJustAddedId((current) => (current === p.id ? null : current));
    }, 800);
  };

  const handleQuickSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      toast.error("Informe o nome do produto.");
      return;
    }
    const cleanPrice = parseFloat(newPrice.replace(",", "."));
    if (isNaN(cleanPrice) || cleanPrice < 0) {
      toast.error("Informe um preço de venda válido.");
      return;
    }
    const cleanStock = parseFloat(newStock.replace(",", ".")) || 0;

    if (!onQuickCreate) return;

    setIsSaving(true);
    try {
      await onQuickCreate({
        name: newName.trim(),
        salePrice: cleanPrice,
        stock: cleanStock,
        barcode: newBarcode.trim() || undefined,
      });
      setNewName("");
      setNewPrice("");
      setNewStock("1");
      setNewBarcode("");
      setIsCreating(false);
    } catch {
      // Toast já tratado no caller
    } finally {
      setIsSaving(false);
    }
  };

  const availableProducts = useMemo(() => {
    if (trackStock && blockOutOfStock) {
      return products.filter((p) => getProductTotalStock(p) > 0);
    }
    return products;
  }, [products, trackStock, blockOutOfStock]);

  const filtered = useMemo(() => {
    const trimmed = q.trim();
    return trimmed
      ? availableProducts.filter(
        (p) =>
          textIncludes(p.name, trimmed) ||
          textIncludes(p.category, trimmed) ||
          (p.barcode ? textEquals(p.barcode, trimmed) : false),
      )
      : availableProducts;
  }, [q, availableProducts]);

  const handleScan = (barcode: string) => {
    const product = availableProducts.find((p) => p.barcode === barcode);
    if (product) {
      handlePick(product);
    } else {
      toast.error("Produto não encontrado com este código de barras.");
    }
  };

  const PickerContent = isCreating ? (
    <form onSubmit={handleQuickSubmit} className="flex min-h-0 flex-1 flex-col px-4 pb-4 overflow-hidden gap-3">
      <div className="space-y-3">
        <div className="space-y-1">
          <Label htmlFor="prod-quick-name" className="text-xs font-semibold">
            Nome do produto <span className="text-destructive">*</span>
          </Label>
          <Input
            id="prod-quick-name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Ex.: Camiseta Básica Preta G"
            className="rounded-xl text-base md:text-sm"
            autoFocus
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label htmlFor="prod-quick-price" className="text-xs font-semibold">
              Preço de Venda (R$) <span className="text-destructive">*</span>
            </Label>
            <Input
              id="prod-quick-price"
              type="text"
              inputMode="decimal"
              value={newPrice}
              onChange={(e) => setNewPrice(e.target.value)}
              placeholder="0,00"
              className="rounded-xl text-base md:text-sm"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="prod-quick-stock" className="text-xs font-semibold">
              Estoque Inicial
            </Label>
            <Input
              id="prod-quick-stock"
              type="text"
              inputMode="numeric"
              value={newStock}
              onChange={(e) => setNewStock(e.target.value)}
              placeholder="1"
              className="rounded-xl text-base md:text-sm"
            />
          </div>
        </div>

        <div className="space-y-1">
          <Label htmlFor="prod-quick-barcode" className="text-xs font-semibold">
            Código de barras (opcional)
          </Label>
          <Input
            id="prod-quick-barcode"
            value={newBarcode}
            onChange={(e) => setNewBarcode(e.target.value)}
            placeholder="789..."
            className="rounded-xl text-base md:text-sm"
          />
        </div>
      </div>

      <div className="mt-auto flex flex-col gap-2 pt-2">
        <Button
          type="submit"
          disabled={isSaving || !newName.trim() || !newPrice.trim()}
          className="h-10 w-full rounded-full font-medium"
        >
          {isSaving ? "Salvando..." : "Salvar e Adicionar"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            setIsCreating(false);
            setNewName("");
            setNewPrice("");
            setNewStock("1");
            setNewBarcode("");
          }}
          className="h-9 w-full rounded-full text-xs text-muted-foreground"
        >
          Voltar para busca
        </Button>
      </div>
    </form>
  ) : (
    <div className="flex min-h-0 flex-1 flex-col px-4 pb-4 overflow-hidden">
      <div className="flex gap-2 shrink-0 mb-3">
        <div className="relative flex-1">
          <BoxIcon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-base text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar produtos..."
            className="rounded-xl pl-9"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="shrink-0 rounded-xl sm:hidden text-foreground"
          onClick={() => setIsScannerOpen(true)}
          title="Ler código de barras"
        >
          <BoxIcon name="barcode-reader" className="text-lg text-foreground" />
        </Button>
        {onQuickCreate && (
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsCreating(true)}
            className="rounded-xl shrink-0 gap-1 px-3"
            title="Cadastrar produto rápido"
          >
            <BoxIcon name="plus" className="text-base" />
            <span className="hidden sm:inline">Novo</span>
          </Button>
        )}
      </div>
      <div className="min-h-0 flex-1">
        <ScrollArea className="h-full">
          <div className="space-y-1 pb-4">
            {filtered.map((p) => {
              const cartQty = cartItems
                .filter((i) => i.productId === p.id)
                .reduce((sum, i) => sum + i.quantity, 0);

              const hasVariants = Boolean(p.variants && p.variants.length > 0);
              const totalStock = getProductTotalStock(p);
              const isOutOfStock = trackStock && blockOutOfStock && totalStock <= cartQty;
              const isLowStock =
                trackStock && !blockOutOfStock && totalStock <= cartQty;

              const isAdded = justAddedId === p.id;

              return (
                <button
                  key={p.id}
                  onClick={() => !isOutOfStock && handlePick(p)}
                  disabled={isOutOfStock}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl border border-border/60 p-2.5 text-left transition-all",
                    isOutOfStock
                      ? "opacity-50 cursor-not-allowed bg-muted/30"
                      : "hover:border-primary/40 hover:bg-accent active:scale-[0.99]",
                    isAdded && "border-primary bg-primary/10 transition-colors duration-300"
                  )}
                >
                  <ProductThumb
                    name={p.name}
                    image={p.image}
                    className="h-10 w-10 shrink-0 rounded-lg border border-border/40 object-cover"
                  />

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-sm font-medium">{p.name}</span>
                      {hasVariants && (
                        <Badge
                          variant="secondary"
                          className="shrink-0 text-[10px] h-4 px-1 leading-none font-normal"
                        >
                          Variações
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                      <span className="font-semibold text-foreground">
                        {currency(Number(p.salePrice))}
                      </span>
                      {trackStock && (
                        <>
                          <span>•</span>
                          <span
                            className={cn(
                              isLowStock && "text-amber-500 font-medium",
                              isOutOfStock && "text-destructive font-medium",
                            )}
                          >
                            Estoque: {totalStock}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {cartQty > 0 && (
                    <Badge variant="default" className="shrink-0 h-5 px-1.5 text-xs">
                      {cartQty}
                    </Badge>
                  )}
                </button>
              );
            })}
          </div>
        </ScrollArea>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <>
        <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
          <DrawerContent className="h-[90vh]">
            <DrawerHeader className="shrink-0 px-4 text-center">
              <DrawerTitle className="text-center">
                {isCreating ? "Novo produto rápido" : "Produtos"}
              </DrawerTitle>
            </DrawerHeader>
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              {PickerContent}
              {!isCreating && (
                <div className="shrink-0 pt-3 pb-6 px-4 border-t border-border w-full flex flex-col gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={onClose}
                    className="h-10 w-full rounded-full text-sm font-medium text-muted-foreground hover:text-foreground"
                  >
                    Fechar
                  </Button>
                </div>
              )}
            </div>
          </DrawerContent>
        </Drawer>
        <BarcodeScanner
          open={isScannerOpen}
          onOpenChange={setIsScannerOpen}
          onScan={handleScan}
          continuous
        />
      </>
    );
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="sm:max-w-125 p-0 gap-0 overflow-hidden grid-rows-[auto_1fr] max-h-[85vh]">
          <DialogHeader className="flex-row items-center gap-2 p-4 pb-0 pr-10">
            <div className="flex items-center gap-2 py-2">
              <DialogTitle>
                {isCreating ? "Novo produto rápido" : "Produtos"}
              </DialogTitle>
            </div>
          </DialogHeader>
          {PickerContent}
        </DialogContent>
      </Dialog>
      <BarcodeScanner
        open={isScannerOpen}
        onOpenChange={setIsScannerOpen}
        onScan={handleScan}
        continuous
      />
    </>
  );
}
