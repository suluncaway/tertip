import React, { useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Camera,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Database,
  Download,
  Eye,
  FileImage,
  FileSpreadsheet,
  FileText,
  Play,
  Presentation,
  Radar,
  ScanText,
  Search,
  Table2,
  Terminal,
  Trash2,
  Upload,
  UploadCloud,
} from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Modal,
  ProgressBar,
  SectionHeader,
} from '../../components/ui';
import {
  FORM_TEMPLATES,
  downloadCollectionForm,
  enhanceDocumentImage,
  extractTurkishInvoiceSutFields,
  runCrossDocumentAudit,
  runLocalTableQuery,
} from '../../lib';
import type { IngestProgress, LocalQueryResult } from '../../lib';
import type { DocumentKind, TertipDocument, WorkspaceState } from '../../types';

export interface DocumentsViewProps {
  workspace: WorkspaceState;
  documents: TertipDocument[];
  ingestProgress: IngestProgress | null;
  onIngestFiles: (files: File[]) => void;
  onImportCollectionResponses: (files: File[]) => void;
  onDeleteDocument: (docId: string) => void;
  onLoadDemo: () => void;
}

const ACCEPTED_EXTENSIONS =
  '.xlsx,.xls,.csv,.pdf,.pptx,.png,.jpg,.jpeg,.webp,.txt';

const KIND_META: Record<
  DocumentKind,
  {
    label: string;
    badge: 'accent' | 'gold' | 'info' | 'warning' | 'neutral';
    icon: React.ReactNode;
  }
