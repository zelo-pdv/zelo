import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { OnboardingWizard } from "./onboarding-wizard";

export const metadata = {
  title: "Configuração Inicial da Loja | Zelo",
  description: "Personalize o funcionamento do Zelo para a sua rotina de revendedora e vendas.",
};

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  // A interceptação e validação de sessão/onboarding ocorrem no middleware.ts.
  // Aqui no Server Component garantimos a autenticação no banco e obtemos os dados da loja.
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  // Busca dados da loja e configurações existentes
  const loja = await prisma.loja.findUnique({
    where: { id: user.lojaId },
    select: {
      id: true,
      name: true,
      ownerName: true,
      phone: true,
      email: true,
      settings: {
        select: {
          config: true,
        },
      },
    },
  });

  if (!loja) {
    redirect("/login");
  }

  const storeConfig = (loja.settings?.config as any) ?? {};
  const onboardingData = storeConfig.onboarding ?? {
    completed: false,
    step: 1,
  };

  // Se já concluiu no banco, redireciona para o dashboard
  if (onboardingData.completed) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen w-full bg-background font-sans text-foreground">
      <OnboardingWizard
        storeName={loja.name}
        ownerName={loja.ownerName}
        initialPhone={loja.phone || ""}
        initialConfig={storeConfig}
        initialStep={onboardingData.step || 1}
      />
    </div>
  );
}
