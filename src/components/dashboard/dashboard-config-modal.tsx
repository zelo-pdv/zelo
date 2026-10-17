import { toast } from 'sonner';
import { useSettingsStore } from '@/store/useSettingsStore';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from '@/components/ui/drawer';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

export function DashboardConfigModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const isMobile = useIsMobile();
  const productsSettings = useSettingsStore((s) => s.products);
  const trackStock = productsSettings?.trackStock ?? true;
  const dashboard = useSettingsStore((s) => s.dashboard) ?? {
    recentSalesCount: 5,
    hideLowStockCard: false,
    hideRecentSales: false,
  };
  const setDashboardSettings = useSettingsStore((s) => s.setDashboardSettings);

  const content = (
    <div className="space-y-4 pt-4">
      {/* Ocultar seção de Estoque Baixo */}
      <div
        className={cn(
          "flex items-center justify-between rounded-xl border border-border/70 p-4 transition-opacity",
          !trackStock && "opacity-50 pointer-events-none"
        )}
      >
        <div className="space-y-0.5 pr-4">
          <Label
            id="toggle-hide-low-stock-label"
            className="text-sm font-medium"
          >
            Ocultar seção de estoque baixo
          </Label>
          <p id="toggle-hide-low-stock-desc" className="text-xs text-muted-foreground">
            {!trackStock
              ? "Controle de estoque desativado nas configurações de produtos (seção já ocultada automaticamente)."
              : "Oculta o card e a lista de produtos com estoque baixo no dashboard."}
          </p>
        </div>
        <Switch
          id="toggle-hide-low-stock"
          aria-labelledby="toggle-hide-low-stock-label"
          aria-describedby="toggle-hide-low-stock-desc"
          disabled={!trackStock}
          checked={!trackStock || dashboard.hideLowStockCard}
          onCheckedChange={async (checked) => {
            try {
              await setDashboardSettings({ hideLowStockCard: checked });
              if (checked) {
                toast.info("Seção de estoque baixo ocultada no dashboard");
              } else {
                toast.success("Seção de estoque baixo visível no dashboard");
              }
            } catch (err: any) {
              toast.error(err?.message || "Erro ao salvar configuração do dashboard.");
            }
          }}
        />
      </div>

      {/* Ocultar seção de últimas vendas */}
      <div className="flex items-center justify-between rounded-xl border border-border/70 p-4">
        <div className="space-y-0.5 pr-4">
          <Label
            id="toggle-hide-recent-sales-label"
            className="text-sm font-medium"
          >
            Ocultar seção de últimas vendas
          </Label>
          <p id="toggle-hide-recent-sales-desc" className="text-xs text-muted-foreground">
            Oculta a lista de vendas recentes no dashboard.
          </p>
        </div>
        <Switch
          id="toggle-hide-recent-sales"
          aria-labelledby="toggle-hide-recent-sales-label"
          aria-describedby="toggle-hide-recent-sales-desc"
          checked={Boolean(dashboard.hideRecentSales)}
          onCheckedChange={async (checked) => {
            try {
              await setDashboardSettings({ hideRecentSales: checked });
              if (checked) {
                toast.info("Seção de últimas vendas ocultada no dashboard");
              } else {
                toast.success("Seção de últimas vendas visível no dashboard");
              }
            } catch (err: any) {
              toast.error(err?.message || "Erro ao salvar configuração do dashboard.");
            }
          }}
        />
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={(val) => !val && onClose()} blur>
        <DrawerContent className="p-4 max-h-[85vh] overflow-y-auto">
          <DrawerHeader className="px-0 text-center">
            <DrawerTitle className="text-center">Configurações do Dashboard</DrawerTitle>
            <DrawerDescription className="text-center">Personalize a exibição do seu painel</DrawerDescription>
          </DrawerHeader>
          {content}
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
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Configurações do Dashboard</DialogTitle>
          <DialogDescription>Personalize a exibição do seu painel</DialogDescription>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
}
