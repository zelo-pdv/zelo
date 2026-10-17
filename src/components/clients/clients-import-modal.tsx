import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { BoxIcon } from "@/components/ui/box-icon";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter } from "@/components/ui/drawer";
import { cn } from "@/lib/utils";
import { uploadData } from "@/services/upload.service";
import { handleDownloadClientTemplate } from "@/lib/export";
import { notifyLocalSync } from "@/hooks/use-data-sync";
import { useIsMobile } from "@/hooks/use-mobile";

export function ClientsImportModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const isMobile = useIsMobile();
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [fileHeaders, setFileHeaders] = useState<string[]>([]);
  const [importResult, setImportResult] = useState<{ total: number; inserted: number; errors: string[] } | null>(null);

  const resetForm = () => {
    setImportFile(null);
    setParsedRows([]);
    setFileHeaders([]);
    setImportResult(null);
  };

  const handleClose = () => {
    if (isImporting) return;
    onClose();
  };

  useEffect(() => {
    if (!isOpen) {
      const timer = setTimeout(() => {
        resetForm();
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFile(file);
    setImportResult(null);

    const Papa = (await import("papaparse")).default;
    Papa.parse(file, {
      header: true,
      skipEmptyLines: "greedy",
      complete: (results) => {
        setParsedRows(results.data);
        setFileHeaders(results.meta.fields || []);
      },
      error: () => {
        toast.error("Erro ao ler arquivo CSV.");
      },
    });
  };

  const handleUploadClick = () => {
    document.getElementById("csv-upload-clients")?.click();
  };

  const handleImportData = async () => {
    if (!importFile || parsedRows.length === 0) return;
    setIsImporting(true);
    try {
      const result = await uploadData("import/clients", {
        items: parsedRows,
        headers: fileHeaders,
      });

      const inserted = result.importedCount ?? 0;
      const errors = result.errors ?? [];

      if (errors.length === 0 && inserted > 0) {
        toast.success(`${inserted} cliente(s) importado(s) com sucesso!`);
        notifyLocalSync("clients");
        handleClose();
      } else {
        setImportResult({
          total: result.totalReceived ?? parsedRows.length,
          inserted,
          errors,
        });
        toast.error("O arquivo contém erros de validação e nenhum cliente foi importado.");
      }
    } catch (error: any) {
      const errorList = Array.isArray(error.errors) && error.errors.length > 0
        ? error.errors
        : [error.message || "Erro durante a importação."];

      setImportResult({
        total: parsedRows.length,
        inserted: 0,
        errors: errorList,
      });
      toast.error(error.message || "Erro durante a importação.");
    } finally {
      setIsImporting(false);
    }
  };

  const bodyContent = (
    <>
      <div className="rounded-xl bg-muted/50 p-3 sm:p-3.5 text-xs text-muted-foreground space-y-2 border border-border/40">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <p className="font-semibold text-foreground flex items-center gap-1.5">
            <BoxIcon name="info-circle" className="text-sm text-foreground" />
            Instruções:
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleDownloadClientTemplate}
            className="h-7 text-xs gap-1.5 rounded-lg border-primary/30 text-primary hover:bg-primary/10 hover:text-primary font-medium"
          >
            <BoxIcon name="download" className="text-sm" />
            Baixar Modelo Oficial (.csv)
          </Button>
        </div>
        <p>1. Utilize o modelo oficial .csv disponibilizado para preencher seus clientes e evitar divergências de colunas.</p>
        <p>
          2. Campo obrigatório: <strong className="text-foreground">Nome</strong>. Para integridade dos dados, a planilha deve incluir ao menos uma coluna adicional de contato ou endereço (Telefone, E-mail, CEP, etc.).
        </p>
        <p>
          3. <strong className="text-foreground">Unicidade:</strong> E-mails e telefones são validados de forma única por loja. Se já existirem cadastrados ou se houver duplicatas no arquivo, a importação inteira será recusada.
        </p>
        <p>
          4. O sistema adota integridade total: se qualquer linha ou coluna contiver erro, nenhum cliente será salvo no banco de dados.
        </p>
      </div>

      <div className="flex flex-col items-center justify-center border-2 border-dashed border-border/60 rounded-xl p-8 bg-muted/20 hover:bg-muted/40 transition-colors">
        <input
          type="file"
          accept=".csv"
          className="hidden"
          id="csv-upload-clients"
          onChange={handleFileChange}
        />
        <Button
          type="button"
          variant="outline"
          onClick={handleUploadClick}
          className="mb-3 rounded-xl"
        >
          <BoxIcon name="search" className="mr-2 text-base" />
          Procurar Arquivo CSV
        </Button>
        {importFile ? (
          <div className="flex items-center gap-2 text-sm text-primary font-medium">
            <BoxIcon name="file" className="text-lg" />
            <span className="truncate max-w-[200px]">{importFile.name}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                resetForm();
              }}
              className="ml-2 text-muted-foreground hover:text-destructive"
            >
              <BoxIcon name="x" />
            </button>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">Nenhum arquivo selecionado</span>
        )}
      </div>

      {parsedRows.length > 0 && !importResult && (
        <div className="rounded-xl border border-border/70 p-3 flex items-center justify-between bg-primary/5">
          <span className="text-sm font-medium">{parsedRows.length} linhas detectadas</span>
          <BoxIcon name="check-circle" className="text-primary text-xl" />
        </div>
      )}

      {importResult && (
        <div className="space-y-3">
          <div
            className={cn(
              "rounded-xl border p-4",
              importResult.errors.length === 0
                ? "border-green-500/50 bg-green-500/10"
                : "border-destructive/50 bg-destructive/10"
            )}
          >
            <div className="flex items-start gap-3">
              {importResult.errors.length === 0 ? (
                <BoxIcon name="check-circle" className="text-green-500 text-xl shrink-0 mt-0.5" />
              ) : (
                <BoxIcon name="error-circle" className="text-destructive text-xl shrink-0 mt-0.5" />
              )}
              <div>
                <p
                  className={cn(
                    "font-semibold text-sm",
                    importResult.errors.length === 0
                      ? "text-green-600 dark:text-green-400"
                      : "text-destructive"
                  )}
                >
                  {importResult.errors.length === 0
                    ? "Importação Concluída com Sucesso"
                    : "Falha na Importação (Nenhum cliente foi salvo)"}
                </p>
                <p className="text-xs mt-1 opacity-90">
                  Total analisado: {importResult.total} | Importados: {importResult.inserted} | Erros:{" "}
                  {importResult.errors.length}
                </p>
              </div>
            </div>
          </div>

          {importResult.errors.length > 0 && (
            <div className="rounded-xl border border-border/70 overflow-hidden">
              <div className="bg-muted px-3 py-2 border-b border-border/70 text-xs font-semibold flex items-center justify-between">
                <span>Relatório Detalhado de Erros ({importResult.errors.length})</span>
                <span className="text-[10px] text-muted-foreground font-normal">Corrija o arquivo e tente novamente</span>
              </div>
              <div className="max-h-48 overflow-y-auto p-3 text-xs text-destructive space-y-1 bg-destructive/5">
                {importResult.errors.map((err, i) => (
                  <p key={i} className="break-words">
                    • {err}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );

  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={(open) => !open && handleClose()} blur>
        <DrawerContent className="max-h-[90dvh] flex flex-col p-4 overflow-hidden">
          <DrawerHeader className="px-0 pb-2 text-center shrink-0">
            <DrawerTitle className="text-base font-semibold flex items-center justify-center gap-2">
              <BoxIcon name="upload" className="text-xl text-foreground shrink-0" />
              <span>Importar Clientes via CSV</span>
            </DrawerTitle>
          </DrawerHeader>

          <div className="flex-1 min-h-0 overflow-y-auto space-y-4 py-2 pr-1 -mr-1">
            {bodyContent}
          </div>

          <DrawerFooter className="px-0 pt-3 pb-0 mt-auto border-t border-border/40 flex flex-col gap-2 shrink-0">
            <Button
              type="button"
              onClick={handleImportData}
              disabled={!importFile || parsedRows.length === 0 || isImporting}
              className="w-full rounded-xl gap-2 font-medium"
            >
              {isImporting ? (
                <>
                  <BoxIcon name="loader-alt" className="bx-spin text-base" />
                  Importando...
                </>
              ) : (
                <>
                  <BoxIcon name="check" className="text-base" />
                  Confirmar Importação
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isImporting}
              className="w-full rounded-xl"
            >
              Cancelar
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="w-[calc(100vw-1.5rem)] sm:max-w-xl max-h-[90dvh] flex flex-col p-4 sm:p-6 overflow-hidden rounded-2xl sm:rounded-xl">
        <DialogHeader className="shrink-0 pb-1">
          <DialogTitle className="text-base sm:text-lg font-semibold flex items-center gap-2">
            <BoxIcon name="upload" className="text-xl text-foreground shrink-0" />
            <span className="truncate">Importar Clientes via CSV</span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto space-y-4 py-2 pr-1 -mr-1">
          {bodyContent}
        </div>

        <DialogFooter className="shrink-0 pt-4 border-t border-border/40 sm:border-0 sm:pt-2 mt-2 gap-2 sm:gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isImporting}
            className="w-full sm:w-auto rounded-xl sm:rounded-lg"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleImportData}
            disabled={!importFile || parsedRows.length === 0 || isImporting}
            className="w-full sm:w-auto rounded-xl sm:rounded-lg gap-2"
          >
            {isImporting ? (
              <>
                <BoxIcon name="loader-alt" className="bx-spin text-base" />
                Importando...
              </>
            ) : (
              <>
                <BoxIcon name="check" className="text-base sm:text-sm" />
                Confirmar Importação
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