> = {
  excel: {
    label: 'Excel',
    badge: 'accent',
    icon: <FileSpreadsheet className="h-4 w-4" />,
  },
  csv: {
    label: 'CSV',
    badge: 'accent',
    icon: <FileSpreadsheet className="h-4 w-4" />,
  },
  pdf: {
    label: 'PDF',
    badge: 'gold',
    icon: <FileText className="h-4 w-4" />,
  },
  pptx: {
    label: 'Sunum',
    badge: 'warning',
    icon: <Presentation className="h-4 w-4" />,
  },
  image: {
    label: 'Görsel / OCR',
    badge: 'info',
    icon: <FileImage className="h-4 w-4" />,
  },
  text: {
    label: 'Metin',
    badge: 'neutral',
    icon: <FileText className="h-4 w-4" />,
  },
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatDateTimeTr(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export const DocumentsView: React.FC<DocumentsViewProps> = ({
  workspace,
  documents,
  ingestProgress,
  onIngestFiles,
  onImportCollectionResponses,
  onDeleteDocument,
  onLoadDemo,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const collectionImportRef = useRef<HTMLInputElement>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [cameraBusy, setCameraBusy] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(
    FORM_TEMPLATES[0]?.id ?? 'aylik-sube-raporu'
  );
  const [branchHint, setBranchHint] = useState('');
  const [search, setSearch] = useState('');
  const [kindFilter, setKindFilter] = useState<'all' | DocumentKind>('all');
  const [previewDoc, setPreviewDoc] = useState<TertipDocument | null>(null);
  const [previewTab, setPreviewTab] = useState<'tables' | 'text'>('tables');

  // Local SQL Console state
  const [sqlOpen, setSqlOpen] = useState(false);
  const [sqlInput, setSqlInput] = useState('SHOW TABLES');
  const [sqlResult, setSqlResult] = useState<LocalQueryResult | null>(null);

  const crossAudit = useMemo(
    () => runCrossDocumentAudit(workspace),
    [workspace]
  );

  const firstTableName = useMemo(() => {
    for (const d of documents) {
      if (d.tables.length > 0) return d.tables[0].name;
    }
    return null;
  }, [documents]);

  const sqlPresets = useMemo(() => {
    const presets = ['SHOW TABLES'];
    if (firstTableName) {
      presets.push(`SELECT * FROM "${firstTableName}" LIMIT 10`);
      presets.push(`SELECT COUNT(*) FROM "${firstTableName}"`);
    }
    return presets;
  }, [firstTableName]);

  const filteredDocuments = useMemo(() => {
    const q = search.trim().toLocaleLowerCase('tr-TR');
    return documents.filter((doc) => {
      if (kindFilter !== 'all' && doc.kind !== kindFilter) return false;
      if (!q) return true;
      return (
        doc.name.toLocaleLowerCase('tr-TR').includes(q) ||
        doc.category.toLocaleLowerCase('tr-TR').includes(q) ||
        doc.summary.toLocaleLowerCase('tr-TR').includes(q)
      );
    });
  }, [documents, kindFilter, search]);

  const handleFilesSelected = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    onIngestFiles(Array.from(fileList));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCameraCapture = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setCameraBusy(true);
    try {
      const enhanced: File[] = [];
      for (const file of Array.from(fileList)) {
        const improved = await enhanceDocumentImage(file);
        enhanced.push(improved);
      }
      onIngestFiles(enhanced);
    } finally {
      setCameraBusy(false);
      if (cameraInputRef.current) {
        cameraInputRef.current.value = '';
      }
    }
  };

  const handleRunSql = (queryText?: string) => {
    const q = (queryText ?? sqlInput).trim();
    if (!q) return;
    if (queryText) setSqlInput(queryText);
    setSqlResult(runLocalTableQuery(documents, q));
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      onIngestFiles(files);
    }
  };

  const openPreview = (doc: TertipDocument) => {
    setPreviewDoc(doc);
    setPreviewTab(doc.tables.length > 0 ? 'tables' : 'text');
  };

  return (
    <div className="space-y-5 sm:space-y-6">
      <SectionHeader
        eyebrow="YEREL BELGE ZEKÂSI, OCR & SQL"
        title="Belgeler"
        subtitle="Excel, CSV, PDF, PowerPoint ve taranmış fatura/fişleri yükleyin. Çapraz belge denetimi, VKN/KDV/SUT çıkarımı ve yerel SQL sorguları %100 tarayıcınızda çalışır."
        as="h1"
        badge={
          <Badge variant="accent" size="sm">
            {documents.length} Belge Bellekte
          </Badge>
        }
        actions={
          <Button
            variant="secondary"
            size="sm"
            loading={cameraBusy}
            icon={<Camera className="h-4 w-4" />}
            onClick={() => cameraInputRef.current?.click()}
          >
            Akıllı Kamera / Fatura OCR
          </Button>
        }
      />

      {/* Hidden camera input with rear-camera capture + canvas enhancement */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => void handleCameraCapture(e.target.files)}
      />

      {/* Compact Mobile Upload Bar + Desktop Drag & Drop Multi-file Dropzone */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            fileInputRef.current?.click();
          }
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`group relative cursor-pointer rounded-2xl border-2 border-dashed p-4 text-center transition-all sm:p-7 ${
          isDragging
            ? 'border-tertip-accent bg-tertip-accent-soft scale-[1.005]'
            : 'border-tertip-border bg-tertip-surface hover:border-tertip-accent/70 hover:bg-tertip-surface-elevated'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={ACCEPTED_EXTENSIONS}
          className="hidden"
          onChange={(e) => handleFilesSelected(e.target.files)}
        />

        {/* Mobile-first compact upload bar */}
        <div className="flex flex-col items-center gap-2.5 sm:hidden">
          <div className="flex w-full items-center gap-3 text-left">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-tertip-accent-soft text-tertip-accent">
              <UploadCloud className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-tertip-ink">
                Dosya / Fotoğraf Seç
              </p>
              <p className="truncate text-[11px] text-tertip-ink-muted">
                Excel, PDF, PPTX, Fatura/SUT OCR · %100 yerel
              </p>
            </div>
          </div>
          <div className="grid w-full grid-cols-2 gap-2">
            <span className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-tertip-accent px-3 py-2 text-xs font-medium text-tertip-accent-ink">
              <UploadCloud className="h-4 w-4" />
              Belge Seç
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                cameraInputRef.current?.click();
              }}
              className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-tertip-border bg-tertip-surface-elevated px-3 py-2 text-xs font-medium text-tertip-ink"
            >
              <Camera className="h-4 w-4 text-tertip-gold" />
              Fatura Tara
            </button>
          </div>
        </div>

        {/* Desktop drag-and-drop view */}
        <div className="hidden sm:block">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-tertip-accent-soft text-tertip-accent transition-transform group-hover:scale-105">
            <UploadCloud className="h-6 w-6" />
          </div>
          <h2 className="mt-3 text-base font-semibold text-tertip-ink">
            {isDragging
              ? 'Dosyaları buraya bırakın'
              : 'Belgeleri sürükleyip bırakın veya seçmek için tıklayın'}
          </h2>
          <p className="mt-1 text-xs text-tertip-ink-muted">
            Desteklenen formatlar:{' '}
            <span className="font-mono">
              .xlsx, .xls, .csv, .pdf, .pptx, .png, .jpg, .webp, .txt
            </span>
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <Badge variant="accent" size="sm">
              Tablo & Grafik Çıkarımı
            </Badge>
            <Badge variant="gold" size="sm">
              VKN / KDV / SUT Fatura Tespiti
            </Badge>
            <Badge variant="info" size="sm">
              Türkçe + İngilizce Görsel OCR
            </Badge>
          </div>
        </div>
      </div>

      {/* Real-time Parsing / OCR Progress */}
      {ingestProgress && (
        <Card variant="elevated" padding="md">
          <ProgressBar
            value={ingestProgress.percent}
            max={100}
            tone="accent"
            showPercent
            label={`İşleniyor (${ingestProgress.fileIndex}/${ingestProgress.totalFiles}): ${ingestProgress.fileName}`}
            hint={ingestProgress.status}
          />
        </Card>
      )}

      {/* Ekip / Şube Veri Toplama (Sunucusuz Taşınabilir Formlar) */}
      <Card
        variant="default"
        padding="md"
        header={
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-tertip-accent" />
              <div>
                <h2 className="text-sm font-semibold text-tertip-ink">
                  Ekip / Şube Veri Toplama
                </h2>
                <p className="text-[11px] text-tertip-ink-muted">
                  İnternetsiz çalışan tek dosya HTML form gönderin; gelen{' '}
                  <code className="font-mono">.tertip-form.json</code>{' '}
                  yanıtlarını toplu içe aktarın
                </p>
              </div>
            </div>
            <Badge variant="accent" size="sm">
              0 Sunucu · Çevrimdışı Form
            </Badge>
          </div>
        }
      >
        <input
          ref={collectionImportRef}
          type="file"
          multiple
          accept=".json,.tertip-form.json,application/json"
          className="hidden"
          onChange={(e) => {
            const files = e.target.files ? Array.from(e.target.files) : [];
            if (files.length > 0) {
              onImportCollectionResponses(files);
            }
            e.target.value = '';
          }}
        />

        <div className="grid grid-cols-1 gap-3 md:grid-cols-12 md:items-end">
          <div className="md:col-span-5">
            <label className="mb-1 block text-xs font-medium text-tertip-ink">
              Form Şablonu
            </label>
            <select
              value={selectedTemplateId}
              onChange={(e) => setSelectedTemplateId(e.target.value)}
              className="min-h-11 w-full rounded-xl border border-tertip-border bg-tertip-surface px-3 py-2 text-xs text-tertip-ink focus:border-tertip-accent focus:outline-none sm:min-h-0"
            >
              {FORM_TEMPLATES.map((tpl) => (
                <option key={tpl.id} value={tpl.id}>
                  {tpl.name} ({tpl.category})
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-3">
            <label className="mb-1 block text-xs font-medium text-tertip-ink">
              Şube / Birim Adı (İsteğe Bağlı)
            </label>
            <input
              type="text"
              value={branchHint}
              onChange={(e) => setBranchHint(e.target.value)}
              placeholder="Örn: Kadıköy Şube"
              className="min-h-11 w-full rounded-xl border border-tertip-border bg-tertip-surface px-3 py-2 text-xs text-tertip-ink focus:border-tertip-accent focus:outline-none sm:min-h-0"
            />
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:col-span-4">
            <Button
              variant="primary"
              size="sm"
              icon={<Download className="h-4 w-4" />}
              onClick={() => {
                const tpl =
                  FORM_TEMPLATES.find((t) => t.id === selectedTemplateId) ??
                  FORM_TEMPLATES[0];
                if (tpl) {
                  downloadCollectionForm(tpl, {
                    workspaceName: workspace.workspaceName,
                    branchHint: branchHint.trim() || undefined,
                  });
                }
              }}
              className="min-h-11 sm:min-h-0"
            >
              Formu İndir
            </Button>
            <Button
              variant="secondary"
              size="sm"
              icon={<Upload className="h-4 w-4" />}
              onClick={() => collectionImportRef.current?.click()}
              className="min-h-11 sm:min-h-0"
            >
              Yanıtları İçe Aktar
            </Button>
          </div>
        </div>
      </Card>

      {/* Cross-Document Audit & Leakage Radar */}
      {documents.length > 0 && (
        <Card
          variant="elevated"
          padding="md"
          header={
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Radar className="h-4 w-4 text-tertip-gold" />
                <h2 className="text-sm font-semibold text-tertip-ink">
                  Çapraz Belge Denetim & Sızıntı Radarı
                </h2>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge
                  variant={crossAudit.findings.length > 0 ? 'warning' : 'success'}
                  size="sm"
                >
                  {crossAudit.findings.length} Bulgu
                </Badge>
                {crossAudit.discrepancyCount > 0 && (
                  <Badge variant="danger" size="sm">
                    {crossAudit.discrepancyCount} Uyuşmazlık
                  </Badge>
                )}
                {crossAudit.duplicateCount > 0 && (
                  <Badge variant="warning" size="sm">
                    {crossAudit.duplicateCount} Mükerrer
                  </Badge>
                )}
                {crossAudit.anomalyCount > 0 && (
                  <Badge variant="gold" size="sm">
                    {crossAudit.anomalyCount} Anomali
                  </Badge>
                )}
              </div>
            </div>
          }
        >
          {crossAudit.findings.length === 0 ? (
            <p className="text-xs text-tertip-ink-secondary">
              Yüklenen belgeler arasında tutarsızlık, mükerrer fatura veya
              anormal maliyet sapması tespit edilmedi.
            </p>
          ) : (
            <ul className="space-y-2.5">
              {crossAudit.findings.slice(0, 5).map((finding) => (
                <li
                  key={finding.id}
                  className="flex items-start justify-between gap-3 rounded-xl border border-tertip-border bg-tertip-surface p-3"
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    <AlertTriangle
                      className={`mt-0.5 h-4 w-4 shrink-0 ${
                        finding.severity === 'high'
                          ? 'text-tertip-danger'
                          : 'text-tertip-gold'
                      }`}
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-tertip-ink">
                        {finding.title}
                      </p>
                      <p className="mt-0.5 text-xs text-tertip-ink-muted">
                        {finding.detail}
                      </p>
                    </div>
                  </div>
                  {finding.metricValue && (
                    <Badge
                      variant={
                        finding.severity === 'high' ? 'danger' : 'warning'
                      }
                      size="sm"
                    >
                      {finding.metricValue}
                    </Badge>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {/* Collapsible Local SQL Query Console */}
      {documents.length > 0 && (
        <Card variant="default" padding="none">
          <button
            type="button"
            onClick={() => setSqlOpen((prev) => !prev)}
            className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition-colors hover:bg-tertip-surface-elevated"
          >
            <div className="flex items-center gap-2.5">
              <Terminal className="h-4 w-4 text-tertip-accent" />
              <div>
                <p className="text-sm font-semibold text-tertip-ink">
                  Yerel SQL Sorgu Konsolu
                </p>
                <p className="text-[11px] text-tertip-ink-muted">
                  Çıkarılan tüm Excel/PDF tablolarında sunucusuz anlık SQL sorgusu çalıştırın
                </p>
              </div>
            </div>
            {sqlOpen ? (
              <ChevronUp className="h-4 w-4 text-tertip-ink-muted" />
            ) : (
              <ChevronDown className="h-4 w-4 text-tertip-ink-muted" />
            )}
          </button>

          {sqlOpen && (
            <div className="space-y-3 border-t border-tertip-border p-4">
              <div className="flex flex-nowrap items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar sm:flex-wrap sm:overflow-visible sm:pb-0">
                {sqlPresets.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handleRunSql(preset)}
                    className="shrink-0 whitespace-nowrap rounded-full border border-tertip-border bg-tertip-surface-elevated px-3 py-1 font-mono text-[11px] text-tertip-ink-secondary hover:border-tertip-accent hover:text-tertip-accent"
                  >
                    {preset}
                  </button>
                ))}
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  type="text"
                  value={sqlInput}
                  onChange={(e) => setSqlInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleRunSql();
                  }}
                  placeholder='SHOW TABLES veya SELECT * FROM "Tablo" LIMIT 10'
                  className="min-h-11 flex-1 rounded-xl border border-tertip-border bg-tertip-surface-elevated px-3.5 py-2 font-mono text-xs text-tertip-ink focus:border-tertip-accent focus:outline-none"
                />
                <Button
                  variant="primary"
                  size="sm"
                  icon={<Play className="h-3.5 w-3.5" />}
                  onClick={() => handleRunSql()}
                  className="min-h-11 sm:min-h-0"
                >
                  Çalıştır
                </Button>
              </div>

              {sqlResult && (
                <div className="space-y-2">
                  {sqlResult.error ? (
                    <p className="rounded-xl border border-tertip-danger-border bg-tertip-danger-soft p-3 text-xs text-tertip-danger">
                      {sqlResult.error}
                    </p>
                  ) : (
                    <>
                      <div className="flex items-center justify-between text-[11px] text-tertip-ink-muted">
                        <span>
                          {sqlResult.tableName
                            ? `Tablo: ${sqlResult.tableName}`
                            : 'Sorgu sonucu'}
                        </span>
                        <span className="font-mono">
                          {sqlResult.rowCount} satır
                        </span>
                      </div>
                      <div className="overflow-x-auto rounded-xl border border-tertip-border">
                        <table className="w-full border-collapse text-left text-xs">
                          <thead className="bg-tertip-surface-subtle text-tertip-ink">
                            <tr>
                              {sqlResult.columns.map((col) => (
                                <th
                                  key={col}
                                  className="whitespace-nowrap border-b border-tertip-border px-3 py-2 font-semibold"
                                >
                                  {col}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-tertip-border/50 bg-tertip-surface">
                            {sqlResult.rows.slice(0, 30).map((row, idx) => (
                              <tr key={idx}>
                                {sqlResult.columns.map((col) => {
                                  const val = row[col];
                                  return (
                                    <td
                                      key={col}
                                      className="whitespace-nowrap px-3 py-2 text-tertip-ink-secondary"
                                    >
                                      {val === null || val === undefined
                                        ? '—'
                                        : typeof val === 'number'
                                          ? val.toLocaleString('tr-TR')
                                          : String(val)}
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </Card>
      )}

      {/* Search & Filter Bar */}
      {documents.length > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-tertip-ink-muted" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Belge adı, kategori veya özet içinde ara..."
              className="w-full rounded-xl border border-tertip-border bg-tertip-surface py-2 pl-9 pr-3 text-sm text-tertip-ink placeholder:text-tertip-ink-muted focus:border-tertip-accent focus:outline-none"
            />
          </div>

          <div className="flex flex-nowrap items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar sm:flex-wrap sm:overflow-visible sm:pb-0">
            {(
              [
                ['all', 'Tümü'],
                ['excel', 'Excel'],
                ['csv', 'CSV'],
                ['pdf', 'PDF'],
                ['pptx', 'Sunum'],
                ['image', 'Görsel/OCR'],
                ['text', 'Metin'],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setKindFilter(key)}
                className={`min-h-9 shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
                  kindFilter === key
                    ? 'bg-tertip-accent text-tertip-accent-ink'
                    : 'bg-tertip-surface-subtle text-tertip-ink-secondary hover:bg-tertip-border/60'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Documents List */}
      {documents.length === 0 ? (
        <Card variant="default" padding="lg">
          <EmptyState
            icon={<FileSpreadsheet className="h-7 w-7" />}
            title="Henüz yüklenmiş belge yok"
            description="Yukarıdaki alana kendi raporlarınızı bırakabilir veya uygulamanın tüm belge analizi özelliklerini görmek için örnek hastane veri setini yükleyebilirsiniz."
            action={
              <Button
                variant="secondary"
                icon={<Database className="h-4 w-4" />}
                onClick={onLoadDemo}
              >
                Örnek Hastane Verisini Yükle
              </Button>
            }
          />
        </Card>
      ) : filteredDocuments.length === 0 ? (
        <Card variant="default" padding="md">
          <EmptyState
            compact
            title="Aramanızla eşleşen belge bulunamadı"
            description="Filtreyi temizleyip tekrar deneyin."
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {filteredDocuments.map((doc) => {
            const meta = KIND_META[doc.kind];
            const invoiceFields = extractTurkishInvoiceSutFields(doc.rawText);

            return (
              <Card key={doc.id} variant="default" padding="md">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-tertip-surface-subtle text-tertip-accent">
                      {meta.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3
                        className="break-words text-sm font-semibold text-tertip-ink sm:truncate"
                        title={doc.name}
                      >
                        {doc.name}
                      </h3>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        <Badge variant={meta.badge} size="sm">
                          {meta.label}
                        </Badge>
                        <Badge variant="neutral" size="sm">
                          {doc.category}
                        </Badge>
                        {doc.ocrUsed && (
                          <Badge
                            variant="info"
                            size="sm"
                            icon={<ScanText className="h-3 w-3" />}
                          >
                            OCR Kullanıldı
                          </Badge>
                        )}
                        {doc.status === 'error' && (
                          <Badge variant="danger" size="sm">
                            Hata
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-1.5 self-end sm:self-auto">
                    <Button
                      variant="soft"
                      size="sm"
                      icon={<Eye className="h-3.5 w-3.5" />}
                      onClick={() => openPreview(doc)}
                      className="min-h-10 sm:min-h-0"
                    >
                      İncele
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={`${doc.name} belgesini sil`}
                      onClick={() => onDeleteDocument(doc.id)}
                      className="min-h-10 min-w-10 sm:min-h-0 sm:min-w-0"
                    >
                      <Trash2 className="h-4 w-4 text-tertip-danger" />
                    </Button>
                  </div>
                </div>

                <p className="mt-3 text-xs leading-relaxed text-tertip-ink-secondary">
                  {doc.error ? `Hata: ${doc.error}` : doc.summary}
                </p>

                {/* Structured VKN / KDV / SUT badges */}
                {invoiceFields.hasStructuredData && (
                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    {invoiceFields.vknList.slice(0, 2).map((vkn) => (
                      <Badge key={vkn} variant="gold" size="sm">
                        VKN: {vkn}
                      </Badge>
                    ))}
                    {invoiceFields.kdvRates.slice(0, 2).map((rate) => (
                      <Badge key={rate} variant="neutral" size="sm">
                        KDV %{rate}
                      </Badge>
                    ))}
                    {invoiceFields.totalAmount !== null &&
                      invoiceFields.totalAmount !== undefined && (
                        <Badge variant="accent" size="sm">
                          Toplam: ₺{invoiceFields.totalAmount.toLocaleString('tr-TR')}
                        </Badge>
                      )}
                    {invoiceFields.sutCodes.slice(0, 2).map((code) => (
                      <Badge key={code} variant="info" size="sm">
                        SUT: {code}
                      </Badge>
                    ))}
                  </div>
                )}

                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-tertip-border/60 pt-3 text-[11px] text-tertip-ink-muted">
                  <div className="flex items-center gap-3">
                    <span className="font-mono">{formatFileSize(doc.size)}</span>
                    <span className="inline-flex items-center gap-1">
                      <Table2 className="h-3.5 w-3.5" />
                      {doc.tables.length} tablo
                    </span>
                  </div>
                  <span>{formatDateTimeTr(doc.uploadedAt)}</span>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Document Preview Modal */}
      <Modal
        open={previewDoc !== null}
        onClose={() => setPreviewDoc(null)}
        title={previewDoc?.name ?? 'Belge Önizleme'}
        subtitle={
          previewDoc
            ? `${KIND_META[previewDoc.kind].label} · ${formatFileSize(previewDoc.size)} · ${previewDoc.tables.length} çıkarılan tablo`
            : undefined
        }
        size="xl"
        footer={
          <Button variant="secondary" onClick={() => setPreviewDoc(null)}>
            Kapat
          </Button>
        }
      >
        {previewDoc && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-tertip-border pb-3">
              <button
                type="button"
                onClick={() => setPreviewTab('tables')}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  previewTab === 'tables'
                    ? 'bg-tertip-accent text-tertip-accent-ink'
                    : 'bg-tertip-surface-subtle text-tertip-ink-secondary hover:bg-tertip-border/60'
                }`}
              >
                Çıkarılan Tablolar ({previewDoc.tables.length})
              </button>
              <button
                type="button"
                onClick={() => setPreviewTab('text')}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  previewTab === 'text'
                    ? 'bg-tertip-accent text-tertip-accent-ink'
                    : 'bg-tertip-surface-subtle text-tertip-ink-secondary hover:bg-tertip-border/60'
                }`}
              >
                Ham Metin / OCR Çıktısı
              </button>
            </div>

            {previewTab === 'tables' ? (
              previewDoc.tables.length === 0 ? (
                <EmptyState
                  compact
                  title="Bu belgede yapısal tablo bulunamadı"
                  description="Belgenin tüm metin içeriğini görmek için Ham Metin sekmesine geçebilirsiniz."
                />
              ) : (
                <div className="space-y-5">
                  {previewDoc.tables.map((table, idx) => (
                    <div key={`${table.name}-${idx}`} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-tertip-ink-muted">
                          {table.name}
                        </h4>
                        <Badge variant="neutral" size="sm">
                          {table.rows.length} satır
                        </Badge>
                      </div>
                      <div className="overflow-x-auto rounded-xl border border-tertip-border">
                        <table className="w-full border-collapse text-left text-xs">
                          <thead className="bg-tertip-surface-subtle text-tertip-ink">
                            <tr>
                              {table.headers.map((header) => (
                                <th
                                  key={header}
                                  className="whitespace-nowrap border-b border-tertip-border px-3 py-2 font-semibold"
                                >
                                  {header}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-tertip-border/50 bg-tertip-surface">
                            {table.rows.slice(0, 50).map((row, rIdx) => (
                              <tr
                                key={rIdx}
                                className="hover:bg-tertip-surface-elevated"
                              >
                                {table.headers.map((header) => {
                                  const cell = row[header];
                                  return (
                                    <td
                                      key={header}
                                      className="whitespace-nowrap px-3 py-2 text-tertip-ink-secondary"
                                    >
                                      {cell === null || cell === undefined
                                        ? '—'
                                        : typeof cell === 'number'
                                          ? cell.toLocaleString('tr-TR')
                                          : String(cell)}
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {table.rows.length > 50 && (
                        <p className="text-[11px] text-tertip-ink-muted">
                          Performans için ilk 50 satır gösteriliyor (toplam {table.rows.length} satır).
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )
            ) : (
              <pre className="max-h-[420px] overflow-auto whitespace-pre-wrap rounded-xl border border-tertip-border bg-tertip-surface-elevated p-4 font-mono text-xs leading-relaxed text-tertip-ink-secondary">
                {previewDoc.rawText || 'Metin içeriği boş.'}
              </pre>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};
