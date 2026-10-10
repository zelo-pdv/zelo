import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { Product } from "@/prisma/client";
const currency = (value: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

export function VariantPicker({
  product,
  open,
  onClose,
  onSelect,
}: {
  product: Product & { variants?: any[] } | null;
  open: boolean;
  onClose: () => void;
  onSelect: (variant: any) => void;
}) {
  const isMobile = useIsMobile();

  if (!product || !product.variants || product.variants.length === 0) return null;

  const Content = (
    <ScrollArea className="flex-1 p-4">
      <div className="space-y-3">
        {product.variants.map((v) => {
          const price = v.salePrice !== null ? Number(v.salePrice) : Number(product.salePrice);
          return (
            <Button
              key={v.id}
              variant="outline"
              className="w-full h-auto flex flex-col items-start p-4 space-y-2 rounded-xl"
              onClick={() => onSelect(v)}
            >
              <div className="flex justify-between w-full">
                <span className="font-semibold text-lg">{v.name}</span>
                <span className="font-bold text-lg text-primary">{currency(price)}</span>
              </div>
              <div className="flex justify-between w-full text-sm text-muted-foreground">
                <span>{v.code ? `Código: ${v.code}` : "Sem código"}</span>
                <span>Estoque: {v.stock}</span>
              </div>
            </Button>
          );
        })}
      </div>
    </ScrollArea>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader className="text-left">
            <DrawerTitle>Selecionar Variação</DrawerTitle>
          </DrawerHeader>
          {Content}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Selecionar Variação</DialogTitle>
        </DialogHeader>
        {Content}
      </DialogContent>
    </Dialog>
  );
}
