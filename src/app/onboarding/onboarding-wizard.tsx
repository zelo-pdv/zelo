"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { toast } from "sonner";
import { BoxIcon } from "@/components/ui/box-icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ModeToggle } from "@/components/layout/mode-toggle";
import { maskPhone } from "@/lib/masks";
import { cn } from "@/lib/utils";
import { onboardingService } from "@/services/onboarding.service";
import { SaleStatus } from "@/types";

interface OnboardingWizardProps {
  storeName: string;
  ownerName: string;
  initialPhone?: string;
  initialConfig?: any;
  initialStep?: number;
}

export function OnboardingWizard({
  storeName,
  ownerName,
  initialPhone = "",
  initialConfig = {},
  initialStep = 1,
}: OnboardingWizardProps) {
  const router = useRouter();

  // Estado do wizard (etapas 1 a 4)
  const [step, setStep] = useState<number>(
    Math.min(Math.max(initialStep, 1), 4),
  );
  const [saving, setSaving] = useState(false);

  // Etapa 1 - Estoque
  const [trackStock, setTrackStock] = useState<boolean>(
    initialConfig?.products?.trackStock ?? true,
  );
  const [blockOutOfStock, setBlockOutOfStock] = useState<boolean>(
    initialConfig?.sales?.blockOutOfStock ?? false,
  );

  // Etapa 2 - Vendas & Cobrança
  const [requireClient, setRequireClient] = useState<boolean>(
    initialConfig?.sales?.requireClient ?? false,
  );
  const [defaultPaymentMethod, setDefaultPaymentMethod] = useState<string>(
    initialConfig?.sales?.defaultPaymentMethod ?? "PIX",
  );
  const [defaultSaleStatus, setDefaultSaleStatus] = useState<SaleStatus>(
    (initialConfig?.sales?.defaultSaleStatus as SaleStatus) ?? SaleStatus.PAGO,
  );

  // Etapa 3 - Catálogo & Contato
  const [showProductImages, setShowProductImages] = useState<boolean>(
    initialConfig?.products?.showProductImages ?? true,
  );
  const [storePhone, setStorePhone] = useState<string>(
    initialConfig?.store?.phone || initialPhone || "",
  );

  const getFormData = () => ({
    trackStock,
    blockOutOfStock: trackStock ? blockOutOfStock : false,
    requireClient,
    defaultPaymentMethod,
    defaultSaleStatus,
    showProductImages,
    storePhone,
    step,
  });

  const handleNext = async () => {
    const nextStep = step + 1;
    setSaving(true);
    try {
      // Salva o progresso intermediário para não perder escolhas se fechar o navegador
      await onboardingService.saveStep({
        ...getFormData(),
        step: nextStep,
      });
      setStep(nextStep);
    } catch {
      // Mesmo se der erro no save intermediário, permite avançar na tela
      setStep(nextStep);
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleFinish = async () => {
    setSaving(true);
    try {
      const payload = {
        ...getFormData(),
        completed: true,
        step: 4,
      };

      const res = (await onboardingService.complete(payload)) as any;
      toast.success("Loja configurada com sucesso! Bem-vindo(a) ao Zelo.");

      // Redireciona para o painel principal
      const target = res?.redirectTo || "/dashboard";
      router.push(target);
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || "Erro ao concluir configuração.");
      setSaving(false);
    }
  };

  const handleSkip = async () => {
    setSaving(true);
    try {
      const res = (await onboardingService.skip(getFormData())) as any;
      toast.info("Configuração ignorada. Você pode alterá-la quando quiser em Configurações.");

      // Redireciona para o painel principal
      const target = res?.redirectTo || "/dashboard";
      router.push(target);
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || "Erro ao pular configuração.");
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background font-sans overflow-x-hidden w-full">
      {/* Topo / Barra de Navegação */}
      <header className="border-b border-border/60 bg-background/95 backdrop-blur-md sticky top-0 z-30 w-full">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-3 sm:px-6 py-3.5">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="relative flex items-center justify-center shrink-0">
              <Image
                src="/zelo-black.png"
                alt="Zelo"
                width={36}
                height={36}
                priority
                className="size-8 object-contain dark:hidden"
              />
              <Image
                src="/zelo-white.png"
                alt="Zelo"
                width={36}
                height={36}
                priority
                className="size-8 object-contain hidden dark:block"
              />
            </div>
            <div className="min-w-0 truncate">
              <span className="text-base font-bold tracking-tight text-foreground">
                Zelo
              </span>
              <span className="text-xs text-muted-foreground ml-2 hidden sm:inline-block truncate">
                Configuração inicial de{" "}
                <strong className="text-foreground font-semibold">
                  {storeName}
                </strong>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleSkip}
              disabled={saving}
              className="text-xs text-muted-foreground hover:text-foreground h-8 px-2 sm:px-2.5 rounded-lg cursor-pointer">
              Pular onboarding
            </Button>
            <span className="text-xs font-medium text-muted-foreground bg-muted/60 px-2.5 py-1 rounded-full hidden sm:inline-block">
              Etapa {step} de 4
            </span>
            <ModeToggle />
          </div>
        </div>

        {/* Barra de Progresso Superior */}
        <div className="w-full bg-muted/40 h-1">
          <div
            className="bg-primary h-1 transition-all duration-300 ease-out"
            style={{ width: `${(step / 4) * 100}%` }}
          />
        </div>
      </header>

      {/* Conteúdo Principal / Card da Etapa */}
      <main className="mx-auto flex flex-1 max-w-2xl w-full flex-col justify-center px-3 sm:px-6 py-6 sm:py-8">
        <div className="rounded-2xl border border-border/70 bg-card p-4 sm:p-8 shadow-sm w-full overflow-hidden">
          {/* ============================================================== */}
          {/* ETAPA 1: CONTROLE DE ESTOQUE */}
          {/* ============================================================== */}
          {step === 1 && (
            <div className="space-y-6 animate-in fade-in-50 duration-200">
              <div className="space-y-1.5 text-left">
                <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary uppercase tracking-wider mb-1">
                  <BoxIcon name="package" className="text-sm" />
                  Operação dos Produtos
                </div>
                <h2 className="text-2xl font-bold tracking-tight">
                  Como você gerencia seus produtos?
                </h2>
                <p className="text-sm text-muted-foreground">
                  Escolha se você mantém produtos a pronta entrega ou se
                  trabalha apenas anotando encomendas sob demanda.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3.5 pt-2">
                {/* Opção 1: Com estoque */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setTrackStock(true)}
                  onKeyDown={(e) => e.key === "Enter" && setTrackStock(true)}
                  className={cn(
                    "relative flex cursor-pointer items-start gap-4 rounded-xl border p-4.5 transition-all",
                    trackStock
                      ? "border-primary bg-primary/5 shadow-xs ring-1 ring-primary/30"
                      : "border-border/70 hover:border-border hover:bg-muted/30",
                  )}>
                  <div
                    className={cn(
                      "flex size-10 shrink-0 items-center justify-center rounded-lg mt-0.5",
                      trackStock
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground",
                    )}>
                    <BoxIcon name="archive" className="text-xl" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-foreground text-sm sm:text-base">
                        Sim, tenho produtos a pronta entrega
                      </span>
                      <span className="text-[11px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                        Recomendado
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                      O Zelo controla as quantidades disponíveis, permite dar
                      entrada de mercadorias e alerta quando o estoque estiver
                      baixo.
                    </p>
                  </div>
                </div>

                {/* Opção 2: Sem estoque */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setTrackStock(false)}
                  onKeyDown={(e) => e.key === "Enter" && setTrackStock(false)}
                  className={cn(
                    "relative flex cursor-pointer items-start gap-4 rounded-xl border p-4.5 transition-all",
                    !trackStock
                      ? "border-primary bg-primary/5 shadow-xs ring-1 ring-primary/30"
                      : "border-border/70 hover:border-border hover:bg-muted/30",
                  )}>
                  <div
                    className={cn(
                      "flex size-10 shrink-0 items-center justify-center rounded-lg mt-0.5",
                      !trackStock
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground",
                    )}>
                    <BoxIcon name="notepad" className="text-xl" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <span className="font-semibold text-foreground text-sm sm:text-base">
                      Não, vendo sob encomenda ou catálogo
                    </span>
                    <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                      Ideal para consultoras de revista (Avon, Natura, etc.) que
                      não mantêm estoque físico. As contagens de estoque serão
                      ocultadas do sistema para simplificar o seu dia a dia.
                    </p>
                  </div>
                </div>
              </div>

              {/* Sub-configuração condicional para estoque */}
              {trackStock && (
                <div className="rounded-xl border border-border/70 bg-muted/30 p-4 space-y-3 animate-in fade-in-50 duration-150">
                  <div className="flex items-center justify-between gap-3">
                    <div className="space-y-0.5 pr-2">
                      <Label
                        id="toggle-block-out-of-stock-label"
                        className="text-sm font-medium">
                        Bloquear venda com estoque zerado
                      </Label>
                      <p id="toggle-block-out-of-stock-desc" className="text-xs text-muted-foreground">
                        Se ativado, impede finalizar a venda de produtos sem
                        saldo. Se desativado, apenas exibe um aviso amigável.
                      </p>
                    </div>
                    <Switch
                      id="toggle-block-out-of-stock"
                      aria-labelledby="toggle-block-out-of-stock-label"
                      aria-describedby="toggle-block-out-of-stock-desc"
                      checked={blockOutOfStock}
                      onCheckedChange={setBlockOutOfStock}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ============================================================== */}
          {/* ETAPA 2: VENDAS & COBRANÇA */}
          {/* ============================================================== */}
          {step === 2 && (
            <div className="space-y-6 animate-in fade-in-50 duration-200">
              <div className="space-y-1.5 text-left">
                <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary uppercase tracking-wider mb-1">
                  <BoxIcon name="cart" className="text-sm" />
                  Dinâmica de Vendas
                </div>
                <h2 className="text-2xl font-bold tracking-tight">
                  Como é sua rotina de vendas?
                </h2>
                <p className="text-sm text-muted-foreground">
                  Personalize a identificação dos clientes e as formas de
                  recebimento padrão.
                </p>
              </div>

              {/* Pergunta: Vínculo de cliente */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold text-foreground">
                  Identificação do Cliente
                </Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setRequireClient(false)}
                    onKeyDown={(e) =>
                      e.key === "Enter" && setRequireClient(false)
                    }
                    className={cn(
                      "flex cursor-pointer flex-col gap-1.5 rounded-xl border p-4 text-left transition-all",
                      !requireClient
                        ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                        : "border-border/70 hover:bg-muted/30",
                    )}>
                    <span className="font-semibold text-sm text-foreground flex items-center gap-1.5">
                      <BoxIcon name="bolt" className="text-primary text-base" />
                      Vendas Rápidas
                    </span>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Permite vender para &quot;Consumidor Final&quot; sem
                      precisar cadastrar cliente a cada pedido.
                    </p>
                  </div>

                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setRequireClient(true)}
                    onKeyDown={(e) =>
                      e.key === "Enter" && setRequireClient(true)
                    }
                    className={cn(
                      "flex cursor-pointer flex-col gap-1.5 rounded-xl border p-4 text-left transition-all",
                      requireClient
                        ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                        : "border-border/70 hover:bg-muted/30",
                    )}>
                    <span className="font-semibold text-sm text-foreground flex items-center gap-1.5">
                      <BoxIcon
                        name="user-pin"
                        className="text-primary text-base"
                      />
                      Cliente Obrigatório
                    </span>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Exige vincular um cliente a cada venda. Excelente para
                      fiado, carnê e controle de saldo devedor.
                    </p>
                  </div>
                </div>
              </div>

              {/* Pergunta: Forma de Pagamento Principal */}
              <div className="space-y-3 pt-2 border-t border-border/60">
                <Label className="text-sm font-semibold text-foreground">
                  Principal Forma de Pagamento
                </Label>
                <p className="text-xs text-muted-foreground">
                  Qual método você quer que já venha selecionado automaticamente
                  ao abrir uma nova venda?
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {[
                    { id: "PIX", label: "Pix", icon: "qr-scan" },
                    { id: "DINHEIRO", label: "Dinheiro", icon: "money" },
                    {
                      id: "CARTAO_DE_CREDITO",
                      label: "Crédito",
                      icon: "credit-card",
                    },
                    {
                      id: "CARTAO_DEBITO",
                      label: "Débito",
                      icon: "credit-card-front",
                    },
                  ].map((pm) => {
                    const isSelected = defaultPaymentMethod === pm.id;
                    return (
                      <button
                        key={pm.id}
                        type="button"
                        onClick={() => setDefaultPaymentMethod(pm.id)}
                        className={cn(
                          "flex flex-col items-center justify-center gap-1.5 rounded-xl border p-3 text-center transition-all cursor-pointer",
                          isSelected
                            ? "border-primary bg-primary/10 font-semibold text-primary ring-1 ring-primary/30"
                            : "border-border/70 bg-background hover:bg-muted/40 text-muted-foreground",
                        )}>
                        <BoxIcon name={pm.icon} className="text-xl" />
                        <span className="text-xs">{pm.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Pergunta: Status Padrão */}
              <div className="space-y-3 pt-2 border-t border-border/60">
                <Label className="text-sm font-semibold text-foreground">
                  Quando você costuma receber o pagamento?
                </Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setDefaultSaleStatus(SaleStatus.PAGO)}
                    onKeyDown={(e) =>
                      e.key === "Enter" && setDefaultSaleStatus(SaleStatus.PAGO)
                    }
                    className={cn(
                      "flex cursor-pointer items-center justify-between rounded-xl border p-3.5 transition-all",
                      defaultSaleStatus === SaleStatus.PAGO
                        ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                        : "border-border/70 hover:bg-muted/30",
                    )}>
                    <div className="space-y-0.5">
                      <div className="font-semibold text-sm text-foreground">
                        No ato da venda (Pago)
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Recebimento à vista ou imediato.
                      </div>
                    </div>
                    {defaultSaleStatus === SaleStatus.PAGO && (
                      <BoxIcon
                        name="check-circle"
                        className="text-primary text-lg"
                      />
                    )}
                  </div>

                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setDefaultSaleStatus(SaleStatus.PENDENTE)}
                    onKeyDown={(e) =>
                      e.key === "Enter" &&
                      setDefaultSaleStatus(SaleStatus.PENDENTE)
                    }
                    className={cn(
                      "flex cursor-pointer items-center justify-between rounded-xl border p-3.5 transition-all",
                      defaultSaleStatus === SaleStatus.PENDENTE
                        ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                        : "border-border/70 hover:bg-muted/30",
                    )}>
                    <div className="space-y-0.5">
                      <div className="font-semibold text-sm text-foreground">
                        Recebo depois (Pendente)
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Entrego o pedido para cobrar no fiado/ciclo.
                      </div>
                    </div>
                    {defaultSaleStatus === SaleStatus.PENDENTE && (
                      <BoxIcon
                        name="check-circle"
                        className="text-primary text-lg"
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* ETAPA 3: CATÁLOGO & CONTATO */}
          {/* ============================================================== */}
          {step === 3 && (
            <div className="space-y-6 animate-in fade-in-50 duration-200">
              <div className="space-y-1.5 text-left">
                <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary uppercase tracking-wider mb-1">
                  <BoxIcon name="slider" className="text-sm" />
                  Visual & Detalhes
                </div>
                <h2 className="text-2xl font-bold tracking-tight">
                  Preferências do Catálogo
                </h2>
                <p className="text-sm text-muted-foreground">
                  Ajuste o visual do seu catálogo e informe seus dados de
                  contato para os recibos.
                </p>
              </div>



              {/* Imagens dos Produtos */}
              <div className="rounded-xl border border-border/70 p-4 space-y-1">
                <div className="flex items-center justify-between gap-3">
                  <div className="space-y-0.5 pr-2">
                    <Label
                      id="toggle-show-images-label"
                      className="text-sm font-medium">
                      Exibir fotos dos produtos
                    </Label>
                    <p id="toggle-show-images-desc" className="text-xs text-muted-foreground">
                      Mostra miniaturas dos produtos nas listas e tela de vendas
                      para fácil identificação visual.
                    </p>
                  </div>
                  <Switch
                    id="toggle-show-images"
                    aria-labelledby="toggle-show-images-label"
                    aria-describedby="toggle-show-images-desc"
                    checked={showProductImages}
                    onCheckedChange={setShowProductImages}
                  />
                </div>
              </div>

              {/* Telefone / WhatsApp da Loja */}
              <div className="space-y-2 pt-2 border-t border-border/60">
                <Label
                  htmlFor="onboarding-phone"
                  className="text-sm font-semibold text-foreground">
                  WhatsApp para Contato nos Comprovantes
                </Label>
                <Input
                  id="onboarding-phone"
                  type="tel"
                  placeholder="(00) 00000-0000"
                  value={storePhone}
                  onChange={(e) => setStorePhone(maskPhone(e.target.value))}
                  maxLength={15}
                  className="h-11 rounded-xl bg-background/50 border-border/60"
                />
                <p className="text-xs text-muted-foreground">
                  Este número será impresso no rodapé dos recibos e cupons
                  compartilhados com seus clientes.
                </p>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* ETAPA 4: RESUMO & CONCLUSÃO */}
          {/* ============================================================== */}
          {step === 4 && (
            <div className="space-y-6 animate-in fade-in-50 duration-200">
              <div className="space-y-1.5 text-left">
                <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1">
                  <BoxIcon name="check-double" className="text-sm" />
                  Pronto para Decolar
                </div>
                <h2 className="text-2xl font-bold tracking-tight">
                  Tudo pronto, {ownerName.split(" ")[0]}!
                </h2>
                <p className="text-sm text-muted-foreground">
                  Revisamos as configurações iniciais da sua loja. Você poderá
                  ajustar qualquer uma delas a qualquer momento na aba de
                  Configurações.
                </p>
              </div>

              {/* Card de Resumo Elegante */}
              <div className="rounded-xl border border-border/70 bg-muted/20 p-5 space-y-3.5">
                <div className="flex items-center justify-between border-b border-border/50 pb-2.5">
                  <span className="text-sm font-medium text-muted-foreground">
                    Loja
                  </span>
                  <span className="text-sm font-semibold text-foreground">
                    {storeName}
                  </span>
                </div>

                <div className="flex items-center justify-between border-b border-border/50 pb-2.5">
                  <span className="text-sm font-medium text-muted-foreground">
                    Controle de Estoque
                  </span>
                  <span className="text-sm font-semibold flex items-center gap-1.5 text-foreground">
                    <span
                      className={cn(
                        "size-2 rounded-full",
                        trackStock ? "bg-emerald-500" : "bg-zinc-400",
                      )}
                    />
                    {trackStock
                      ? blockOutOfStock
                        ? "Ativado (Bloqueia sem saldo)"
                        : "Ativado (Alerta com aviso)"
                      : "Desativado (Sob encomenda)"}
                  </span>
                </div>

                <div className="flex items-center justify-between border-b border-border/50 pb-2.5">
                  <span className="text-sm font-medium text-muted-foreground">
                    Venda para Consumidor Final
                  </span>
                  <span className="text-sm font-semibold text-foreground">
                    {requireClient
                      ? "Bloqueado (Cliente Obrigatório)"
                      : "Permitido (Venda Rápida)"}
                  </span>
                </div>

                <div className="flex items-center justify-between border-b border-border/50 pb-2.5">
                  <span className="text-sm font-medium text-muted-foreground">
                    Pagamento Padrão
                  </span>
                  <span className="text-sm font-semibold text-foreground">
                    {defaultPaymentMethod}
                  </span>
                </div>

                <div className="flex items-center justify-between border-b border-border/50 pb-2.5">
                  <span className="text-sm font-medium text-muted-foreground">
                    Status Padrão
                  </span>
                  <span className="text-sm font-semibold text-foreground">
                    {defaultSaleStatus === SaleStatus.PAGO
                      ? "Pago na entrega"
                      : "Pendente (Fiado)"}
                  </span>
                </div>

              </div>

              <div className="rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-900/40 p-4 flex items-start gap-3">
                <BoxIcon
                  name="info-circle"
                  className="text-xl text-blue-600 dark:text-blue-400 shrink-0 mt-0.5"
                />
                <p className="text-xs text-blue-900/80 dark:text-blue-200/80 leading-relaxed">
                  Criamos automaticamente para você o cliente{" "}
                  <strong>&quot;Consumidor Final&quot;</strong> e a categoria{" "}
                  <strong>&quot;Geral&quot;</strong>
                  para você começar a cadastrar e vender imediatamente!
                </p>
              </div>
            </div>
          )}

          {/* Botões de Ação do Rodapé */}
          <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-3 pt-6 mt-6 border-t border-border/60">
            {step > 1 ? (
              <Button
                type="button"
                variant="outline"
                onClick={handleBack}
                disabled={saving}
                className="h-11 px-5 rounded-xl cursor-pointer w-full sm:w-auto">
                <BoxIcon name="left-arrow-alt" className="mr-1 text-lg" />
                Voltar
              </Button>
            ) : (
              <div />
            )}

            {step < 4 ? (
              <Button
                type="button"
                onClick={handleNext}
                disabled={saving}
                className="h-11 px-6 rounded-xl font-semibold shadow-md shadow-primary/20 cursor-pointer w-full sm:w-auto sm:ml-auto">
                {saving ? (
                  <>
                    <BoxIcon
                      name="loader-alt"
                      className="mr-2 text-lg bx-spin"
                    />
                    Salvando...
                  </>
                ) : (
                  <>
                    Avançar
                    <BoxIcon name="right-arrow-alt" className="ml-1 text-lg" />
                  </>
                )}
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleFinish}
                disabled={saving}
                className="h-11 sm:h-12 px-5 sm:px-7 rounded-xl font-bold text-sm sm:text-base bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-600/20 active:scale-[0.98] transition-all cursor-pointer w-full sm:w-auto sm:ml-auto shrink min-w-0">
                {saving ? (
                  <>
                    <BoxIcon
                      name="loader-alt"
                      className="mr-2 text-lg sm:text-xl bx-spin shrink-0"
                    />
                    <span className="truncate">Concluindo...</span>
                  </>
                ) : (
                  <>
                    <span className="truncate">Concluir e Começar</span>
                    <BoxIcon name="check" className="ml-2 text-lg sm:text-xl font-bold shrink-0" />
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
