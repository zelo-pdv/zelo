import type { Metadata } from "next";
import { BoxIcon } from "@/components/ui/box-icon";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Catálogos e Revistas | Zelo Admin",
};

export default function AdminCatalogosPlaceholderPage() {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-dashed border-border/80 p-8 text-center bg-card/40">
        <div className="mx-auto size-12 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center mb-3">
          <BoxIcon name="book-content" className="size-6" />
        </div>
        <h3 className="font-semibold text-base text-foreground">Catálogos e Revistas Digitais</h3>
        <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
          Módulo planejado para a <strong>Sprint 4</strong>. Upload seguro de PDFs, curadoria e publicação de ciclos.
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
