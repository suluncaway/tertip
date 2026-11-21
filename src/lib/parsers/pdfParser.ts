import * as pdfjsLib from 'pdfjs-dist';
import type { ParsedTable } from '../../types';

export interface PdfParseResult {
  tables: ParsedTable[];
  rawText: string;
  summary: string;
  pageCount: number;
  needsOcrHint: boolean;
}

interface TextItemLike {
  str: string;
  transform: number[];
}

function isTextItem(item: unknown): item is TextItemLike {
  return (
    typeof item === 'object' &&
    item !== null &&
    'str' in item &&
    typeof (item as TextItemLike).str === 'string' &&
    'transform' in item &&
    Array.isArray((item as TextItemLike).transform)
  );
}

let workerInitialized = false;

function ensurePdfWorker(): void {
  if (workerInitialized) return;
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.min.mjs',
      import.meta.url
    ).toString();
  } catch {
    pdfjsLib.GlobalWorkerOptions.workerSrc = '';
  }
  workerInitialized = true;
}

function reconstructPageLines(items: unknown[]): string[] {
  const positioned: { x: number; y: number; text: string }[] = [];

  for (const item of items) {
    if (!isTextItem(item)) continue;
    const trimmed = item.str.trim();
    if (!trimmed) continue;
    const x = item.transform[4] ?? 0;
    const y = item.transform[5] ?? 0;
    positioned.push({ x, y, text: trimmed });
  }

  // Group items that share roughly the same Y coordinate (within 3pt)
  const rows: { y: number; cells: { x: number; text: string }[] }[] = [];
  for (const token of positioned) {
    const existing = rows.find((r) => Math.abs(r.y - token.y) <= 3);
    if (existing) {
      existing.cells.push({ x: token.x, text: token.text });
    } else {
      rows.push({ y: token.y, cells: [{ x: token.x, text: token.text }] });
    }
  }

  // PDF coordinates grow upward, so sort descending by Y
  rows.sort((a, b) => b.y - a.y);

  return rows.map((row) => {
    row.cells.sort((a, b) => a.x - b.x);
    let line = '';
    let prevX: number | null = null;

    for (const cell of row.cells) {
      if (prevX !== null) {
        const gap = cell.x - prevX;
        line += gap > 40 ? '\t' : ' ';
      }
      line += cell.text;
      prevX = cell.x + cell.text.length * 4.5;
    }
    return line.trim();
  });
}

function extractInlineTables(lines: string[], docName: string): ParsedTable[] {
  const tabLines = lines.filter((line) => line.includes('\t'));
  if (tabLines.length < 3) return [];

  const splitRows = tabLines.map((l) =>
    l
      .split('\t')
      .map((c) => c.trim())
      .filter((c) => c.length > 0)
  );

  const colCount = splitRows[0]?.length ?? 0;
  if (colCount < 2) return [];

  const matchingRows = splitRows.filter((r) => r.length === colCount);
  if (matchingRows.length < 3) return [];

  const headers = matchingRows[0];
  const rows: Record<string, string | number | null>[] = matchingRows
    .slice(1)
    .map((cells) => {
      const rec: Record<string, string | number | null> = {};
      headers.forEach((h, idx) => {
        const raw = cells[idx] ?? '';
        const cleanedNum = raw.replace(/\./g, '').replace(',', '.');
        const parsed = Number(cleanedNum);
        rec[h] =
          raw !== '' && !Number.isNaN(parsed) && /^[\d.,\-+]+$/.test(raw)
            ? parsed
            : raw || null;
      });
      return rec;
    });

  return [
    {
      name: `${docName} (Tablo)`,
      headers,
      rows,
    },
  ];
}

export async function parsePdfFile(
  file: File,
  onProgress?: (progress: number, status: string) => void
): Promise<PdfParseResult> {
  ensurePdfWorker();

  let buffer: ArrayBuffer;
  try {
    buffer = await file.arrayBuffer();
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Dosya okunamadı';
    throw new Error(`PDF okuma hatası (${file.name}): ${msg}`);
  }

  onProgress?.(10, 'PDF belgesi açılıyor...');

  let pdf: pdfjsLib.PDFDocumentProxy;
  try {
    const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer) });
    pdf = await loadingTask.promise;
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Geçersiz veya şifreli PDF';
    throw new Error(`PDF açılamadı (${file.name}): ${msg}`);
  }

  const pageCount = pdf.numPages;
  const pageTexts: string[] = [];
  const allLines: string[] = [];

  try {
    for (let pageNum = 1; pageNum <= pageCount; pageNum += 1) {
      const pct = Math.round(15 + (pageNum / pageCount) * 80);
      onProgress?.(pct, `PDF sayfa ${pageNum}/${pageCount} okunuyor...`);

      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const lines = reconstructPageLines(textContent.items);
      allLines.push(...lines);
      if (lines.length > 0) {
        pageTexts.push(`--- Sayfa ${pageNum} ---\n${lines.join('\n')}`);
      }
    }
  } finally {
    await pdf.destroy();
  }

  onProgress?.(100, 'PDF analizi tamamlandı.');

  const rawText = pageTexts.join('\n\n').trim();
  const tables = extractInlineTables(allLines, file.name.replace(/\.pdf$/i, ''));
  const needsOcrHint = rawText.replace(/\s+/g, '').length < 30;

  const summary = needsOcrHint
    ? `${pageCount} sayfalık PDF tarama (görüntü) formatında görünüyor; metin katmanı çok az. Net sonuç için görsel olarak yükleyip OCR kullanabilirsiniz.`
    : `${pageCount} sayfa PDF çözümlendi (${rawText.length} karakter${
        tables.length > 0 ? `, ${tables.length} tablo` : ''
      }).`;

  return {
    tables,
    rawText,
    summary,
    pageCount,
    needsOcrHint,
  };
}
