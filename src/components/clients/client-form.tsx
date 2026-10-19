"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LoadingButton } from "@/components/ui/loading-button";
import { Client } from "@/prisma/client";
import { ClientWithAddress } from "@/types";
import { maskCep, maskPhone } from "@/lib/masks";
import { Switch } from "@/components/ui/switch";
import { BoxIcon } from "@/components/ui/box-icon";
import { cn } from "@/lib/utils";

// Tipagem segura para o endereço do formulário
export type AddressData = {
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
};

export type ClientFormData = Omit<
  Client,
  "id" | "address" | "lojaId" | "deletedAt"
> & {
  address: AddressData;
};

const parseInitialAddress = (addressProp: any): AddressData => {
  const defaultAddr: AddressData = {
    street: "",
    number: "",
    complement: "",
    neighborhood: "",
    city: "",
    state: "",
    zipCode: "",
  };

  if (!addressProp) return defaultAddr;

  if (Array.isArray(addressProp)) {
    const firstAddress = addressProp[0];

    if (!firstAddress) return defaultAddr;

    return {
      street: firstAddress.street || "",
      number: firstAddress.number || "",
      complement: firstAddress.complement || "",
      neighborhood: firstAddress.neighborhood || "",
      city: firstAddress.city || "",
      state: firstAddress.state || "",
      zipCode: maskCep(firstAddress.zipCode || ""),
    };
  }

  if (typeof addressProp === "string") {
    try {
      const parsed = JSON.parse(addressProp);
      return {
        ...defaultAddr,
        ...parsed,
        zipCode: maskCep(parsed.zipCode || ""),
      };
    } catch {
      return defaultAddr;
    }
  }

  return {
    ...defaultAddr,
    ...addressProp,
    zipCode: maskCep(addressProp.zipCode || ""),
  };
};

