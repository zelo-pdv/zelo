"use client";

import { ProductForm } from '@/components/produtos/product-form';

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
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
import { LoadingButton } from "@/components/ui/loading-button";
import { getProductColumns, getProductTotalStock, ProductFrontend } from "./columns";
import { ProductsDataTable } from "./data-table";
import { productsService } from "@/services/products.service";
import { categoriesService } from "@/services/categories.service";
import { Category } from "@/prisma/client";
import { usePermissions } from "@/components/auth/permissions-provider";
import { useDataSync, notifyLocalSync } from "@/hooks/use-data-sync";
import { useSettingsStore } from "@/store/useSettingsStore";
import { MobileActionFab } from "@/components/ui/mobile-action-fab";
import { handleExportProducts } from "@/lib/export";
import { ProductsImportModal } from "@/components/produtos/products-import-modal";
import { ProductsConfigModal } from "@/components/produtos/products-config-modal";

export type FormVariantState = {
  id?: string;
  name: string;
  code: string;
  barcode: string;
  attributes: Record<string, any>;
  costPrice: number | null;
  salePrice: number | null;
  stock: number;
  minStock: number | null;
  image: string;
};

export type FormState = {
  name: string;
  categoryId: string;
  description: string;
  costPrice: number;
  salePrice: number;
  stock: number;
  minStock: number | null;
  notes: string;
  barcode: string;
  code: string;
  image: string;
  hasVariants: boolean;
  variants: FormVariantState[];
};

const emptyForm: FormState = {
  name: "",
  categoryId: "",
  description: "",
  costPrice: 0,
  salePrice: 0,
  stock: 0,
  minStock: null,
  notes: "",
  barcode: "",
  code: "",
  image: "",
  hasVariants: false,
  variants: [],
};

