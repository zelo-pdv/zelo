"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";
import { cn } from "@/lib/utils";

export function ModeToggle({
  className,
  title,
}: {
  className?: string;
  title?: boolean;
}) {
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="inline-flex items-center">
        <div
          className={cn(
            "relative inline-flex size-11 shrink-0 items-center justify-center rounded-xl border border-border/70 bg-white dark:bg-card shadow-xs md:size-8 md:rounded-lg md:border-border md:bg-background md:shadow-none text-foreground",
            className
          )}
        />
        {title && <span className="ml-2 text-sm invisible">Tema claro</span>}
      </div>
    );
  }

  return (
    <div className="inline-flex items-center">
      <AnimatedThemeToggler
        theme={resolvedTheme === "dark" ? "dark" : "light"}
        onThemeChange={setTheme}
        className={cn(
          "relative inline-flex size-11 shrink-0 items-center justify-center rounded-xl border border-border/70 bg-white dark:bg-card shadow-xs hover:bg-muted text-foreground transition-colors cursor-pointer select-none outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:size-8 md:rounded-lg md:border-border md:bg-background md:shadow-none",
          className
        )}
      />
      {title && (
        <span className="ml-2 text-sm">
          {resolvedTheme === "dark" ? "Tema claro" : "Tema escuro"}
        </span>
      )}
    </div>
  );
}
