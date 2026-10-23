import type { Metadata } from "next";
import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import { CurationClient } from "./curation-client";

export const metadata: Metadata = {
  title: "Curadoria de Catálogo | Zelo Admin",
  description: "Conferência, revisão e aprovação de produtos extraídos por IA antes da publicação.",
};

export default async function CatalogCurationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const catalog = await prisma.catalog.findUnique({
    where: { id },
    include: {
      brand: true,
      _count: {
        select: { products: true },
      },
    },
  });

  if (!catalog) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <CurationClient
        catalog={{
          id: catalog.id,
          title: catalog.title,
          cycle: catalog.cycle,
          status: catalog.status,
          pdfPath: catalog.pdfPath,
          brand: {
            name: catalog.brand.name,
            logoUrl: catalog.brand.logoUrl,
          },
        }}
      />
    </div>
  );
}
