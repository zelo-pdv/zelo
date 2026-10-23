"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { BoxIcon } from "@/components/ui/box-icon";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
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
  DrawerFooter,
} from "@/components/ui/drawer";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { currency } from "@/lib/format";
import { notifyLocalSync } from "@/hooks/use-data-sync";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  catalogsService,
  PublishedCatalog,
  CatalogDetailResponse,
} from "@/services/catalogs.service";
import { Category } from "@/prisma/client";

interface CatalogImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  onSuccess?: () => void;
}

export function CatalogImportModal({
  isOpen,
  onClose,
  categories,
  onSuccess,
}: CatalogImportModalProps) {
  const isMobile = useIsMobile();

  // Estados de navegação e carregamento
  const [step, setStep] = useState<"catalogs" | "products">("catalogs");
  const [catalogs, setCatalogs] = useState<PublishedCatalog[]>([]);
  const [loadingCatalogs, setLoadingCatalogs] = useState(false);
  const [selectedCatalog, setSelectedCatalog] = useState<PublishedCatalog | null>(null);
  const [catalogDetails, setCatalogDetails] = useState<CatalogDetailResponse | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Estados da seleção de produtos
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("auto");
  const [isImporting, setIsImporting] = useState(false);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  // Carrega lista de catálogos publicados quando modal abre
  useEffect(() => {
    if (isOpen) {
      loadCatalogs();
    } else {
      // Reset gradual ao fechar
      const timer = setTimeout(() => {
        setStep("catalogs");
        setSelectedCatalog(null);
        setCatalogDetails(null);
        setSelectedProductIds(new Set());
        setSearchQuery("");
        setSelectedCategoryId("auto");
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const loadCatalogs = async () => {
    setLoadingCatalogs(true);
    try {
      const data = await catalogsService.listPublished();
      setCatalogs(data);
    } catch (err: any) {
      toast.error(err.message || "Erro ao carregar catálogos disponíveis.");
    } finally {
      setLoadingCatalogs(false);
    }
  };

  const handleSelectCatalog = async (cat: PublishedCatalog) => {
    setSelectedCatalog(cat);
    setStep("products");
    setLoadingDetails(true);
    setSelectedProductIds(new Set());
    setSearchQuery("");

    try {
      const details = await catalogsService.getById(cat.id);
      setCatalogDetails(details);

      // Pré-seleciona todos os produtos ainda NÃO importados
      const availableIds = details.products
        .filter((p) => !p.isImported)
        .map((p) => p.globalProductId);
      setSelectedProductIds(new Set(availableIds));
    } catch (err: any) {
      toast.error(err.message || "Erro ao carregar itens do catálogo.");
      setStep("catalogs");
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleBackToCatalogs = () => {
    if (isImporting) return;
    setStep("catalogs");
    setSelectedCatalog(null);
    setCatalogDetails(null);
    setSelectedProductIds(new Set());
  };

  // Filtragem de produtos por busca
  const filteredProducts = useMemo(() => {
    if (!catalogDetails) return [];
    if (!searchQuery.trim()) return catalogDetails.products;

    const q = searchQuery.toLowerCase().trim();
    return catalogDetails.products.filter((p) => {
      const name = p.globalProduct.name.toLowerCase();
      const sku = (p.globalProduct.referenceSku || "").toLowerCase();
      return name.includes(q) || sku.includes(q);
    });
  }, [catalogDetails, searchQuery]);

  // Contadores
  const importableCount = useMemo(() => {
    return filteredProducts.filter((p) => !p.isImported).length;
  }, [filteredProducts]);

  const selectedCountInView = useMemo(() => {
    return filteredProducts.filter(
      (p) => !p.isImported && selectedProductIds.has(p.globalProductId)
    ).length;
  }, [filteredProducts, selectedProductIds]);

  const isAllSelected =
    importableCount > 0 && selectedCountInView === importableCount;

  const handleToggleSelectAll = () => {
    const next = new Set(selectedProductIds);
    if (isAllSelected) {
      for (const p of filteredProducts) {
        if (!p.isImported) next.delete(p.globalProductId);
      }
    } else {
      for (const p of filteredProducts) {
        if (!p.isImported) next.add(p.globalProductId);
      }
    }
    setSelectedProductIds(next);
  };

  const handleToggleProduct = (globalProductId: string) => {
    const next = new Set(selectedProductIds);
    if (next.has(globalProductId)) {
      next.delete(globalProductId);
    } else {
      next.add(globalProductId);
    }
    setSelectedProductIds(next);
  };

  const handleExecuteImport = async () => {
    if (!selectedCatalog || selectedProductIds.size === 0) return;

    setIsImporting(true);
    try {
      const categoryIdParam =
        selectedCategoryId === "auto" ? null : selectedCategoryId;

      const result = await catalogsService.importProducts(selectedCatalog.id, {
        globalProductIds: Array.from(selectedProductIds),
        categoryId: categoryIdParam,
        defaultStock: 0,
      });

      toast.success(result.message || "Produtos importados com sucesso!");
      notifyLocalSync("products");
      notifyLocalSync("categories");

      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Erro ao importar produtos para sua loja.");
    } finally {
      setIsImporting(false);
    }
  };

  // Renderizador do Conteúdo Principal
  const renderContent = () => {
    if (step === "catalogs") {
      return (
        <div className="space-y-4">
          <div className="rounded-xl bg-muted/40 p-3.5 text-xs text-muted-foreground border border-border/50 flex items-start gap-2.5">
            <BoxIcon name="info-circle" className="text-base text-primary shrink-0 mt-0.5" />
            <p>
              Escolha uma revista oficial abaixo. Os produtos foram extraídos
              por inteligência artificial e validados para importação rápida em lote
              com fotos, preços, referências e variações de tamanho.
            </p>
          </div>

          {loadingCatalogs ? (
            <div className="py-12 flex flex-col items-center justify-center text-muted-foreground gap-2">
              <BoxIcon name="loader-alt" className="bx-spin text-3xl text-primary" />
              <span className="text-sm">Carregando catálogos digitais...</span>
            </div>
          ) : catalogs.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <BoxIcon name="book-content" className="text-4xl mx-auto mb-2 opacity-50" />
              <p className="font-medium text-sm">Nenhum catálogo publicado no momento.</p>
              <p className="text-xs mt-1">
                Novas edições e campanhas serão disponibilizadas em breve.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {catalogs.map((cat) => (
                <div
                  key={cat.id}
                  onClick={() => handleSelectCatalog(cat)}
                  className="group relative flex flex-col justify-between p-4 rounded-xl border border-border/70 bg-card hover:border-primary/50 hover:shadow-md transition-all cursor-pointer"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                      <BoxIcon name="book-open" className="text-2xl group-hover:scale-110 transition-transform" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Badge variant="secondary" className="text-[10px] uppercase font-semibold">
                          {cat.brand.name}
                        </Badge>
                        {cat.cycle && (
                          <span className="text-[11px] text-muted-foreground font-medium">
                            {cat.cycle}
                          </span>
                        )}
                      </div>
                      <h4 className="font-semibold text-sm text-foreground mt-1 line-clamp-1 group-hover:text-primary transition-colors">
                        {cat.title}
                      </h4>
                      {cat.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                          {cat.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-border/40 mt-4 pt-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1 font-medium text-foreground">
                      <BoxIcon name="check-circle" className="text-emerald-500 text-sm" />
                      {cat.approvedProductsCount} produtos disponíveis
                    </span>
                    <span className="text-primary font-medium flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                      Navegar
                      <BoxIcon name="chevron-right" className="text-sm" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    // Passo 2: Produtos do catálogo selecionado
    return (
      <div className="space-y-4">
        {/* Barra superior com Voltar, Busca e Filtro de Categoria */}
        <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleBackToCatalogs}
            disabled={isImporting}
            className="self-start -ml-2 text-xs gap-1.5 text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <BoxIcon name="arrow-back" className="text-base" />
            Trocar Catálogo
          </Button>

          <div className="flex items-center gap-2 flex-1 sm:max-w-xs">
            <div className="relative w-full">
              <BoxIcon
                name="search"
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm pointer-events-none"
              />
              <Input
                placeholder="Buscar por nome ou ref..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 text-xs pl-8 rounded-lg"
              />
            </div>
          </div>
        </div>

        {/* Toolbar de Ações e Seleção de Categoria */}
        <div className="p-3 bg-muted/30 border border-border/50 rounded-xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <Checkbox
              id="select-all-catalog-items"
              checked={isAllSelected}
              onCheckedChange={handleToggleSelectAll}
              disabled={importableCount === 0 || isImporting}
              className="cursor-pointer"
            />
            <label
              htmlFor="select-all-catalog-items"
              className="cursor-pointer font-medium select-none text-foreground"
            >
              Selecionar todos os novos ({selectedCountInView}/{importableCount})
            </label>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-muted-foreground shrink-0 font-medium">
              Vincular a:
            </span>
            <Select
              value={selectedCategoryId}
              onValueChange={(val) => setSelectedCategoryId(val || "auto")}
              disabled={isImporting}
            >
              <SelectTrigger className="h-8 text-xs w-[170px] rounded-lg bg-background">
                <SelectValue placeholder="Categoria de destino" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Automática (Detectada)</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Listagem de Produtos */}
        {loadingDetails ? (
          <div className="py-16 flex flex-col items-center justify-center text-muted-foreground gap-2">
            <BoxIcon name="loader-alt" className="bx-spin text-3xl text-primary" />
            <span className="text-sm">Carregando produtos do catálogo...</span>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            <BoxIcon name="search" className="text-4xl mx-auto mb-2 opacity-50" />
            <p className="font-medium text-sm">Nenhum produto encontrado.</p>
            <p className="text-xs mt-1">Tente ajustar o termo da busca.</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
            {filteredProducts.map((p) => {
              const gp = p.globalProduct;
              const isSelected = selectedProductIds.has(gp.id);
              const thumbUrl = p.cropUrl || gp.imageUrl;
              const price = Number(p.regularPrice ?? p.cyclePrice ?? gp.suggestedPrice ?? 0);
              const variantsCount = gp.variants?.length || 0;

              return (
                <div
                  key={p.id}
                  onClick={() => {
                    if (!p.isImported && !isImporting) {
                      handleToggleProduct(gp.id);
                    }
                  }}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-xl border transition-all select-none",
                    p.isImported
                      ? "opacity-60 bg-muted/20 border-border/40 cursor-not-allowed"
                      : isSelected
                      ? "bg-primary/5 border-primary/60 cursor-pointer shadow-xs"
                      : "bg-card border-border/70 hover:border-border cursor-pointer"
                  )}
                >
                  <Checkbox
                    checked={p.isImported || isSelected}
                    disabled={p.isImported || isImporting}
                    onCheckedChange={() => {
                      if (!p.isImported && !isImporting) {
                        handleToggleProduct(gp.id);
                      }
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="shrink-0"
                  />

                  {/* Thumbnail com Zoom */}
                  <div
                    onClick={(e) => {
                      if (thumbUrl) {
                        e.stopPropagation();
                        setZoomedImage(thumbUrl);
                      }
                    }}
                    className="relative w-14 h-14 rounded-lg overflow-hidden bg-muted/60 border border-border/50 shrink-0 flex items-center justify-center group/thumb"
                  >
                    {thumbUrl ? (
                      <>
                        <Image
                          src={thumbUrl}
                          alt={gp.name}
                          fill
                          unoptimized
                          sizes="56px"
                          className="object-cover group-hover/thumb:scale-105 transition-transform"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/thumb:opacity-100 flex items-center justify-center transition-opacity text-white">
                          <BoxIcon name="zoom-in" className="text-base" />
                        </div>
                      </>
                    ) : (
                      <BoxIcon name="image" className="text-xl text-muted-foreground/40" />
                    )}
                  </div>

                  {/* Informações Principais */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {gp.referenceSku && (
                        <Badge variant="outline" className="text-[10px] font-mono px-1.5 py-0 h-4 font-semibold">
                          Ref: {gp.referenceSku}
                        </Badge>
                      )}
                      {p.pageNumber && (
                        <span className="text-[10px] text-muted-foreground">
                          Pág. {p.pageNumber}
                        </span>
                      )}
                      {p.isImported && (
                        <Badge
                          variant="secondary"
                          className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-medium"
                        >
                          <BoxIcon name="check" className="text-xs mr-0.5" />
                          Já no Estoque
                        </Badge>
                      )}
                    </div>

                    <h4 className="font-medium text-xs sm:text-sm text-foreground mt-0.5 line-clamp-1">
                      {gp.name}
                    </h4>

                    <div className="flex items-center gap-2 mt-1 flex-wrap text-xs">
                      <span className="font-semibold text-foreground">
                        {currency(price)}
                      </span>
                      {p.promoPrice && (
                        <span className="text-xs text-rose-500 font-medium">
                          Promo: {currency(Number(p.promoPrice))}
                        </span>
                      )}
                      {variantsCount > 0 && (
                        <span className="text-[11px] text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded">
                          {variantsCount} variantes
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // Diálogo de Zoom de Imagem
  const zoomModal = zoomedImage && (
    <Dialog open={!!zoomedImage} onOpenChange={() => setZoomedImage(null)}>
      <DialogContent className="sm:max-w-md p-2 overflow-hidden bg-background">
        <div className="relative aspect-square w-full rounded-lg overflow-hidden bg-black/5 flex items-center justify-center">
          <Image
            src={zoomedImage}
            alt="Foto do produto"
            fill
            unoptimized
            sizes="(max-width: 640px) 100vw, 400px"
            className="object-contain"
          />
        </div>
      </DialogContent>
    </Dialog>
  );

  // Botões de Ação
  const actionButtons = (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={onClose}
        disabled={isImporting}
        className="rounded-xl w-full sm:w-auto cursor-pointer"
      >
        Cancelar
      </Button>

      {step === "products" && (
        <Button
          type="button"
          onClick={handleExecuteImport}
          disabled={selectedProductIds.size === 0 || isImporting}
          className="rounded-xl w-full sm:w-auto gap-2 cursor-pointer font-medium"
        >
          {isImporting ? (
            <>
              <BoxIcon name="loader-alt" className="bx-spin text-base" />
              Importando para Minha Loja...
            </>
          ) : (
            <>
              <BoxIcon name="download" className="text-base" />
              Importar {selectedProductIds.size > 0 ? `(${selectedProductIds.size})` : ""}
            </>
          )}
        </Button>
      )}
    </>
  );

  // Renderização Responsiva Híbrida: Drawer (Mobile) vs Dialog (Desktop)
  if (isMobile) {
    return (
      <>
        <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
          <DrawerContent className="max-h-[92dvh] flex flex-col p-4">
            <DrawerHeader className="px-0 pt-0 pb-2 text-left">
              <DrawerTitle className="text-base font-semibold flex items-center gap-2">
                <BoxIcon name="book-content" className="text-xl text-primary shrink-0" />
                <span className="truncate">
                  {step === "catalogs"
                    ? "Importar de Catálogos Digitais"
                    : selectedCatalog?.title || "Produtos da Revista"}
                </span>
              </DrawerTitle>
            </DrawerHeader>

            <div className="flex-1 min-h-0 overflow-y-auto py-2">
              {renderContent()}
            </div>

            <DrawerFooter className="px-0 pt-3 pb-0 mt-auto border-t border-border/40 flex flex-col gap-2 shrink-0">
              {actionButtons}
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
        {zoomModal}
      </>
    );
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-3xl max-h-[90dvh] flex flex-col p-4 sm:p-6 overflow-hidden rounded-2xl sm:rounded-xl">
          <DialogHeader className="shrink-0 pb-2">
            <DialogTitle className="text-lg font-semibold flex items-center gap-2">
              <BoxIcon name="book-content" className="text-2xl text-primary shrink-0" />
              <span>
                {step === "catalogs"
                  ? "Importar de Catálogos Digitais"
                  : selectedCatalog?.title || "Produtos da Revista"}
              </span>
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 min-h-0 overflow-y-auto py-2 pr-1 -mr-1">
            {renderContent()}
          </div>

          <DialogFooter className="shrink-0 pt-3 border-t border-border/40 gap-2 sm:gap-2">
            {actionButtons}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {zoomModal}
    </>
  );
}