export default function ProdutosPage() {
  const { can } = usePermissions();
  const productsSettings = useSettingsStore((s) => s.products) ?? {
    trackStock: false,
  };
  const [products, setProducts] = useState<ProductFrontend[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);



  const [editing, setEditing] = useState<ProductFrontend | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<ProductFrontend | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    await handleExportProducts();
    setIsExporting(false);
  };

  const refreshData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);

      const [fetchedProducts, fetchedCategories] =
        await Promise.all([
          productsService.list(),
          categoriesService.list(),
        ]);

      setProducts(fetchedProducts as ProductFrontend[]);
      setCategories(fetchedCategories as Category[]);
    } catch (error) {
      if (!silent) {
        toast.error("Erro ao carregar dados dos produtos.");
      }
      console.error("Erro ao carregar produtos ou categorias:", error);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    refreshData(false);
  }, []);

  // Sincronização em tempo real entre dispositivos e abas
  useDataSync({
    types: ["products", "categories"],
    onSync: () => {
      refreshData(true);
    },
  });

  // Extrai apenas os nomes para alimentar o filtro do Data-table
  const categoryNames = useMemo(
    () => categories.map((c) => c.name).sort(),
    [categories],
  );

  const handleToggleActive = async (product: ProductFrontend) => {
    try {
      const newStatus = !(product.active ?? true);
      await productsService.update(product.id, { active: newStatus });
      setProducts((prev) =>
        prev.map((p) =>
          p.id === product.id ? { ...p, active: newStatus } : p,
        ),
      );
      toast.success(
        newStatus
          ? "Produto ativado com sucesso!"
          : "Produto desativado com sucesso!",
      );
      notifyLocalSync("products");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Erro ao alterar status do produto.",
      );
    }
  };

  const columns = useMemo(
    () =>
      getProductColumns({
        onEdit: setEditing,
        onDelete: setDeleting,
        onToggleActive: handleToggleActive,
        can,
        trackStock: productsSettings.trackStock ?? false,
      }),
    [can, productsSettings.trackStock],
  );

  if (loading) {
    return <GlobalLoader />;
  }

  return (
    <div className="w-full px-4">
      <ProductsDataTable
        columns={columns}
        data={products}
        categories={categoryNames}
        onCreateClick={() => setCreating(true)}
        onConfigClick={() => setIsConfigOpen(true)}
        onImportClick={() => setIsImportOpen(true)}
        onExportClick={handleExport}
        isExporting={isExporting}
        onEdit={setEditing}
        onDelete={setDeleting}
        onToggleActive={handleToggleActive}
        trackStock={productsSettings.trackStock ?? false}
        canEdit={can("produtos", "Editar")}
        canDelete={can("produtos", "Excluir")}
      />

      <MobileActionFab 
        onAdd={() => setCreating(true)} 
        onExport={handleExport} 
        onConfig={() => setIsConfigOpen(true)}
        onImport={() => setIsImportOpen(true)}
        isExporting={isExporting} 
      />
      <ProductsImportModal isOpen={isImportOpen} onClose={() => setIsImportOpen(false)} />

      <ProductsConfigModal isOpen={isConfigOpen} onClose={() => setIsConfigOpen(false)} />


      <ProductForm
        key={editing?.id ?? "new"}
        open={creating || !!editing}
        onOpenChange={(o) => {
          if (!o) {
            setCreating(false);
            setEditing(null);
          }
        }}
        initial={
          editing
            ? {
                name: editing.name,
                categoryId: editing.categoryId || "",
                description: editing.description || "",
                costPrice: editing.costPrice || 0,
                salePrice: editing.salePrice,
                stock: getProductTotalStock(editing),
                minStock:
                  editing.minStock !== null && editing.minStock !== undefined
                    ? Number(editing.minStock)
                    : null,
                notes: editing.notes || "",
                barcode: editing.barcode || "",
                code: editing.code || "",
                image: editing.image || "",
                hasVariants: (editing.variants?.length ?? 0) > 0,
                variants: editing.variants?.map((v: any) => ({
                  id: v.id,
                  name: v.name,
                  code: v.code || "",
                  barcode: v.barcode || "",
                  attributes: v.attributes || {},
                  costPrice: v.costPrice ? Number(v.costPrice) : null,
                  salePrice: v.salePrice ? Number(v.salePrice) : null,
                  stock: Number(v.stock ?? 0),
                  minStock:
                    v.minStock !== null && v.minStock !== undefined
                      ? Number(v.minStock)
                      : null,
                  image: v.image || "",
                })) || [],
              }
            : {
                ...emptyForm,
                categoryId:
                  categories.find((c) => c.name === "Geral" || c.name === "Diversos")?.id || categories[0]?.id || "",
              }
        }
        isEdit={!!editing}
        productId={editing?.id}
        categories={categories}
        products={products}
        onSubmit={async (data) => {
          if (editing) {
            const updatedProduct = (await productsService.update(
              editing.id,
              data,
            )) as ProductFrontend;

            setProducts((prev) =>
              prev.map((product) =>
                product.id === editing.id
                  ? { ...product, ...updatedProduct }
                  : product,
              ),
            );

            toast.success("Produto atualizado com sucesso!");
            notifyLocalSync("products");
          } else {
            const newProduct = (await productsService.create(
              data,
            )) as ProductFrontend;

            setProducts((prev) => [newProduct, ...prev]);

            toast.success("Produto cadastrado com sucesso!");
            notifyLocalSync("products");
          }

          setCreating(false);
          setEditing(null);
        }}
      />


      <DeleteProduct
        product={deleting}
        onClose={() => setDeleting(null)}
        onConfirm={async (id) => {
          try {
            await productsService.remove(id);

            setProducts((prev) => prev.filter((product) => product.id !== id));

            toast.success("Produto removido com sucesso!");
            setDeleting(null);
            notifyLocalSync("products");
          } catch (error) {
            const message =
              error instanceof Error
                ? error.message
                : "Erro ao remover produto.";

            toast.error(message);
          }
        }}
      />
    </div>
  );
}

function DeleteProduct({
  product,
  onClose,
  onConfirm,
}: {
  product: ProductFrontend | null;
  onClose: () => void;
  onConfirm: (id: string) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);

  return (
    <AlertDialog open={!!product} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remover produto?</AlertDialogTitle>

          <AlertDialogDescription>
            {product?.name} será removido do catálogo. O histórico de vendas deste
            produto será mantido intacto no sistema. Esta ação não pode ser desfeita.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>

          <LoadingButton
            loading={busy}
            onClick={async () => {
              if (!product) return;

              setBusy(true);
              try {
                await onConfirm(product.id);
              } finally {
                setBusy(false);
              }
            }}
          >
            Remover
          </LoadingButton>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

