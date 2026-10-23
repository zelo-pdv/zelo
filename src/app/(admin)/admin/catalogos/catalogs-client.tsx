"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";
import { BoxIcon } from "@/components/ui/box-icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface BrandOption {
  id: string;
  name: string;
  logoUrl: string | null;
}

interface CatalogItem {
  id: string;
  title: string;
  brandId: string;
  brand: {
    id: string;
    name: string;
    slug: string;
    logoUrl: string | null;
  };
  cycle: string | null;
  description: string | null;
  coverUrl: string | null;
  pdfPath: string | null;
  status: "DRAFT" | "CURATION" | "PUBLISHED" | "ARCHIVED";
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  _count?: {
    products: number;
  };
}

interface GlobalProductOption {
  id: string;
  name: string;
  barcode: string | null;
  referenceSku: string | null;
  suggestedPrice: number | null;
  imageUrl: string | null;
}

export function CatalogsClient() {
  const [catalogs, setCatalogs] = useState<CatalogItem[]>([]);
  const [brands, setBrands] = useState<BrandOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [brandFilter, setBrandFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Modal de Criação / Edição
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCatalog, setEditingCatalog] = useState<CatalogItem | null>(
    null,
  );
  const [title, setTitle] = useState("");
  const [brandId, setBrandId] = useState("");
  const [cycle, setCycle] = useState("");
  const [description, setDescription] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [pdfPath, setPdfPath] = useState("");
  const [status, setStatus] = useState<
    "DRAFT" | "CURATION" | "PUBLISHED" | "ARCHIVED"
  >("DRAFT");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  // Modal de Exclusão
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [catalogToDelete, setCatalogToDelete] = useState<CatalogItem | null>(
    null,
  );
  const [deleting, setDeleting] = useState(false);

  // Modal de Produtos do Catálogo
  const [productsModalOpen, setProductsModalOpen] = useState(false);
  const [selectedCatalog, setSelectedCatalog] = useState<CatalogItem | null>(
    null,
  );
  const [catalogProductsList, setCatalogProductsList] = useState<any[]>([]);
  const [availableProducts, setAvailableProducts] = useState<
    GlobalProductOption[]
  >([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [productPageNumber, setProductPageNumber] = useState("");
  const [productCyclePrice, setProductCyclePrice] = useState("");
  const [addingProduct, setAddingProduct] = useState(false);

  // Modal de Ingestão com IA
  const [ingestionModalOpen, setIngestionModalOpen] = useState(false);
  const [ingestionCatalog, setIngestionCatalog] = useState<CatalogItem | null>(
    null,
  );
  const [activeJob, setActiveJob] = useState<any>(null);
  const [loadingJob, setLoadingJob] = useState(false);
  const [startingIngestion, setStartingIngestion] = useState(false);

  // Busca lista de marcas para selects
  const fetchBrands = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/brands?status=active");
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setBrands(json.data);
      }
    } catch {
      console.warn("Falha ao carregar marcas.");
    }
  }, []);

  // Busca lista de catálogos
  const fetchCatalogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (brandFilter !== "all") params.set("brandId", brandFilter);
      if (statusFilter !== "all") params.set("status", statusFilter);

      const res = await fetch(`/api/admin/catalogs?${params.toString()}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setCatalogs(json.data);
      } else {
        toast.error(json.error || "Erro ao carregar catálogos.");
      }
    } catch {
      toast.error("Erro de conexão ao carregar catálogos.");
    } finally {
      setLoading(false);
    }
  }, [search, brandFilter, statusFilter]);

  useEffect(() => {
    fetchBrands();
  }, [fetchBrands]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCatalogs();
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchCatalogs]);

  const handleOpenCreate = () => {
    setEditingCatalog(null);
    setTitle("");
    setBrandId(brands.length > 0 ? brands[0].id : "");
    setCycle("");
    setDescription("");
    setCoverUrl("");
    setPdfPath("");
    setStatus("DRAFT");
    setStartDate("");
    setEndDate("");
    setDialogOpen(true);
  };

  const handleOpenEdit = (catalog: CatalogItem) => {
    setEditingCatalog(catalog);
    setTitle(catalog.title);
    setBrandId(catalog.brandId);
    setCycle(catalog.cycle || "");
    setDescription(catalog.description || "");
    setCoverUrl(catalog.coverUrl || "");
    setPdfPath(catalog.pdfPath || "");
    setStatus(catalog.status);
    setStartDate(catalog.startDate ? catalog.startDate.substring(0, 10) : "");
    setEndDate(catalog.endDate ? catalog.endDate.substring(0, 10) : "");
    setDialogOpen(true);
  };

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (
      file.type !== "application/pdf" &&
      !file.name.toLowerCase().endsWith(".pdf")
    ) {
      toast.error("Selecione um arquivo PDF válido.");
      return;
    }

    setUploadingPdf(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      if (editingCatalog) {
        formData.append("catalogId", editingCatalog.id);
      }

      const res = await fetch("/api/admin/catalogs/upload-pdf", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();
      if (json.success && json.path) {
        setPdfPath(json.path);
        toast.success(
          "PDF do catálogo enviado com sucesso para o armazenamento seguro.",
        );
      } else {
        toast.error(json.error || "Falha no upload do PDF.");
      }
    } catch {
      toast.error("Erro de conexão no envio do PDF.");
    } finally {
      setUploadingPdf(false);
      if (pdfInputRef.current) pdfInputRef.current.value = "";
    }
  };

  const handleSaveCatalog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("O título do catálogo é obrigatório.");
      return;
    }
    if (!brandId) {
      toast.error("Selecione a marca do catálogo.");
      return;
    }

    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        title: title.trim(),
        brandId,
        cycle: cycle.trim() || null,
        description: description.trim() || null,
        coverUrl: coverUrl.trim() || null,
        pdfPath: pdfPath.trim() || null,
        status,
        startDate: startDate ? new Date(startDate).toISOString() : null,
        endDate: endDate ? new Date(endDate).toISOString() : null,
      };

      const url = editingCatalog
        ? `/api/admin/catalogs/${editingCatalog.id}`
        : "/api/admin/catalogs";
      const method = editingCatalog ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (json.success) {
        toast.success(
          editingCatalog
            ? "Catálogo atualizado com sucesso."
            : "Catálogo cadastrado com sucesso!",
        );
        setDialogOpen(false);
        fetchCatalogs();
      } else {
        toast.error(json.error || "Erro ao salvar catálogo.");
      }
    } catch {
      toast.error("Erro de conexão ao salvar catálogo.");
    } finally {
      setSaving(false);
    }
  };

  const handleOpenPdf = async (catalogId: string) => {
    try {
      toast.loading("Gerando link seguro de visualização...", {
        id: "pdf-load",
      });
      const res = await fetch(`/api/admin/catalogs/${catalogId}/signed-url`);
      const json = await res.json();
      if (json.success && json.data?.signedUrl) {
        toast.dismiss("pdf-load");
        window.open(json.data.signedUrl, "_blank");
      } else {
        toast.error(json.error || "Não foi possível abrir o PDF.", {
          id: "pdf-load",
        });
      }
    } catch {
      toast.error("Erro ao gerar link de visualização.", { id: "pdf-load" });
    }
  };

  const handleDeleteCatalog = async () => {
    if (!catalogToDelete) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/catalogs/${catalogToDelete.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Catálogo excluído com sucesso.");
        setDeleteModalOpen(false);
        setCatalogToDelete(null);
        fetchCatalogs();
      } else {
        toast.error(json.error || "Erro ao excluir catálogo.");
      }
    } catch {
      toast.error("Erro de conexão ao excluir catálogo.");
    } finally {
      setDeleting(false);
    }
  };

  // Abre gerenciador de produtos do catálogo
  const handleOpenProductsModal = async (catalog: CatalogItem) => {
    setSelectedCatalog(catalog);
    setProductsModalOpen(true);
    setLoadingProducts(true);
    try {
      // 1. Busca detalhes com produtos atuais
      const resDetails = await fetch(`/api/admin/catalogs/${catalog.id}`);
      const jsonDetails = await resDetails.json();
      if (jsonDetails.success) {
        setCatalogProductsList(jsonDetails.data.products || []);
      }

      // 2. Busca produtos globais disponíveis dessa marca
      const resProducts = await fetch(
        `/api/admin/global-products?brandId=${catalog.brandId}&limit=100`,
      );
      const jsonProducts = await resProducts.json();
      if (jsonProducts.success && Array.isArray(jsonProducts.data)) {
        setAvailableProducts(jsonProducts.data);
        if (jsonProducts.data.length > 0) {
          setSelectedProductId(jsonProducts.data[0].id);
        }
      }
    } catch {
      toast.error("Erro ao carregar produtos do catálogo.");
    } finally {
      setLoadingProducts(false);
    }
  };

  const handleAddProductToCatalog = async () => {
    if (!selectedCatalog || !selectedProductId) return;

    setAddingProduct(true);
    try {
      const payload = {
        mode: "append",
        products: [
          {
            globalProductId: selectedProductId,
            pageNumber: productPageNumber
              ? parseInt(productPageNumber, 10)
              : null,
            cyclePrice: productCyclePrice
              ? parseFloat(productCyclePrice)
              : null,
          },
        ],
      };

      const res = await fetch(
        `/api/admin/catalogs/${selectedCatalog.id}/products`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      const json = await res.json();
      if (json.success) {
        toast.success("Produto vinculado ao catálogo com sucesso!");
        setProductPageNumber("");
        setProductCyclePrice("");

        // Recarrega lista
        const resReload = await fetch(
          `/api/admin/catalogs/${selectedCatalog.id}`,
        );
        const jsonReload = await resReload.json();
        if (jsonReload.success) {
          setCatalogProductsList(jsonReload.data.products || []);
        }
        fetchCatalogs();
      } else {
        toast.error(json.error || "Erro ao vincular produto.");
      }
    } catch {
      toast.error("Erro de conexão ao vincular produto.");
    } finally {
      setAddingProduct(false);
    }
  };

  const fetchJobStatus = useCallback(
    async (catalogId: string, jobId: string) => {
      try {
        const res = await fetch(
          `/api/admin/catalogs/${catalogId}/jobs/${jobId}`,
        );
        const data = await res.json();
        if (data.success && data.job) {
          setActiveJob(data.job);
          if (data.job.status === "COMPLETED") {
            toast.success("Extração de produtos concluída com sucesso!");
            fetchCatalogs();
          }
        }
      } catch {
        // Ignora erro momentâneo de polling
      }
    },
    [fetchCatalogs],
  );

  useEffect(() => {
    if (
      !ingestionModalOpen ||
      !ingestionCatalog ||
      !activeJob ||
      (activeJob.status !== "PROCESSING" && activeJob.status !== "QUEUED")
    ) {
      return;
    }
    const interval = setInterval(() => {
      fetchJobStatus(ingestionCatalog.id, activeJob.id);
    }, 3000);
    return () => clearInterval(interval);
  }, [ingestionModalOpen, ingestionCatalog, activeJob, fetchJobStatus]);

  const handleOpenIngestionModal = async (cat: CatalogItem) => {
    setIngestionCatalog(cat);
    setIngestionModalOpen(true);
    setLoadingJob(true);
    try {
      const res = await fetch(`/api/admin/catalogs/${cat.id}/ingest`);
      const data = await res.json();
      if (data.success && data.jobs && data.jobs.length > 0) {
        const latestJobId = data.jobs[0].id;
        await fetchJobStatus(cat.id, latestJobId);
      } else {
        setActiveJob(null);
      }
    } catch {
      setActiveJob(null);
    } finally {
      setLoadingJob(false);
    }
  };

  const handleStartIngestion = async () => {
    if (!ingestionCatalog) return;
    setStartingIngestion(true);
    try {
      const res = await fetch(
        `/api/admin/catalogs/${ingestionCatalog.id}/ingest`,
        {
          method: "POST",
        },
      );
      const data = await res.json();
      if (data.success) {
        toast.success("Processamento iniciado em segundo plano!");
        await fetchJobStatus(ingestionCatalog.id, data.jobId);
        fetchCatalogs();
      } else {
        toast.error(data.error || "Falha ao iniciar processamento.");
      }
    } catch {
      toast.error("Erro ao iniciar ingestão com IA.");
    } finally {
      setStartingIngestion(false);
    }
  };

  const getStatusBadge = (st: string) => {
    switch (st) {
      case "PUBLISHED":
        return (
          <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white font-medium">
            Publicado
          </Badge>
        );
      case "CURATION":
        return (
          <Badge className="bg-amber-600 hover:bg-amber-600 text-white font-medium">
            Em Curadoria
          </Badge>
        );
      case "ARCHIVED":
        return (
          <Badge
            variant="outline"
            className="text-muted-foreground border-border">
            Arquivado
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="font-medium">
            Rascunho
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Barra de Filtros e Ações */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <div className="relative w-full sm:w-72">
            <BoxIcon
              name="search"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground size-4"
            />
            <Input
              placeholder="Buscar título, ciclo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Filtro por Marca */}
          <select
            value={brandFilter}
            onChange={(e) => setBrandFilter(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
            <option value="all">Todas as marcas</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>

          {/* Filtro por Status */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-ring">
            <option value="all">Todos os status</option>
            <option value="DRAFT">Rascunho</option>
            <option value="CURATION">Em Curadoria</option>
            <option value="PUBLISHED">Publicado</option>
            <option value="ARCHIVED">Arquivado</option>
          </select>
        </div>

        <Button onClick={handleOpenCreate} className="gap-2 shrink-0">
          <BoxIcon name="plus" className="size-4" />
          Novo Catálogo
        </Button>
      </div>

      {/* Tabela de Catálogos */}
      <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="w-16">Capa</TableHead>
              <TableHead>Título e Ciclo</TableHead>
              <TableHead>Marca</TableHead>
              <TableHead>Vigência</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Produtos</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="h-32 text-center text-muted-foreground">
                  Carregando catálogos digitais...
                </TableCell>
              </TableRow>
            ) : catalogs.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="h-32 text-center text-muted-foreground">
                  Nenhum catálogo encontrado. Clique em &quot;Novo
                  Catálogo&quot; para publicar uma revista.
                </TableCell>
              </TableRow>
            ) : (
              catalogs.map((catalog) => (
                <TableRow key={catalog.id} className="hover:bg-muted/30">
                  <TableCell>
                    {catalog.coverUrl ? (
                      <div className="relative h-12 w-9 rounded overflow-hidden border bg-muted">
                        <Image
                          src={catalog.coverUrl}
                          alt={catalog.title}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      </div>
                    ) : (
                      <div className="flex h-12 w-9 items-center justify-center rounded border bg-muted/60 text-muted-foreground">
                        <BoxIcon name="book-open" className="size-5" />
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="font-semibold text-foreground text-sm">
                      {catalog.title}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {catalog.cycle
                        ? `Ciclo: ${catalog.cycle}`
                        : "Sem ciclo especificado"}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {catalog.brand.logoUrl ? (
                        <div className="relative h-6 w-6 rounded-full overflow-hidden border bg-background shrink-0">
                          <Image
                            src={catalog.brand.logoUrl}
                            alt={catalog.brand.name}
                            fill
                            className="object-contain"
                            unoptimized
                          />
                        </div>
                      ) : (
                        <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[10px] font-bold">
                          {catalog.brand.name.substring(0, 2).toUpperCase()}
                        </div>
                      )}
                      <span className="text-sm font-medium">
                        {catalog.brand.name}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-xs text-muted-foreground">
                      {catalog.startDate || catalog.endDate ? (
                        <span>
                          {catalog.startDate
                            ? new Date(catalog.startDate).toLocaleDateString(
                                "pt-BR",
                              )
                            : "Início"}
                          {" até "}
                          {catalog.endDate
                            ? new Date(catalog.endDate).toLocaleDateString(
                                "pt-BR",
                              )
                            : "Indeterminado"}
                        </span>
                      ) : (
                        "—"
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(catalog.status)}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-mono text-xs">
                      {catalog._count?.products || 0} itens
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {catalog.pdfPath && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenPdf(catalog.id)}
                          title="Abrir PDF com link seguro"
                          className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10">
                          <BoxIcon name="file-pdf" className="size-4" />
                        </Button>
                      )}
                      {catalog.pdfPath && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenIngestionModal(catalog)}
                          title="Extração com IA Multimodal"
                          className="h-8 w-8 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-500/10">
                          <BoxIcon name="bot" className="size-4" />
                        </Button>
                      )}
                      <Link
                        href={`/admin/catalogos/${catalog.id}/curadoria`}
                        className="inline-flex items-center justify-center h-8 w-8 rounded-md text-amber-600 hover:text-amber-700 hover:bg-amber-500/10"
                        title="Curadoria de Produtos (Revisão & Aprovação)">
                        <BoxIcon name="check-square" className="size-4" />
                      </Link>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenProductsModal(catalog)}
                        title="Vincular Produtos Manualmente"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground">
                        <BoxIcon name="list-plus" className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenEdit(catalog)}
                        title="Editar"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground">
                        <BoxIcon name="edit" className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setCatalogToDelete(catalog);
                          setDeleteModalOpen(true);
                        }}
                        title="Excluir"
                        className="h-8 w-8 text-destructive hover:bg-destructive/10">
                        <BoxIcon name="trash" className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Modal de Criação / Edição de Catálogo */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-140">
          <DialogHeader>
            <DialogTitle>
              {editingCatalog
                ? "Editar Catálogo Digital"
                : "Novo Catálogo Digital"}
            </DialogTitle>
            <DialogDescription>
              Cadastre campanhas e ciclos de revenda anexando o arquivo PDF
              original.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveCatalog} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cat-title">Título do Catálogo *</Label>
              <Input
                id="cat-title"
                placeholder="Ex: Natura - Ciclo 05/2026 Especial Mães"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cat-brand">Marca Oficial *</Label>
                <select
                  id="cat-brand"
                  value={brandId}
                  onChange={(e) => setBrandId(e.target.value)}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  required>
                  <option value="" disabled>
                    Selecione uma marca
                  </option>
                  {brands.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cat-cycle">Ciclo / Campanha</Label>
                <Input
                  id="cat-cycle"
                  placeholder="Ex: Ciclo 05/2026"
                  value={cycle}
                  onChange={(e) => setCycle(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cat-start">Data de Início da Vigência</Label>
                <Input
                  id="cat-start"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cat-end">Data Final da Vigência</Label>
                <Input
                  id="cat-end"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cat-status">Status de Publicação</Label>
              <select
                id="cat-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                <option value="DRAFT">Rascunho (apenas administradores)</option>
                <option value="CURATION">Em Curadoria (em conferência)</option>
                <option value="PUBLISHED">
                  Publicado (disponível para lojistas)
                </option>
                <option value="ARCHIVED">Arquivado (vigência encerrada)</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cat-cover">URL da Capa (Imagem)</Label>
              <Input
                id="cat-cover"
                placeholder="https://.../capa.jpg"
                value={coverUrl}
                onChange={(e) => setCoverUrl(e.target.value)}
              />
            </div>

            {/* Upload do Arquivo PDF */}
            <div className="space-y-2 rounded-lg border p-3 bg-muted/20">
              <div className="flex items-center justify-between">
                <Label className="font-semibold text-sm">
                  Arquivo PDF da Revista
                </Label>
                {pdfPath && (
                  <Badge
                    variant="outline"
                    className="text-emerald-600 border-emerald-300 font-mono text-[10px]">
                    PDF Anexado
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                O arquivo é armazenado no bucket privado e protegido por links
                assinados temporários.
              </p>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="file"
                  ref={pdfInputRef}
                  onChange={handlePdfUpload}
                  accept="application/pdf"
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => pdfInputRef.current?.click()}
                  disabled={uploadingPdf}
                  className="gap-2">
                  <BoxIcon name="upload" className="size-4" />
                  {uploadingPdf
                    ? "Enviando PDF..."
                    : pdfPath
                      ? "Substituir PDF"
                      : "Carregar Arquivo PDF"}
                </Button>
                {pdfPath && (
                  <span className="text-xs text-muted-foreground truncate max-w-60">
                    {pdfPath}
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cat-desc">Descrição / Observações</Label>
              <Textarea
                id="cat-desc"
                placeholder="Detalhes sobre promoções, brindes ou condições especiais do ciclo..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={saving}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving || uploadingPdf}>
                {saving
                  ? "Salvando..."
                  : editingCatalog
                    ? "Atualizar Catálogo"
                    : "Criar Catálogo"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal de Gestão de Produtos do Catálogo */}
      <Dialog open={productsModalOpen} onOpenChange={setProductsModalOpen}>
        <DialogContent className="sm:max-w-175 max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>
              Produtos do Catálogo: {selectedCatalog?.title}
            </DialogTitle>
            <DialogDescription>
              Adicione produtos globais a esta revista, especificando a página
              do PDF e o preço da campanha.
            </DialogDescription>
          </DialogHeader>

          {/* Formulário Rápido de Adição */}
          <div className="rounded-lg border p-3 bg-muted/20 space-y-3">
            <div className="font-semibold text-xs text-foreground">
              Vincular Novo Produto ao Ciclo
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
              <div className="sm:col-span-6">
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                  <option value="" disabled>
                    Selecione um produto
                  </option>
                  {availableProducts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.referenceSku ? `(${p.referenceSku})` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <Input
                  type="number"
                  placeholder="Pág."
                  value={productPageNumber}
                  onChange={(e) => setProductPageNumber(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
              <div className="sm:col-span-2">
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Preço R$"
                  value={productCyclePrice}
                  onChange={(e) => setProductCyclePrice(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
              <div className="sm:col-span-2">
                <Button
                  size="sm"
                  onClick={handleAddProductToCatalog}
                  disabled={addingProduct || !selectedProductId}
                  className="w-full h-9 text-xs gap-1">
                  <BoxIcon name="plus" className="size-3.5" />
                  Adicionar
                </Button>
              </div>
            </div>
          </div>

          {/* Listagem dos Produtos Vinculados */}
          <div className="flex-1 overflow-y-auto border rounded-md min-h-50">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="text-xs">Pág.</TableHead>
                  <TableHead className="text-xs">Produto</TableHead>
                  <TableHead className="text-xs">Código / EAN</TableHead>
                  <TableHead className="text-xs">Preço Ciclo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingProducts ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="h-24 text-center text-xs text-muted-foreground">
                      Carregando itens vinculados...
                    </TableCell>
                  </TableRow>
                ) : catalogProductsList.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="h-24 text-center text-xs text-muted-foreground">
                      Nenhum produto vinculado ainda a este ciclo.
                    </TableCell>
                  </TableRow>
                ) : (
                  catalogProductsList.map((cp) => (
                    <TableRow key={cp.id}>
                      <TableCell className="font-mono text-xs">
                        {cp.pageNumber ? `pág. ${cp.pageNumber}` : "—"}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-xs">
                          {cp.globalProduct?.name}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          {cp.globalProduct?.globalCategory?.name ||
                            "Sem categoria"}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {cp.globalProduct?.referenceSku ||
                          cp.globalProduct?.barcode ||
                          "—"}
                      </TableCell>
                      <TableCell className="font-medium text-xs text-emerald-600">
                        {cp.cyclePrice
                          ? Number(cp.cyclePrice).toLocaleString("pt-BR", {
                              style: "currency",
                              currency: "BRL",
                            })
                          : cp.globalProduct?.suggestedPrice
                            ? Number(
                                cp.globalProduct.suggestedPrice,
                              ).toLocaleString("pt-BR", {
                                style: "currency",
                                currency: "BRL",
                              })
                            : "—"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setProductsModalOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Exclusão */}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent className="sm:max-w-106.25">
          <DialogHeader>
            <DialogTitle>Excluir Catálogo Digital?</DialogTitle>
            <DialogDescription>
              Esta ação removerá o catálogo &quot;{catalogToDelete?.title}&quot;
              e suas associações. Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteModalOpen(false)}
              disabled={deleting}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteCatalog}
              disabled={deleting}>
              {deleting ? "Excluindo..." : "Sim, Excluir Catálogo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Ingestão de Produtos com IA */}
      <Dialog open={ingestionModalOpen} onOpenChange={setIngestionModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <BoxIcon name="bot" className="size-5 text-indigo-600" />
              Extração Automática com IA Multimodal
            </DialogTitle>
            <DialogDescription className="text-xs">
              Processa o PDF da revista, extrai referências, preços, variantes e
              gera recortes de imagem otimizados.
            </DialogDescription>
          </DialogHeader>

          {ingestionCatalog && (
            <div className="space-y-4 py-2">
              <div className="rounded-lg border border-border bg-muted/40 p-3 text-xs space-y-1">
                <p className="font-semibold text-foreground">
                  {ingestionCatalog.title}
                </p>
                <p className="text-muted-foreground">
                  Marca: {ingestionCatalog.brand.name}
                </p>
                {ingestionCatalog.pdfPath && (
                  <p className="text-[11px] text-muted-foreground/80 font-mono truncate">
                    Arquivo: {ingestionCatalog.pdfPath}
                  </p>
                )}
              </div>

              {loadingJob ? (
                <div className="flex items-center justify-center py-6 text-muted-foreground gap-2">
                  <BoxIcon
                    name="loader-alt"
                    className="size-5 animate-spin text-primary"
                  />
                  <span className="text-xs">
                    Verificando status de extração...
                  </span>
                </div>
              ) : activeJob ? (
                <div className="space-y-3 rounded-lg border border-indigo-200 bg-indigo-50/40 p-3.5 dark:border-indigo-900/40 dark:bg-indigo-950/20">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-indigo-900 dark:text-indigo-300">
                      Status: {activeJob.status}
                    </span>
                    <Badge variant="outline" className="font-mono text-[10px]">
                      {activeJob.processedPages} / {activeJob.totalPages || "?"}{" "}
                      folhas
                    </Badge>
                  </div>

                  {/* Barra de Progresso */}
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full bg-indigo-600 transition-all duration-500"
                      style={{
                        width: `${activeJob.progressPercentage || 0}%`,
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>Progresso: {activeJob.progressPercentage || 0}%</span>
                    <span>
                      {activeJob.totalProductsFound || 0} produtos encontrados
                    </span>
                  </div>

                  {activeJob.status === "PROCESSING" && (
                    <div className="flex items-center gap-1.5 text-[11px] text-indigo-700 dark:text-indigo-400">
                      <BoxIcon
                        name="loader-alt"
                        className="size-3.5 animate-spin"
                      />
                      <span>
                        Processando folha {activeJob.currentSheet || "atual"}...
                      </span>
                    </div>
                  )}

                  {activeJob.status === "COMPLETED" && (
                    <div className="pt-2 border-t border-border/60 flex items-center justify-between">
                      <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                        Extração concluída!
                      </span>
                      <Link
                        href={`/admin/catalogos/${ingestionCatalog.id}/curadoria`}
                        className="text-xs font-semibold text-indigo-600 hover:underline flex items-center gap-1"
                        onClick={() => setIngestionModalOpen(false)}>
                        Ir para Curadoria{" "}
                        <BoxIcon name="chevron-right" className="size-3" />
                      </Link>
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-lg border border-border p-3 text-xs text-muted-foreground space-y-2">
                  <p>Nenhuma extração anterior encontrada para esta edição.</p>
                  <p className="text-[11px]">
                    O modelo analisará todas as folhas duplas em segundo plano.
                    Você poderá acompanhar o progresso em tempo real e revisar
                    os produtos na tela de curadoria.
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIngestionModalOpen(false)}>
              Fechar
            </Button>
            {(!activeJob ||
              activeJob.status === "COMPLETED" ||
              activeJob.status === "FAILED" ||
              activeJob.status === "CANCELLED") && (
              <Button
                size="sm"
                onClick={handleStartIngestion}
                disabled={startingIngestion}
                className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white">
                <BoxIcon name="bot" className="size-4" />
                {startingIngestion
                  ? "Iniciando..."
                  : activeJob
                    ? "Reprocessar Catálogo"
                    : "Iniciar Extração com IA"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
