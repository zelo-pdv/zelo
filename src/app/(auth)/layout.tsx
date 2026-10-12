import { cookies } from "next/headers";
import { requireAuth } from "../../../proxy";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { SiteHeader } from "@/components/layout/site-header";
import { BottomNavigation } from "@/components/layout/bottom-navigation";
import { PermissionsProviderWrapper } from "@/components/auth/permissions-provider-wrapper";
import { userContextSchema, type UserContextData } from "@/lib/validations/user_context";

async function getServerUserContext(): Promise<UserContextData | null> {
  const cookieStore = await cookies();
  const rawCookie = cookieStore.get("user_context")?.value;
  if (!rawCookie) return null;
  try {
    const value = decodeURIComponent(rawCookie);
    const decoded = Buffer.from(value, "base64").toString("utf-8");
    const parsed = userContextSchema.safeParse(JSON.parse(decoded));
    if (parsed.success) return parsed.data;
  } catch {
    return null;
  }
  return null;
}

export default async function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // O proxy entra em ação aqui: se não houver token, ele barra o acesso
  // e redireciona para o /login antes de renderizar qualquer componente da interface.
  await requireAuth();
  const initialContext = await getServerUserContext();

  return (
    <PermissionsProviderWrapper initialContext={initialContext}>
      <SidebarProvider
        defaultOpen={false}
        style={
          {
            "--sidebar-width": "calc(var(--spacing) * 48)",
            "--header-height": "calc(var(--spacing) * 12)",
          } as React.CSSProperties
        }
      >
        <AppSidebar variant="inset" />
        <SidebarInset>
          <SiteHeader />
          <div className="flex flex-1 flex-col pb-24 md:pb-6">
            <div className="flex flex-1 flex-col">
              <div className="@container/main flex flex-1 flex-col gap-2">
                <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
                  {children}
                </div>
              </div>
            </div>
          </div>
          <BottomNavigation />
        </SidebarInset>
      </SidebarProvider>
    </PermissionsProviderWrapper>
  );
}
