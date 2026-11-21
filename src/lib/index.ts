export { parseExcelFile } from './parsers/excelParser';
export type { ExcelParseResult } from './parsers/excelParser';

export { parsePdfFile } from './parsers/pdfParser';
export type { PdfParseResult } from './parsers/pdfParser';

export { parsePptxFile } from './parsers/pptxParser';
export type { PptxParseResult, PptxSlideContent } from './parsers/pptxParser';

export { parseImageWithOcr } from './parsers/ocrParser';
export type { OcrParseResult, OcrProgressCallback } from './parsers/ocrParser';

export {
  enhanceDocumentImage,
  extractTurkishInvoiceSutFields,
} from './parsers/cameraOcr';
export type { TurkishInvoiceSutFields } from './parsers/cameraOcr';

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

export { SECTOR_PACKS, getSectorPackById } from './demo/sectorPacks';
export type { SectorPack, SectorPackId } from './demo/sectorPacks';

export {
  runCrossDocumentAudit,
  runLocalTableQuery,
} from './analytics/crossDocAudit';
export type {
  AuditFinding,
  CrossDocAuditResult,
  LocalQueryResult,
} from './analytics/crossDocAudit';

export { semanticSearchDocuments } from './analytics/semanticSearch';
export type { SemanticSearchHit } from './analytics/semanticSearch';

export { computeAuditReadiness } from './analytics/auditReadiness';
export type {
  AuditReadinessResult,
  MissingEvidenceItem,
} from './analytics/auditReadiness';

export {
  anonymizeText,
  anonymizeWorkspace,
  scanWorkspacePii,
} from './privacy/kvkkShield';
export type {
  KvkkScanResult,
  PiiFinding,
  PiiKind,
} from './privacy/kvkkShield';

export {
  collectZeroNetworkProof,
  downloadKvkkProofReport,
} from './privacy/networkProof';
export type { ZeroNetworkProof } from './privacy/networkProof';

export {
  buildExecutiveBriefingHtml,
  exportExecutiveBriefingHtml,
  printExecutiveBriefing,
} from './export/briefingExporter';
export type { BriefingExportOptions } from './export/briefingExporter';
