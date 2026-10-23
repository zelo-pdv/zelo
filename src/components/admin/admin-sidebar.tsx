"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupContent,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { BoxIcon } from "@/components/ui/box-icon";
import { cn } from "@/lib/utils";
import type { AuthenticatedAdmin } from "@/lib/require-platform-admin";

const ADMIN_NAV = [
  { label: "Dashboard", to: "/admin/dashboard", icon: "dashboard" },
  { label: "Lojas e Contas", to: "/admin/contas", icon: "store" },
  { label: "Marcas", to: "/admin/marcas", icon: "purchase-tag" },
  { label: "Categorias Globais", to: "/admin/categorias", icon: "category" },
  { label: "Catálogos e Revistas", to: "/admin/catalogos", icon: "book-content" },
  { label: "Produtos Globais", to: "/admin/produtos-globais", icon: "package" },
];

export function AdminSidebar({
  admin,
  ...props
}: React.ComponentProps<typeof Sidebar> & { admin?: AuthenticatedAdmin }) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await fetch("/api/admin/auth/logout", { method: "POST" });
      router.push("/admin/login");
      router.refresh();
    } catch (error) {
      console.error("Erro no logout:", error);
    }
  };

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader className="mb-4 p-2 group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:py-2.5">
        <div className="flex items-center gap-2.5 px-2 py-1.5 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:justify-center select-none">
          <div className="relative shrink-0 flex items-center justify-center">
            <Image
              src="/zelo-black.png"
              alt="Zelo"
              width={48}
              height={48}
              priority
              className="size-9 group-data-[collapsible=icon]:size-10.5 object-contain dark:hidden transition-all duration-200"
            />
            <Image
              src="/zelo-white.png"
              alt="Zelo"
              width={48}
              height={48}
              priority
              className="size-9 group-data-[collapsible=icon]:size-10.5 object-contain hidden dark:block transition-all duration-200"
            />
          </div>
          <div className="flex flex-col group-data-[collapsible=icon]:hidden leading-none">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-base tracking-tight text-foreground">
                Zelo
              </span>
              <span className="rounded-md bg-primary/10 text-primary font-medium px-1.5 py-0.5 text-[10px] uppercase tracking-wide">
                Admin
              </span>
            </div>
            <span className="text-[11px] text-muted-foreground mt-0.5">
              Administração Global
            </span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {ADMIN_NAV.map((item) => {
                const isActive = pathname === item.to || (item.to !== "/admin/dashboard" && pathname.startsWith(item.to));
                return (
                  <SidebarMenuItem key={item.to} className="pb-1">
                    <SidebarMenuButton
                      isActive={isActive}
                      tooltip={item.label}
                      render={
                        <Link
                          href={item.to}
                          className={cn(
                            "flex items-center gap-3 w-full rounded-lg px-2.5 py-2 transition-all duration-150",
                            isActive
                              ? "bg-primary/10 text-primary font-medium dark:bg-primary/20"
                              : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                          )}
                        >
                          <BoxIcon
                            name={item.icon}
                            className={cn(
                              "size-5 shrink-0",
                              isActive ? "text-primary fill-primary" : "text-muted-foreground"
                            )}
                          />
                          <span className="group-data-[collapsible=icon]:hidden text-sm">
                            {item.label}
                          </span>
                        </Link>
                      }
                    />
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-2 border-t border-border/50">
        <div className="flex items-center justify-between p-2 group-data-[collapsible=icon]:justify-center">
          <div className="flex items-center gap-2.5 overflow-hidden group-data-[collapsible=icon]:hidden">
            <div className="size-8 rounded-full bg-primary/15 text-primary flex items-center justify-center font-bold text-xs shrink-0">
              {admin?.name?.slice(0, 2).toUpperCase() || "SA"}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-medium text-foreground truncate">
                {admin?.name || "Administrador"}
              </span>
              <span className="text-[10px] text-muted-foreground truncate uppercase font-semibold text-primary">
                {admin?.role || "SUPERADMIN"}
              </span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            title="Sair do painel administrativo"
            className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
          >
            <BoxIcon name="log-out" className="size-4" />
          </button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
