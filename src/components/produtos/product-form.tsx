"use client";

import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LoadingButton } from "@/components/ui/loading-button";
import { Switch } from "@/components/ui/switch";
import { BoxIcon } from "@/components/ui/box-icon";
import { useIsMobile } from "@/hooks/use-mobile";
import { FormState, FormVariantState } from "@/app/(auth)/produtos/page";
import { ProductFrontend } from "@/app/(auth)/produtos/columns";
import { Category } from "@/prisma/client";
import { Unit } from "@/services/units.service";
import { storageService } from "@/services/storage.service";
import { BarcodeScanner } from "@/components/barcode-scanner";
import { useSettingsStore } from "@/store/useSettingsStore";
import { ChevronDown, ChevronRight, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function ProductForm({
  open,
  onOpenChange,
  initial,
  isEdit,
  categories,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial: FormState;
  isEdit: boolean;
  categories: Category[];
  units?: Unit[];
  productId?: string;
  products?: ProductFrontend[];
  onSubmit: (data: FormState) => Promise<void>;
}) {
  const isMobile = useIsMobile();
  const productsSettings = useSettingsStore((s) => s.products);
  const [form, setForm] = useState<FormState>(initial);
  const [busy, setBusy] = useState(false);
  const [imagePreview, setImagePreview] = useState<string>(initial.image || "");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [isMoreInfoOpen, setIsMoreInfoOpen] = useState(false);
  const [isStockOpen, setIsStockOpen] = useState(false);
  const [isVariantsOpen, setIsVariantsOpen] = useState(
    isEdit ? initial.hasVariants : false,
  );
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setForm(initial);
      setImagePreview(initial.image || "");
      setImageFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (cameraInputRef.current) cameraInputRef.current.value = "";
      setIsVariantsOpen(initial.hasVariants);

      if (isEdit) {
        if (
          initial.categoryId ||
          initial.code ||
          initial.barcode ||
          initial.description ||
          initial.costPrice > 0 ||
          initial.notes
        ) {
          setIsMoreInfoOpen(true);
        }
        if (initial.stock > 0 || initial.minStock > 0) {
          setIsStockOpen(true);
        }
      }
    }
  }, [open, initial, isEdit]);

  const updateField = (k: keyof FormState, v: any) => {
    setForm((f) => ({ ...f, [k]: v }));
  };

  const toTitleCase = (str: string) =>
    str.replace(/(?:^|\s)\S/g, (c) => c.toUpperCase());

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateField("name", toTitleCase(e.target.value));
  };

  const handleNumberChange = (k: keyof FormState, v: string) => {
    const val = parseFloat(v.replace(",", "."));
    updateField(k, isNaN(val) ? 0 : val);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Selecione um arquivo de imagem válido.");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 2MB.");
      return;
    }

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleRemoveImage = () => {
    setImagePreview("");
    setImageFile(null);
    updateField("image", "");
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || form.salePrice <= 0) {
      toast.error("Nome e preço de venda são obrigatórios.");
      return;
    }

    if (form.hasVariants && form.variants.length === 0) {
      toast.error("Adicione pelo menos uma variação.");
      return;
    }

    setBusy(true);
    try {
      let finalImageUrl = form.image;
      if (imageFile) {
        setUploadingImage(true);
        const res = await storageService.uploadProductImage(imageFile);
        finalImageUrl = res.url;
      }

      const finalData = { ...form, image: finalImageUrl };
      await onSubmit(finalData);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao salvar produto.");
    } finally {
      setBusy(false);
      setUploadingImage(false);
    }
  };

  const addVariant = () => {
    setForm((f) => ({
      ...f,
      variants: [
        ...f.variants,
        {
          name: "",
          code: "",
          barcode: "",
          attributes: {},
          costPrice: null,
          salePrice: null,
          stock: 0,
          minStock: 0,
          image: "",
        },
      ],
    }));
  };

  const updateVariant = (
    index: number,
    field: keyof FormVariantState,
    value: any,
  ) => {
    setForm((f) => {
      const newVariants = [...f.variants];
      newVariants[index] = { ...newVariants[index], [field]: value };
      return { ...f, variants: newVariants };
    });
  };

  const removeVariant = (index: number) => {
    setForm((f) => ({
      ...f,
      variants: f.variants.filter((_, i) => i !== index),
    }));
  };

  const inputClass =
    "h-11 rounded-xl text-sm sm:text-base px-4 bg-muted/40 border border-transparent focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring focus-visible:bg-background transition-colors";

  const Content = (
    <form
      onSubmit={handleSave}
      className="flex flex-col flex-1 min-h-0 overflow-hidden">
      {/* Scrollable Form Body */}
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-6">
        <div className="space-y-6 max-w-full pb-6">
          {/* SEÇÃO 1: Informações Essenciais */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm sm:text-base font-semibold">
                  Nome do Produto <span className="text-destructive">*</span>
                </Label>
                <Input
                  className={inputClass}
                  value={form.name}
                  onChange={handleNameChange}
                  placeholder="Ex: Perfume Floratta"
                  required
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm sm:text-base font-semibold">
                  Preço de Venda <span className="text-destructive">*</span>
                </Label>
                <div className="relative flex items-center">
                  <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground select-none">
                    R$
                  </span>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    className={cn(inputClass, "pl-11")}
                    value={form.salePrice || ""}
                    onChange={(e) =>
                      handleNumberChange("salePrice", e.target.value)
                    }
                    placeholder="0,00"
                    required
                  />
                </div>
              </div>
            </div>
          </div>

          <hr className="border-border/50" />

          {/* SEÇÃO 2: Mais Informações */}
          <div className="space-y-3">
            <Button
              type="button"
              variant="ghost"
              className="w-full justify-between hover:bg-muted/50 p-3.5 sm:p-4 h-auto rounded-xl"
              onClick={() => setIsMoreInfoOpen(!isMoreInfoOpen)}>
              <div className="flex flex-col items-start gap-0.5 text-left min-w-0 flex-1 pr-2">
                <span className="font-semibold text-sm sm:text-base">
                  Mais Informações
                </span>
                <span className="text-xs sm:text-sm text-muted-foreground font-normal">
                  Categoria, custos, códigos e imagem
                </span>
              </div>
              {isMoreInfoOpen ? (
                <ChevronDown className="h-5 w-5 text-muted-foreground shrink-0" />
              ) : (
                <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
              )}
            </Button>

            {isMoreInfoOpen && (
              <div className="space-y-4 px-1 pt-2 pb-2 animate-in slide-in-from-top-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Categoria</Label>
                    <Select
                      value={form.categoryId || ""}
                      onValueChange={(v) => updateField("categoryId", v)}>
                      <SelectTrigger
                        className={cn(inputClass, "w-full justify-between")}>
                        <SelectValue placeholder="Selecione uma categoria">
                          {
                            categories.find((c) => c.id === form.categoryId)
                              ?.name
                          }
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {!productsSettings?.hideCostPrice && (
                    <div className="space-y-2">
                      <Label>Preço de Custo</Label>
                      <div className="relative flex items-center">
                        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground select-none">
                          R$
                        </span>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          className={cn(inputClass, "pl-11")}
                          value={form.costPrice || ""}
                          onChange={(e) =>
                            handleNumberChange("costPrice", e.target.value)
                          }
                          placeholder="0,00"
                        />
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>Código Interno (SKU)</Label>
                    <Input
                      className={inputClass}
                      value={form.code}
                      placeholder="Ex: PROD-001"
                      onChange={(e) => updateField("code", e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Código de Barras</Label>
                    <div className="flex gap-2">
                      <Input
                        className={cn(inputClass, "flex-1 min-w-0")}
                        value={form.barcode}
                        placeholder="EAN-13 ou código de barras"
                        onChange={(e) =>
                          updateField(
                            "barcode",
                            e.target.value.replace(/\D/g, ""),
                          )
                        }
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="shrink-0 h-11 w-11 rounded-xl"
                        onClick={() => setIsScannerOpen(true)}
                        title="Escanear código de barras">
                        <BoxIcon name="barcode-reader" />
                      </Button>
                    </div>
                  </div>

                  <div className="col-span-1 sm:col-span-2 space-y-2">
                    <Label>Descrição</Label>
                    <Textarea
                      className="rounded-xl bg-muted/40 border border-transparent focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring focus-visible:bg-background resize-none min-h-17.5"
                      rows={2}
                      placeholder="Breve descrição do produto..."
                      value={form.description}
                      onChange={(e) =>
                        updateField("description", e.target.value)
                      }
                    />
                  </div>

                  <div className="col-span-1 sm:col-span-2 space-y-2">
                    <Label>Observações</Label>
                    <Textarea
                      className="rounded-xl bg-muted/40 border border-transparent focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring focus-visible:bg-background resize-none min-h-17.5"
                      rows={2}
                      placeholder="Observações internas..."
                      value={form.notes}
                      onChange={(e) => updateField("notes", e.target.value)}
                    />
                  </div>

                  <div className="col-span-1 sm:col-span-2 space-y-2">
                    <Label>Imagem do Produto</Label>
                    <div className="flex flex-col gap-3">
                      {imagePreview && (
                        <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-xl overflow-hidden border border-border shrink-0">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={imagePreview}
                            alt="Prévia do produto"
                            className="w-full h-full object-cover"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="absolute top-1.5 right-1.5 h-6 w-6 rounded-full shadow-sm"
                            onClick={handleRemoveImage}
                            title="Remover foto">
                            <BoxIcon name="x" className="text-xs" />
                          </Button>
                        </div>
                      )}
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          className="rounded-xl h-11"
                          disabled={busy}
                          onClick={() => fileInputRef.current?.click()}>
                          <BoxIcon
                            name="image-add"
                            className="mr-2 text-base"
                          />{" "}
                          Escolher Foto
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          className="rounded-xl h-11"
                          disabled={busy}
                          onClick={() => cameraInputRef.current?.click()}>
                          <BoxIcon name="camera" className="mr-2 text-base" />{" "}
                          Tirar Foto
                        </Button>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        ref={fileInputRef}
                        onChange={handleImageChange}
                      />
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        ref={cameraInputRef}
                        onChange={handleImageChange}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* SEÇÃO 3: Controle de Estoque */}
          {productsSettings?.trackStock && (
            <>
              <hr className="border-border/50" />
              <div className="space-y-3">
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full justify-between hover:bg-muted/50 p-3.5 sm:p-4 h-auto rounded-xl"
                  onClick={() => setIsStockOpen(!isStockOpen)}>
                  <div className="flex flex-col items-start gap-0.5 text-left min-w-0 flex-1 pr-2">
                    <span className="font-semibold text-sm sm:text-base">
                      Controle de Estoque
                    </span>
                    <span className="text-xs sm:text-sm text-muted-foreground font-normal">
                      Estoque atual e mínimo
                    </span>
                  </div>
                  {isStockOpen ? (
                    <ChevronDown className="h-5 w-5 text-muted-foreground shrink-0" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                  )}
                </Button>

                {isStockOpen && (
                  <div className="space-y-4 px-1 pt-2 pb-2 animate-in slide-in-from-top-2">
                    {form.hasVariants ? (
                      <div className="p-4 bg-muted/40 rounded-xl text-xs sm:text-sm text-muted-foreground border border-border/50">
                        O estoque deste produto é controlado individualmente em
                        cada variação abaixo.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Estoque Atual</Label>
                          <Input
                            type="number"
                            step="0.001"
                            className={inputClass}
                            value={form.stock || ""}
                            onChange={(e) =>
                              handleNumberChange("stock", e.target.value)
                            }
                            placeholder="0"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Estoque Mínimo</Label>
                          <Input
                            type="number"
                            step="0.001"
                            className={inputClass}
                            value={form.minStock || ""}
                            onChange={(e) =>
                              handleNumberChange("minStock", e.target.value)
                            }
                            placeholder="0"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}

          <hr className="border-border/50" />

          {/* SEÇÃO 4: Variações */}
          <div className="space-y-3">
            <Button
              type="button"
              variant="ghost"
              className="w-full justify-between hover:bg-muted/50 p-3.5 sm:p-4 h-auto rounded-xl"
              onClick={() => setIsVariantsOpen(!isVariantsOpen)}>
              <div className="flex flex-col items-start gap-0.5 text-left min-w-0 flex-1 pr-2">
                <span className="font-semibold text-sm sm:text-base">
                  Variações
                </span>
                <span className="text-xs sm:text-sm text-muted-foreground font-normal">
                  Tamanhos, cores, volumes, etc.
                </span>
              </div>
              {isVariantsOpen ? (
                <ChevronDown className="h-5 w-5 text-muted-foreground shrink-0" />
              ) : (
                <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
              )}
            </Button>

            {isVariantsOpen && (
              <div className="space-y-4 px-1 pt-2 pb-2 animate-in slide-in-from-top-2">
                <div className="flex items-center justify-between p-3.5 sm:p-4 bg-muted/30 rounded-xl border border-border/50 gap-3">
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <Label className="text-sm sm:text-base font-medium">
                      Produto com variações?
                    </Label>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Ative para cadastrar diferentes apresentações, tamanhos ou
                      cores.
                    </p>
                  </div>
                  <Switch
                    className="shrink-0"
                    checked={form.hasVariants}
                    onCheckedChange={(v) => {
                      updateField("hasVariants", v);
                      if (v && form.variants.length === 0) addVariant();
                    }}
                  />
                </div>

                {form.hasVariants && (
                  <div className="space-y-4 mt-4">
                    {form.variants.map((v, idx) => (
                      <div
                        key={idx}
                        className="p-4 bg-card border rounded-xl space-y-4 relative shadow-2xs">
                        <div className="flex justify-between items-center">
                          <Label className="text-sm sm:text-base font-semibold">
                            Variação {idx + 1}
                          </Label>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="text-destructive h-8 w-8 hover:bg-destructive/10 shrink-0"
                            onClick={() => removeVariant(idx)}
                            title="Remover variação">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="space-y-2">
                          <Label>
                            Nome da Variação{" "}
                            <span className="text-destructive">*</span>
                          </Label>
                          <Input
                            className={inputClass}
                            placeholder="Ex: 75ml, M / Preto, etc."
                            value={v.name}
                            onChange={(e) =>
                              updateVariant(idx, "name", e.target.value)
                            }
                            required
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Preço de Venda (Opcional)</Label>
                            <div className="relative flex items-center">
                              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground select-none">
                                R$
                              </span>
                              <Input
                                type="number"
                                step="0.01"
                                className={cn(inputClass, "pl-11")}
                                placeholder="Herda o principal"
                                value={v.salePrice || ""}
                                onChange={(e) =>
                                  updateVariant(
                                    idx,
                                    "salePrice",
                                    parseFloat(e.target.value) || null,
                                  )
                                }
                              />
                            </div>
                          </div>

                          {productsSettings?.trackStock && (
                            <div className="space-y-2">
                              <Label>Estoque Atual</Label>
                              <Input
                                type="number"
                                step="1"
                                className={inputClass}
                                value={v.stock || ""}
                                onChange={(e) =>
                                  updateVariant(
                                    idx,
                                    "stock",
                                    parseFloat(e.target.value) || 0,
                                  )
                                }
                                placeholder="0"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    ))}

                    <Button
                      type="button"
                      variant="outline"
                      className="w-full rounded-xl h-11 border-dashed"
                      onClick={addVariant}>
                      <Plus className="h-4 w-4 mr-2" /> Adicionar Variação
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons: Drawer layout on mobile (Salvar on top, Cancelar below) vs Dialog layout on desktop */}
      {isMobile ? (
        <div className="shrink-0 p-4 border-t border-border flex flex-col gap-2 w-full bg-background">
          <LoadingButton
            type="submit"
            loading={busy || uploadingImage}
            className="h-11 w-full rounded-full font-medium">
            Salvar
          </LoadingButton>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={busy}
            className="h-10 w-full rounded-full text-sm font-medium text-muted-foreground hover:text-foreground">
            Cancelar
          </Button>
        </div>
      ) : (
        <div className="p-4 border-t bg-background/95 backdrop-blur-sm flex items-center justify-end gap-3 shrink-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={busy}
            className="rounded-xl h-11 px-5 text-sm font-medium">
            Cancelar
          </Button>
          <LoadingButton
            type="submit"
            loading={busy || uploadingImage}
            className="rounded-xl h-11 px-7 text-sm font-semibold">
            Salvar
          </LoadingButton>
        </div>
      )}

      <BarcodeScanner
        open={isScannerOpen}
        onOpenChange={setIsScannerOpen}
        onScan={(code) => {
          updateField("barcode", code);
          setIsScannerOpen(false);
        }}
      />
    </form>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="h-[94dvh] max-h-[94dvh] p-0 flex flex-col gap-0 overflow-hidden">
          <DrawerHeader className="px-4 py-3.5 border-b shrink-0 text-left">
            <DrawerTitle className="text-lg font-bold">
              {isEdit ? "Editar Produto" : "Novo Produto"}
            </DrawerTitle>
          </DrawerHeader>
          {Content}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl md:max-w-3xl w-full max-h-[90vh] h-[90vh] p-0 flex flex-col gap-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b shrink-0">
          <DialogTitle className="text-xl font-bold">
            {isEdit ? "Editar Produto" : "Novo Produto"}
          </DialogTitle>
        </DialogHeader>
        {Content}
      </DialogContent>
    </Dialog>
  );
}
