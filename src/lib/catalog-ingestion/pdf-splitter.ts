import { PDFDocument } from "pdf-lib";

export interface SlicedSheet {
  sheetNumber: number; // 1-indexed (1..totalPages)
  pageIndex: number;   // 0-indexed (0..totalPages-1)
  pdfBytes: Uint8Array;
}

/**
 * Retorna a contagem total de folhas físicas do PDF.
 */
export async function getPdfSheetCount(pdfBuffer: Buffer): Promise<number> {
  const doc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
  return doc.getPageCount();
}

/**
 * Extrai uma única folha física do documento PDF em um novo Uint8Array.
 */
export async function slicePdfSheet(
  pdfBuffer: Buffer,
  sheetNumber: number
): Promise<SlicedSheet> {
  const srcDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
  const total = srcDoc.getPageCount();
  const pageIndex = sheetNumber - 1;

  if (pageIndex < 0 || pageIndex >= total) {
    throw new Error(
      `Folha ${sheetNumber} inválida. O PDF possui ${total} folhas.`
    );
  }

  const newDoc = await PDFDocument.create();
  const [copiedPage] = await newDoc.copyPages(srcDoc, [pageIndex]);
  newDoc.addPage(copiedPage);

  const pdfBytes = await newDoc.save();
  return {
    sheetNumber,
    pageIndex,
    pdfBytes,
  };
}
