"use client";

import Link from "next/link";
import { BoxIcon } from "@/components/ui/box-icon";
import { Button } from "@/components/ui/button";

export default function OfflineFallbackPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-6 py-12 text-center">
      <div className="mb-4 flex size-16 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
        <BoxIcon name="wifi-off" className="text-3xl" />
      </div>
      <h1 className="text-2xl font-bold tracking-tight text-foreground">
        Você está sem conexão
      </h1>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        Esta página ainda não foi armazenada no cache local. Você pode continuar
        registrando vendas normalmente no modo offline do PDV.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Link href="/nova-venda">
          <Button className="rounded-full px-6">
            <BoxIcon name="cart" className="mr-2 text-base" />
            Ir para Nova Venda
          </Button>
        </Link>
        <Button
          variant="outline"
          className="rounded-full px-6"
          onClick={() => window.location.reload()}>
          <BoxIcon name="refresh" className="mr-2 text-base" />
          Tentar novamente
        </Button>
      </div>
    </main>
  );
}
