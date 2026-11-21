export { parseExcelFile } from './parsers/excelParser';
export type { ExcelParseResult } from './parsers/excelParser';

export { parsePdfFile } from './parsers/pdfParser';
export type { PdfParseResult } from './parsers/pdfParser';

export { parsePptxFile } from './parsers/pptxParser';
export type { PptxParseResult, PptxSlideContent } from './parsers/pptxParser';

export { parseImageWithOcr } from './parsers/ocrParser';
export type { OcrParseResult, OcrProgressCallback } from './parsers/ocrParser';

export {
  extractIntelligenceFromDocument,
  mergeChartSeries,
  parseLocalizedNumber,
} from './parsers/extractor';
export type { ExtractionResult } from './parsers/extractor';

export { detectDocumentKind, ingestFiles } from './parsers/documentIngestor';
export type {
  IngestProgress,
  IngestProgressCallback,
  IngestResult,
} from './parsers/documentIngestor';

export {
  decryptWorkspace,
  encryptWorkspace,
  exportEncryptedVaultFile,
  importEncryptedVaultFile,
  isValidVaultFile,
} from './storage/encryptedVault';
export type { EncryptedVaultFile } from './storage/encryptedVault';

export {
  createEmptyWorkspaceState,
  createHospitalDemoState,
} from './demo/hospitalDemoData';