export function ClientForm({
  open,
  onOpenChange,
  initial,
  isEdit,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial?: ClientWithAddress;
  isEdit: boolean;
  onSubmit: (data: any) => Promise<void>;
}) {
  const isMobile = useIsMobile();

  const getInitialState = useCallback((): ClientFormData => {
    let initialPhone = initial?.phone || "";
    if (initialPhone.startsWith("+55")) {
      initialPhone = initialPhone.replace(/^\+55/, "");
    }
    return {
      name: initial?.name || "",
      phone: maskPhone(initialPhone),
      email: initial?.email || "",
      address: parseInitialAddress(initial?.address),
      notes: initial?.notes || "",
      active: initial?.active ?? true,
      createdAt: initial?.createdAt || new Date(),
      updatedAt: initial?.updatedAt || new Date(),
    };
  }, [initial]);

  const [form, setForm] = useState<ClientFormData>(getInitialState());
  const [loading, setLoading] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const [isAddressOpen, setIsAddressOpen] = useState(false);

  const buscarCep = async (cep: string) => {
    const cepLimpo = cep.replace(/\D/g, "");

    // Só consulta quando tiver exatamente 8 dígitos
    if (cepLimpo.length !== 8) return;

    setCepLoading(true);

    try {
      const response = await fetch(
        `https://viacep.com.br/ws/${cepLimpo}/json/`,
      );

      if (!response.ok) {
        throw new Error("Erro ao consultar o CEP");
      }

      const data = await response.json();

      if (data.erro) {
        toast.error("CEP não encontrado.");
        return;
      }

      // Preenche automaticamente todos os campos retornados pela API
      setForm((prev) => ({
        ...prev,
        address: {
          ...prev.address,
          street: data.logradouro || "",
          neighborhood: data.bairro || "",
          city: data.localidade || "",
          state: data.uf || "",
          complement: data.complemento || prev.address.complement || "",
        },
      }));

      toast.success("Endereço preenchido automaticamente!");
    } catch (error) {
      console.error("Erro ao buscar CEP:", error);
      toast.error("Não foi possível buscar o CEP.");
    } finally {
      setCepLoading(false);
    }
  };

  const DRAFT_KEY = "@zelo/new-client-draft";
  const LEGACY_DRAFT_KEY = "@zelo-pdv/new-client-draft";

  useEffect(() => {
    if (open) {
      if (isEdit) {
        setForm(getInitialState());
        // Minimizado por padrão; abre apenas se o cliente já tiver endereço preenchido ao editar
        const hasExistingAddress = Boolean(
          initial?.address &&
            (Array.isArray(initial.address)
              ? initial.address.some((a) => a.street || a.city || a.zipCode)
              : (initial.address as any).street || (initial.address as any).city)
        );
        setIsAddressOpen(hasExistingAddress);
      } else {
        setIsAddressOpen(false);
        const draft = localStorage.getItem(DRAFT_KEY) || localStorage.getItem(LEGACY_DRAFT_KEY);
        if (draft) {
          try {
            setForm(JSON.parse(draft));
          } catch {
            setForm(getInitialState());
          }
        } else {
          setForm(getInitialState());
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isEdit]);

  useEffect(() => {
    if (open && !isEdit) {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(form));
    }
  }, [form, open, isEdit]);

  const submit = async () => {
    if (!form.name || form.name.trim().length < 2) {
      toast.error("O nome do cliente deve ter no mínimo 2 caracteres.");
      return;
    }

    // E-mail validation
    if (form.email && form.email.trim() !== "") {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(form.email)) {
        toast.error("Por favor, insira um e-mail válido.");
        return;
      }
    }

    setLoading(true);
    try {
      const rawPhone = form.phone ? form.phone.replace(/\D/g, "") : "";
      const phoneToSave = rawPhone !== "" ? `+55${rawPhone}` : null;

      await onSubmit({
        ...form,
        phone: phoneToSave,
        email: form.email?.trim() === "" ? null : form.email,
        address: form.address,
        active: form.active ?? true,
      });

      if (!isEdit) {
        localStorage.removeItem(DRAFT_KEY);
        localStorage.removeItem(LEGACY_DRAFT_KEY);
      }
    } finally {
      setLoading(false);
    }
  };

  const requiredInputClass =
    "border-primary/50 focus:ring-primary/50 bg-primary/[0.03]";

  const FormFields = (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label required>Nome</Label>
        <Input
          className={requiredInputClass}
          name="name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="Nome completo do cliente"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Telefone / WhatsApp</Label>
          <Input
            name="phone"
            value={form.phone ?? ""}
            onChange={(e) => {
              setForm({ ...form, phone: maskPhone(e.target.value) });
            }}
            placeholder="(00) 00000-0000 "
            autoComplete="off"
            maxLength={15}
          />
        </div>
        <div className="space-y-2">
          <Label>E-mail</Label>
          <Input
            type="email"
            name="email"
            value={form.email ?? ""}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="email@exemplo.com"
            autoComplete="off"
          />
        </div>
      </div>

      <div className="rounded-xl border border-border bg-muted/20 overflow-hidden transition-all">
        <button
          type="button"
          onClick={() => setIsAddressOpen((prev) => !prev)}
          className="flex w-full items-center justify-between p-3.5 text-left cursor-pointer group hover:bg-muted/40 transition-colors"
          aria-expanded={isAddressOpen}
        >
          <div className="flex items-center gap-2">
            <BoxIcon name="map-pin" className="text-base text-muted-foreground group-hover:text-foreground" />
            <h3 className="text-sm font-medium">Endereço</h3>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground group-hover:text-foreground">
            <span>{isAddressOpen ? "Ocultar" : "Adicionar / Ver"}</span>
            <BoxIcon
              name="chevron-down"
              className={cn(
                "text-base transition-transform duration-200",
                isAddressOpen && "rotate-180"
              )}
            />
          </div>
        </button>

        {isAddressOpen && (
          <div className="space-y-3 p-4 pt-0 border-t border-border/50 animate-in fade-in-50 duration-150">
            <div className="col-span-2 space-y-2 pt-3">
              <Label>Logradouro (Rua / Av.)</Label>
              <Input
                placeholder="Ex: Rua das Flores"
                value={form.address.street}
                onChange={(e) =>
                  setForm({
                    ...form,
                    address: { ...form.address, street: e.target.value },
                  })
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label>Número</Label>
                <Input
                  placeholder="Nº 123"
                  value={form.address.number}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      address: { ...form.address, number: e.target.value },
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>CEP</Label>
                <Input
                  placeholder="00000-000"
                  value={form.address.zipCode}
                  maxLength={9}
                  disabled={cepLoading}
                  onChange={(e) => {
                    const value = maskCep(e.target.value);

                    setForm({
                      ...form,
                      address: {
                        ...form.address,
                        zipCode: value,
                      },
                    });

                    // Dispara a busca apenas quando completar os 8 dígitos numéricos
                    if (value.replace(/\D/g, "").length === 8) {
                      buscarCep(value);
                    }
                  }}
                />
                {cepLoading && (
                  <p className="text-xs text-muted-foreground">
                    Buscando endereço...
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Complemento</Label>
              <Input
                placeholder="Apto 12, Bloco A"
                value={form.address.complement}
                onChange={(e) =>
                  setForm({
                    ...form,
                    address: { ...form.address, complement: e.target.value },
                  })
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Bairro</Label>
              <Input
                placeholder="Centro"
                value={form.address.neighborhood}
                onChange={(e) =>
                  setForm({
                    ...form,
                    address: { ...form.address, neighborhood: e.target.value },
                  })
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label>Cidade</Label>
                <Input
                  placeholder="São Paulo"
                  value={form.address.city}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      address: { ...form.address, city: e.target.value },
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Estado</Label>
                <Input
                  placeholder="SP"
                  value={form.address.state}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      address: { ...form.address, state: e.target.value },
                    })
                  }
                />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label>Observações</Label>
        <Textarea
          rows={3}
          value={form.notes ?? ""}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          placeholder="Anotações importantes sobre o cliente..."
        />
      </div>

      <div className="flex items-center justify-between rounded-xl border border-border/70 p-3">
        <div className="space-y-0.5">
          <Label id="client-form-active-label" className="text-sm font-medium">Cliente Ativo</Label>
          <p id="client-form-active-desc" className="text-xs text-muted-foreground">
            Clientes inativos não aparecerão na seleção de novas vendas.
          </p>
        </div>
        <Switch
          checked={form.active ?? true}
          onCheckedChange={(checked) => setForm({ ...form, active: checked })}
          aria-labelledby="client-form-active-label"
          aria-describedby="client-form-active-desc"
        />
      </div>
    </div>
  );

  const ActionButtons = (
    <div className="flex w-full justify-end mt-4">
      <LoadingButton
        loading={loading}
        disabled={form.name.trim().length < 2 || loading}
        onClick={submit}
        className="rounded-xl h-11 px-7 text-sm font-semibold">
        Salvar
      </LoadingButton>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange} blur>
        <DrawerContent className="h-[90vh]">
          <DrawerHeader className="shrink-0 px-4 text-center">
            <DrawerTitle className="text-center">{isEdit ? "Editar cliente" : "Novo cliente"}</DrawerTitle>
          </DrawerHeader>
          <div className="flex min-h-0 flex-1 flex-col px-4 pb-6 overflow-hidden">
            <div className="flex-1 min-h-0 overflow-hidden">
              <ScrollArea className="h-full">
                <div className="pb-4">{FormFields}</div>
              </ScrollArea>
            </div>
            <div className="shrink-0 pt-3 mt-2 flex flex-col gap-2 w-full border-t border-border">
              <LoadingButton
                loading={loading}
                disabled={form.name.trim().length < 2 || loading}
                onClick={submit}
                className="h-11 w-full rounded-full font-medium"
              >
                Salvar
              </LoadingButton>
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                disabled={loading}
                className="h-10 w-full rounded-full text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                Cancelar
              </Button>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} blur>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar cliente" : "Novo cliente"}</DialogTitle>
        </DialogHeader>
        {FormFields}
        <DialogFooter>{ActionButtons}</DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
