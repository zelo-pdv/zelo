"use client";

import { usePathname } from "next/navigation";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { ModeToggle } from "@/components/layout/mode-toggle";
import type { AuthenticatedAdmin } from "@/lib/require-platform-admin";

const TITLE_MAP: Record<string, string> = {
  "/admin/dashboard": "Dashboard Global",
  "/admin/contas": "Gestão de Lojas e Contas",
  "/admin/marcas": "Marcas e Fornecedores",
  "/admin/categorias": "Categorias Globais",
  "/admin/catalogos": "Catálogos e Revistas Digitais",
  "/admin/produtos-globais": "Catálogo Mestre de Produtos",
};

export function AdminHeader({ admin }: { admin?: AuthenticatedAdmin }) {
  const pathname = usePathname();

  const title =
    Object.entries(TITLE_MAP).find(([route]) => pathname.startsWith(route))?.[1] ||
    "Painel Administrativo";

  return (
    <header className="flex h-(--header-height) shrink-0 items-center justify-between border-b border-border/50 px-4 lg:px-6 transition-[width,height] ease-linear">
      <div className="flex items-center gap-3">
        <SidebarTrigger className="-ml-1 text-muted-foreground hover:text-foreground" />
        <Separator orientation="vertical" className="h-4" />
        <h1 className="text-sm font-semibold tracking-tight text-foreground md:text-base">
          {title}
        </h1>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-full bg-muted/60 border border-border/50 text-xs">
          <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-muted-foreground">Admin:</span>
          <span className="font-medium text-foreground">{admin?.name || "Admin"}</span>
        </div>
        <ModeToggle />
      </div>
    </header>
  );
}
