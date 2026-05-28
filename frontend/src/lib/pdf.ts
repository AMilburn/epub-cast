import { GlobalWorkerOptions, getDocument } from "pdfjs-dist";

// Set worker source for PDF.js - use local file from public folder
GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

interface TocItem {
  id: string;
  label: string;
  href: string;
}

interface PdfLoadResult {
  toc: TocItem[];
  getPageText: (pageIndex: number) => Promise<string>;
  title: string;
}

async function resolveDestToPageIndex(
  pdf: any,
  dest: any
): Promise<number | null> {
  try {
    if (Array.isArray(dest)) {
      // Explicit destination array: [pageRef, ...]
      const pageIndex = await pdf.getPageIndex(dest[0]);
      return pageIndex;
    } else if (typeof dest === "string") {
      // Named destination - resolve it
      const resolvedDest = await pdf.getDestination(dest);
      if (resolvedDest && Array.isArray(resolvedDest)) {
        const pageIndex = await pdf.getPageIndex(resolvedDest[0]);
        return pageIndex;
      }
    }
  } catch (e) {
    console.warn("Failed to resolve destination", e);
  }
  return null;
}

async function flattenOutline(pdf: any, outline: any[]): Promise<TocItem[]> {
  const toc: TocItem[] = [];

  for (let i = 0; i < outline.length; i++) {
    const node = outline[i];
    try {
      const pageIndex = await resolveDestToPageIndex(pdf, node.dest);

      if (pageIndex !== null && pageIndex >= 0 && pageIndex < pdf.numPages) {
        toc.push({
          id: String(i),
          label: node.title || `Chapter ${i + 1}`,
          href: String(pageIndex),
        });
      }
    } catch (e) {
      console.warn(`Failed to resolve outline item ${i}:`, e);
    }
  }

  // Only use outline if we got a reasonable number of chapters
  // If outline has only 1-2 items, fall back to page-based (likely just cover/TOC)
  if (toc.length <= 2) {
    console.warn(`Outline has ${toc.length} items, falling back to page-based TOC`);
    return [];
  }

  return toc;
}

async function generatePageBasedToc(pdf: any): Promise<TocItem[]> {
  const toc: TocItem[] = [];

  for (let i = 0; i < pdf.numPages; i++) {
    toc.push({
      id: String(i),
      label: `Page ${i + 1}`,
      href: String(i),
    });
  }

  return toc;
}

export async function loadPdf(file: File): Promise<PdfLoadResult> {
  // Read file as ArrayBuffer
  const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result;
      if (result instanceof ArrayBuffer) {
        resolve(result);
      } else {
        reject(new Error("Failed to read file"));
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });

  // Load PDF document
  const pdf = await getDocument({ data: arrayBuffer }).promise;

  // Extract title from metadata
  let title = file.name.replace(/\.pdf$/i, "");
  try {
    const metadata = await pdf.getMetadata();
    if (metadata?.info && (metadata.info as any).Title && (metadata.info as any).Title.trim()) {
      title = (metadata.info as any).Title;
    }
  } catch (e) {
    console.warn("Failed to extract PDF metadata", e);
  }

  // Build TOC from outline if available, otherwise use page-based
  let toc: TocItem[] = [];
  try {
    const outline = await pdf.getOutline();
    console.log("PDF outline:", outline);
    if (outline && Array.isArray(outline) && outline.length > 0) {
      toc = await flattenOutline(pdf, outline);
      if (toc.length > 0) {
        console.log(`Using outline-based TOC with ${toc.length} chapters`);
      }
    }

    if (toc.length === 0) {
      console.log(`Using page-based TOC for ${pdf.numPages} pages`);
      toc = await generatePageBasedToc(pdf);
    }
  } catch (e) {
    console.warn("Failed to extract outline, using page-based TOC", e);
    toc = await generatePageBasedToc(pdf);
  }

  // Function to get text from a page
  const getPageText = async (pageIndex: number): Promise<string> => {
    try {
      const page = await pdf.getPage(pageIndex + 1); // PDF pages are 1-indexed
      const textContent = await page.getTextContent();

      // Extract and join text items
      const text = textContent.items
        .map((item: any) => item.str)
        .join(" ");

      return text || "Could not extract text from this page.";
    } catch (e) {
      console.error("Failed to extract text from page", pageIndex, e);
      return "Error loading page text.";
    }
  };

  return {
    toc,
    getPageText,
    title,
  };
}
