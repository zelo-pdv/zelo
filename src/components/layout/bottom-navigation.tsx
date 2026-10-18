"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { NAV } from "@/lib/navigation-data";
import { usePermissions } from "@/components/auth/permissions-provider";
import { createBoxIcon } from "@/components/ui/box-icon";

export function BottomNavigation() {
  const pathname = usePathname();
  const { can } = usePermissions();

  const visibleNav = NAV.filter(
    (n) => !n.module || can(n.module, "Visualizar"),
  ).map((n) => {
    if (n.to === "/historico") {
      return {
        ...n,
        to: "/mais",
        label: "Mais",
        short: "Mais",
        icon: createBoxIcon("menu"),
      };
    }
    return n;
  });

  // Se tiver somente um item (ou nenhum), não precisa mostrar a navegação
  if (visibleNav.length <= 1) {
    return null;
  }

  const isActive = (to: string) => {
    if (to === "/dashboard") {
      return pathname === "/dashboard" || pathname === "/";
    }
    if (to === "/mais") {
      return (
        pathname === "/mais" ||
        [
          "/historico",
          "/usuarios",
          "/registros",
          "/configuracoes",
          "/relatorios",
          "/estoque",
        ].some((p) => pathname.startsWith(p))
      );
    }
    return pathname.startsWith(to);
  };

  return (
    <nav className="fixed inset-x-0 bottom-[max(env(safe-area-inset-bottom),1rem)] z-40 flex justify-center px-4 pointer-events-none md:hidden">
      <div
        className="pointer-events-auto grid items-center p-1.5 rounded-full bg-[#E9ECF0]/90 dark:bg-[#1C1E22]/90 backdrop-blur-2xl border border-white/80 dark:border-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.12)] w-[calc(100%-1rem)] max-w-107.5"
        style={{
          gridTemplateColumns: `repeat(${visibleNav.length}, minmax(0, 1fr))`,
        }}>
        {visibleNav.map((n) => {
          const Icon = n.icon;
          const active = isActive(n.to);
          const isVender = n.to === "/nova-venda";

          return (
            <div key={n.to} className="flex items-center justify-center w-full">
              <Link
                href={n.to}
                aria-label={n.label || n.short}
                title={n.label || n.short}
                className={cn(
                  "relative flex items-center justify-center transition-all duration-200 select-none group",
                  isVender
                    ? "w-11 h-11 rounded-full bg-primary text-primary-foreground shadow-md shadow-primary/25 active:scale-95"
                    : active
                      ? "w-14 h-11 rounded-full bg-white dark:bg-[#2A2C30] shadow-[0_2px_10px_rgba(0,0,0,0.08)]"
                      : "w-11 h-11 rounded-full bg-transparent",
                )}>
                <Icon
                  active={active}
                  className={cn(
                    "text-2xl transition-all duration-200",
                    isVender
                      ? "text-primary-foreground"
                      : active
                        ? "text-black dark:text-white"
                        : "text-black/85 dark:text-white/85 group-hover:text-black dark:group-hover:text-white",
                  )}
                />
              </Link>
            </div>
          );
        })}
      </div>
    </nav>
  );
}
