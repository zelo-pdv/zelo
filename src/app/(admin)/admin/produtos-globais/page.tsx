import type { Metadata } from "next";
import { BoxIcon } from "@/components/ui/box-icon";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Produtos Globais | Zelo Admin",
};

export default function AdminProdutosGlobaisPlaceholderPage() {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-dashed border-border/80 p-8 text-center bg-card/40">
        <div className="mx-auto size-12 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center mb-3">
          <BoxIcon name="package" className="size-6" />
        </div>
        <h3 className="font-semibold text-base text-foreground">Catálogo Mestre de Produtos Globais</h3>
        <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
          Módulo planejado para a <strong>Sprint 4</strong>. Banco central de produtos com SKU, EAN e imagens oficiais.
        </p>
        <div className="mt-4">
          <Link
            href="/admin/dashboard"
            className="inline-flex items-center gap-1.5 text-xs text-primary font-medium hover:underline"
          >
            ← Voltar ao Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
