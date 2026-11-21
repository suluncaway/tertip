import React, { useMemo, useRef, useState } from 'react';
import {
  Database,
  Eye,
  FileImage,
  FileSpreadsheet,
  FileText,
  Presentation,
  ScanText,
  Search,
  Table2,
  Trash2,
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
import type { IngestProgress } from '../../lib';
import type { DocumentKind, TertipDocument } from '../../types';

export interface DocumentsViewProps {
  documents: TertipDocument[];
  ingestProgress: IngestProgress | null;
  onIngestFiles: (files: File[]) => void;
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
  documents,
  ingestProgress,
  onIngestFiles,
  onDeleteDocument,
  onLoadDemo,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [search, setSearch] = useState('');
  const [kindFilter, setKindFilter] = useState<'all' | DocumentKind>('all');
  const [previewDoc, setPreviewDoc] = useState<TertipDocument | null>(null);
  const [previewTab, setPreviewTab] = useState<'tables' | 'text'>('tables');

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
    <div className="space-y-6">
      <SectionHeader
        eyebrow="YEREL BELGE ZEKÂSI & OCR"
        title="Belgeler"
        subtitle="Excel, CSV, PDF, PowerPoint ve taranmış görselleri sürükleyip bırakın. Tüm çözümleme, tablo çıkarımı ve Türkçe OCR işlemleri %100 tarayıcınızda çalışır."
        as="h1"
        badge={
          <Badge variant="accent" size="sm">
            {documents.length} Belge Bellekte
          </Badge>
        }
      />

      {/* Drag & Drop Multi-file Dropzone */}
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
        className={`group relative cursor-pointer rounded-2xl border-2 border-dashed p-7 text-center transition-all ${
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
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-tertip-accent-soft text-tertip-accent transition-transform group-hover:scale-105">
          <UploadCloud className="h-6 w-6" />
        </div>
        <h2 className="mt-3 text-base font-semibold text-tertip-ink">
          {isDragging
            ? 'Dosyaları buraya bırakın'
            : 'Belgeleri sürükleyip bırakın veya seçmek için tıklayın'}
        </h2>
        <p className="mt-1 text-xs text-tertip-ink-muted">
          Desteklenen formatlar: <span className="font-mono">.xlsx, .xls, .csv, .pdf, .pptx, .png, .jpg, .webp, .txt</span>
        </p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <Badge variant="accent" size="sm">
            Tablo & Grafik Çıkarımı
          </Badge>
          <Badge variant="gold" size="sm">
            Otomatik Bakım & SUT Tarih Tespiti
          </Badge>
          <Badge variant="info" size="sm">
            Türkçe + İngilizce Görsel OCR
          </Badge>
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

          <div className="flex flex-wrap items-center gap-1.5">
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
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
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
            return (
              <Card key={doc.id} variant="default" padding="md">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-tertip-surface-subtle text-tertip-accent">
                      {meta.icon}
                    </div>
                    <div className="min-w-0">
                      <h3
                        className="truncate text-sm font-semibold text-tertip-ink"
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

                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      variant="soft"
                      size="sm"
                      icon={<Eye className="h-3.5 w-3.5" />}
                      onClick={() => openPreview(doc)}
                    >
                      İncele
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={`${doc.name} belgesini sil`}
                      onClick={() => onDeleteDocument(doc.id)}
                    >
                      <Trash2 className="h-4 w-4 text-tertip-danger" />
                    </Button>
                  </div>
                </div>

                <p className="mt-3 text-xs leading-relaxed text-tertip-ink-secondary">
                  {doc.error ? `Hata: ${doc.error}` : doc.summary}
                </p>

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
