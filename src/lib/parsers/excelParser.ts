import * as XLSX from 'xlsx';
import type { ParsedTable } from '../../types';

export interface ExcelParseResult {
  tables: ParsedTable[];
  rawText: string;
  summary: string;
  sheetCount: number;
  rowCount: number;
}

function formatCellValue(value: unknown): string | number | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === 'boolean') {
    return value ? 'Evet' : 'Hayır';
  }
  const str = String(value).trim();
  if (str.length === 0) return null;
  return str;
}

function normalizeHeaders(rawRow: unknown[], colCount: number): string[] {
  const seen = new Map<string, number>();
  const headers: string[] = [];

  for (let i = 0; i < colCount; i += 1) {
    const raw = rawRow[i];
    const base =
      raw !== null && raw !== undefined && String(raw).trim().length > 0
        ? String(raw).trim()
        : `Sütun ${i + 1}`;

    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    headers.push(count === 0 ? base : `${base} (${count + 1})`);
  }

  return headers;
}

function isRowEmpty(row: unknown[]): boolean {
  return row.every(
    (cell) => cell === null || cell === undefined || String(cell).trim() === ''
  );
}

export async function parseExcelFile(file: File): Promise<ExcelParseResult> {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  let workbook: XLSX.WorkBook;

  try {
    if (ext === 'csv') {
      const text = await file.text();
      workbook = XLSX.read(text, {
        type: 'string',
        raw: false,
        cellDates: true,
      });
    } else {
      const buffer = await file.arrayBuffer();
      workbook = XLSX.read(buffer, {
        type: 'array',
        cellDates: true,
      });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Bilinmeyen hata';
    throw new Error(`Excel/CSV dosyası okunamadı (${file.name}): ${msg}`);
  }

  const tables: ParsedTable[] = [];
  const textChunks: string[] = [];
  let totalRows = 0;

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;

    const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      defval: null,
      blankrows: false,
      raw: true,
    });

    const nonEmptyRows = matrix.filter((row) => Array.isArray(row) && !isRowEmpty(row));
    if (nonEmptyRows.length === 0) continue;

    // Pick first row with at least 2 non-empty cells as header if possible, else row 0
    let headerIdx = 0;
    for (let i = 0; i < Math.min(nonEmptyRows.length, 5); i += 1) {
      const filledCount = nonEmptyRows[i].filter(
        (c) => c !== null && c !== undefined && String(c).trim() !== ''
      ).length;
      if (filledCount >= 2) {
        headerIdx = i;
        break;
      }
    }

    const colCount = nonEmptyRows.reduce(
      (max, row) => Math.max(max, row.length),
      0
    );
    if (colCount === 0) continue;

    const headers = normalizeHeaders(nonEmptyRows[headerIdx], colCount);
    const dataRows: Record<string, string | number | null>[] = [];

    for (let r = headerIdx + 1; r < nonEmptyRows.length; r += 1) {
      const rawRow = nonEmptyRows[r];
      const record: Record<string, string | number | null> = {};
      let hasValue = false;

      for (let c = 0; c < headers.length; c += 1) {
        const val = formatCellValue(rawRow[c]);
        record[headers[c]] = val;
        if (val !== null) hasValue = true;
      }

      if (hasValue) {
        dataRows.push(record);
      }
    }

    tables.push({
      name: sheetName,
      headers,
      rows: dataRows,
    });

    totalRows += dataRows.length;

    const previewLines = dataRows.slice(0, 60).map((row) =>
      headers.map((h) => `${h}: ${row[h] ?? '-'}`).join(' | ')
    );
    textChunks.push(
      `[Sayfa: ${sheetName}] (${dataRows.length} satır)\nSütunlar: ${headers.join(', ')}\n${previewLines.join('\n')}`
    );
  }

  const sheetCount = tables.length;
  const rawText = textChunks.join('\n\n');
  const summary =
    sheetCount === 0
      ? 'Tablo verisi bulunamadı.'
      : `${sheetCount} çalışma sayfası, toplam ${totalRows} veri satırı çözümlendi (${tables
          .map((t) => t.name)
          .slice(0, 3)
          .join(', ')}).`;

  return {
    tables,
    rawText,
    summary,
    sheetCount,
    rowCount: totalRows,
  };
}
