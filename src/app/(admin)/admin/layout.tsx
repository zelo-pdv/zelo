import { requirePlatformAdminPage } from "@/lib/require-platform-admin";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminHeader } from "@/components/admin/admin-header";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Verificação Server-side obrigatória (Camada 2 de defesa em profundidade)
  // Se não autenticado ou desativado no PostgreSQL, redireciona para /admin/login
  const admin = await requirePlatformAdminPage();

  return (
    <SidebarProvider
      defaultOpen={true}
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 56)",
          "--header-height": "calc(var(--spacing) * 14)",
        } as React.CSSProperties
      }
    >
      <AdminSidebar admin={admin} variant="inset" />
      <SidebarInset>
        <AdminHeader admin={admin} />
        <main className="flex flex-1 flex-col p-4 md:p-6 overflow-y-auto">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
