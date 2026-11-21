import type {
  AssetItem,
  ChartSeriesPoint,
  DocumentKind,
  ExtractedMetric,
  ReminderItem,
  TertipDocument,
} from '../../types';
import { parseExcelFile } from './excelParser';
import { parsePdfFile } from './pdfParser';
import { parsePptxFile } from './pptxParser';
import { parseImageWithOcr } from './ocrParser';
import { extractIntelligenceFromDocument, mergeChartSeries } from './extractor';

export interface IngestProgress {
  fileIndex: number;
  totalFiles: number;
  fileName: string;
  percent: number;
  status: string;
}

export interface IngestResult {
  documents: TertipDocument[];
  metrics: ExtractedMetric[];
  chartSeries: ChartSeriesPoint[];
  assets: AssetItem[];
  reminders: ReminderItem[];
}

export type IngestProgressCallback = (progress: IngestProgress) => void;

export function detectDocumentKind(file: File): DocumentKind {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  const mime = file.type.toLowerCase();

  if (ext === 'csv' || mime === 'text/csv') return 'csv';
  if (
    ext === 'xlsx' ||
    ext === 'xls' ||
    mime.includes('spreadsheet') ||
    mime.includes('excel')
  ) {
    return 'excel';
  }
  if (ext === 'pdf' || mime === 'application/pdf') return 'pdf';
  if (ext === 'pptx' || mime.includes('presentation')) return 'pptx';
  if (
    ['png', 'jpg', 'jpeg', 'webp', 'bmp', 'tif', 'tiff'].includes(ext) ||
    mime.startsWith('image/')
  ) {
    return 'image';
  }
  return 'text';
}

function createDocumentId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `doc_${crypto.randomUUID().slice(0, 8)}`;
  }
  return `doc_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

export async function ingestFiles(
  files: File[],
  onProgress?: IngestProgressCallback
): Promise<IngestResult> {
  const documents: TertipDocument[] = [];
  const metrics: ExtractedMetric[] = [];
  let chartSeries: ChartSeriesPoint[] = [];
  const assets: AssetItem[] = [];
  const reminders: ReminderItem[] = [];

  const totalFiles = files.length;

  for (let i = 0; i < totalFiles; i += 1) {
    const file = files[i];
    const kind = detectDocumentKind(file);
    const id = createDocumentId();
    const uploadedAt = new Date().toISOString();

    const report = (percent: number, status: string) => {
      onProgress?.({
        fileIndex: i,
        totalFiles,
        fileName: file.name,
        percent,
        status,
      });
    };

    report(5, `${file.name} analiz ediliyor...`);

    try {
      let rawText = '';
      let summary = '';
      let tables: TertipDocument['tables'] = [];
      let ocrUsed = false;

      if (kind === 'excel' || kind === 'csv') {
        report(35, 'Tablo verileri çözümleniyor...');
        const res = await parseExcelFile(file);
        rawText = res.rawText;
        summary = res.summary;
        tables = res.tables;
      } else if (kind === 'pdf') {
        const res = await parsePdfFile(file, (pct, status) => {
          report(Math.round(pct * 0.85), status);
        });
        rawText = res.rawText;
        summary = res.summary;
        tables = res.tables;
      } else if (kind === 'pptx') {
        report(40, 'Sunum slaytları okunuyor...');
        const res = await parsePptxFile(file);
        rawText = res.rawText;
        summary = res.summary;
        tables = res.tables;
      } else if (kind === 'image') {
        ocrUsed = true;
        const res = await parseImageWithOcr(file, (pct, status) => {
          report(Math.round(pct * 0.85), status);
        });
        rawText = res.rawText;
        summary = res.summary;
      } else {
        report(45, 'Metin belgesi okunuyor...');
        rawText = (await file.text()).trim();
        const lineCount = rawText.split(/\r?\n/).filter(Boolean).length;
        summary =
          rawText.length === 0
            ? 'Boş metin belgesi.'
            : `${lineCount} satır metin içeriği okundu.`;
      }

      report(90, 'Metrikler, varlıklar ve hatırlatıcılar çıkarılıyor...');

      const doc: TertipDocument = {
        id,
        name: file.name,
        kind,
        size: file.size,
        uploadedAt,
        category: 'Genel Operasyon',
        rawText,
        tables,
        summary,
        ocrUsed,
        status: 'ready',
      };

      const extracted = extractIntelligenceFromDocument(doc);
      doc.category = extracted.inferredCategory;

      documents.push(doc);
      metrics.push(...extracted.metrics);
      chartSeries = mergeChartSeries(chartSeries, extracted.chartSeries);
      assets.push(...extracted.assets);
      reminders.push(...extracted.reminders);

      report(100, 'Tamamlandı.');
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : 'Belge işlenirken beklenmeyen bir hata oluştu.';
      documents.push({
        id,
        name: file.name,
        kind,
        size: file.size,
        uploadedAt,
        category: 'Hatalı Belge',
        rawText: '',
        tables: [],
        summary: 'Belge çözümlenemedi.',
        status: 'error',
        error: errorMsg,
      });
      report(100, 'Hata ile tamamlandı.');
    }
  }

  return {
    documents,
    metrics,
    chartSeries,
    assets,
    reminders,
  };
}
