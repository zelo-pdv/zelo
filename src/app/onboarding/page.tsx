import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { requireOnboarding } from "../../../proxy";
import { OnboardingWizard } from "./onboarding-wizard";

export const metadata = {
  title: "Configuração Inicial da Loja | Zelo",
  description: "Personalize o funcionamento do Zelo para a sua rotina de revendedora e vendas.",
};

export default async function OnboardingPage() {
  // Garante que o usuário está autenticado e realmente precisa do onboarding
  const { user } = await requireOnboarding();

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

  // Se já concluiu, manda pro dashboard
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
