import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, UploadCloud } from 'lucide-react';
import { AppShell } from './components/layout/AppShell';
import { DashboardView } from './features/dashboard/DashboardView';
import { DocumentsView } from './features/documents/DocumentsView';
import { OperationsView } from './features/operations/OperationsView';
import { AssistantView } from './features/assistant/AssistantView';
import { PrivacyView } from './features/privacy/PrivacyView';
import {
  computeAuditReadiness,
  createEmptyWorkspaceState,
  createHospitalDemoState,
  getSectorPackById,
  ingestFiles,
  mergeChartSeries,
} from './lib';
import type { IngestProgress } from './lib';
import type {
  AssetItem,
  NavTab,
  ReminderItem,
  WorkspaceState,
} from './types';

const ACCEPTED_FILES = '.xlsx,.xls,.csv,.pdf,.pptx,.png,.jpg,.jpeg,.webp,.txt';

function generateLocalId(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function getInitialPackFromUrl(): { state: WorkspaceState; packId: string | null } {
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    const packParam = params.get('pack')?.trim().toLowerCase();
    if (packParam) {
      const pack = getSectorPackById(packParam);
      if (pack) {
        return { state: pack.createState(), packId: pack.id };
      }
    }
  }
  return {
    state: createEmptyWorkspaceState('Tertip Çalışma Alanı', 'İşletme & Operasyon'),
    packId: null,
  };
}

export function App() {
  const initialPack = useMemo(() => getInitialPackFromUrl(), []);

  // 100% RAM-only workspace state (zero localStorage / zero server)
  const [workspace, setWorkspace] = useState<WorkspaceState>(initialPack.state);
  const [activePackId, setActivePackId] = useState<string | null>(initialPack.packId);
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [ingestProgress, setIngestProgress] = useState<IngestProgress | null>(
    null
  );
  const [globalDragOver, setGlobalDragOver] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const globalFileInputRef = useRef<HTMLInputElement>(null);
  const dragDepthRef = useRef(0);

  // Sync data-theme attribute without writing to any browser storage
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const showToast = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => {
      setToast((prev) => (prev === message ? null : prev));
    }, 4000);
  }, []);

  const handleToggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  }, []);

  const handleSelectSectorPack = useCallback(
    (packId: string) => {
      const pack = getSectorPackById(packId);
      if (!pack) return;
      setWorkspace(pack.createState());
      setActivePackId(pack.id);
      showToast(`"${pack.name}" sektörel örnek paketi RAM belleğe yüklendi.`);
    },
    [showToast]
  );

  const handleLoadDemo = useCallback(() => {
    setWorkspace(createHospitalDemoState());
    setActivePackId('hastane');
    showToast('Örnek hastane operasyon verisi belleğe (RAM) yüklendi.');
  }, [showToast]);

  const handleIngestFiles = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return;

      try {
        const result = await ingestFiles(files, (progress) => {
          setIngestProgress(progress);
        });

        setWorkspace((prev) => {
          const existingAssetNames = new Set(
            prev.assets.map((a) => a.name.toLocaleLowerCase('tr-TR'))
          );
          const newAssets = result.assets.filter(
            (a) => !existingAssetNames.has(a.name.toLocaleLowerCase('tr-TR'))
          );

          const existingReminderTitles = new Set(
            prev.reminders.map((r) => r.title.toLocaleLowerCase('tr-TR'))
          );
          const newReminders = result.reminders.filter(
            (r) => !existingReminderTitles.has(r.title.toLocaleLowerCase('tr-TR'))
          );

          return {
            ...prev,
            documents: [...result.documents, ...prev.documents],
            metrics: [...result.metrics, ...prev.metrics],
            chartSeries: mergeChartSeries(prev.chartSeries, result.chartSeries),
            assets: [...newAssets, ...prev.assets],
            reminders: [...newReminders, ...prev.reminders],
          };
        });

        showToast(
          `${result.documents.length} belge yerel olarak çözümlendi (${result.reminders.length} hatırlatıcı, ${result.chartSeries.length} dönem).`
        );
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : 'Dosya işlenirken hata oluştu.';
        showToast(`Hata: ${msg}`);
      } finally {
        setIngestProgress(null);
      }
    },
    [showToast]
  );

  const handleGlobalUploadClick = useCallback(() => {
    globalFileInputRef.current?.click();
  }, []);

  // Global window drag-and-drop support
  useEffect(() => {
    const onDragEnter = (e: DragEvent) => {
      if (!e.dataTransfer?.types.includes('Files')) return;
      e.preventDefault();
      dragDepthRef.current += 1;
      setGlobalDragOver(true);
    };
    const onDragOver = (e: DragEvent) => {
      if (!e.dataTransfer?.types.includes('Files')) return;
      e.preventDefault();
    };
    const onDragLeave = (e: DragEvent) => {
      if (!e.dataTransfer?.types.includes('Files')) return;
      e.preventDefault();
      dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
      if (dragDepthRef.current === 0) {
        setGlobalDragOver(false);
      }
    };
    const onDrop = (e: DragEvent) => {
      if (!e.dataTransfer?.files || e.dataTransfer.files.length === 0) return;
      e.preventDefault();
      dragDepthRef.current = 0;
      setGlobalDragOver(false);
      const dropped = Array.from(e.dataTransfer.files);
      setActiveTab('documents');
      void handleIngestFiles(dropped);
    };

    window.addEventListener('dragenter', onDragEnter);
    window.addEventListener('dragover', onDragOver);
    window.addEventListener('dragleave', onDragLeave);
    window.addEventListener('drop', onDrop);

    return () => {
      window.removeEventListener('dragenter', onDragEnter);
      window.removeEventListener('dragover', onDragOver);
      window.removeEventListener('dragleave', onDragLeave);
      window.removeEventListener('drop', onDrop);
    };
  }, [handleIngestFiles]);

  // Document actions
  const handleDeleteDocument = useCallback((docId: string) => {
    setWorkspace((prev) => ({
      ...prev,
      documents: prev.documents.filter((d) => d.id !== docId),
      metrics: prev.metrics.filter((m) => m.sourceDocId !== docId),
    }));
  }, []);

  // Reminder actions
  const handleToggleReminder = useCallback((id: string) => {
    setWorkspace((prev) => ({
      ...prev,
      reminders: prev.reminders.map((r) =>
        r.id === id ? { ...r, completed: !r.completed } : r
      ),
    }));
  }, []);

  const handleAddReminder = useCallback((reminder: Omit<ReminderItem, 'id'>) => {
    setWorkspace((prev) => ({
      ...prev,
      reminders: [
        { ...reminder, id: generateLocalId('rem') },
        ...prev.reminders,
      ],
    }));
  }, []);

  const handleDeleteReminder = useCallback((id: string) => {
    setWorkspace((prev) => ({
      ...prev,
      reminders: prev.reminders.filter((r) => r.id !== id),
    }));
  }, []);

  // Asset actions
  const handleAddAsset = useCallback((asset: Omit<AssetItem, 'id'>) => {
    setWorkspace((prev) => ({
      ...prev,
      assets: [{ ...asset, id: generateLocalId('ast') }, ...prev.assets],
    }));
  }, []);

  const handleUpdateAssetStatus = useCallback(
    (id: string, status: AssetItem['status']) => {
      setWorkspace((prev) => ({
        ...prev,
        assets: prev.assets.map((a) => (a.id === id ? { ...a, status } : a)),
      }));
    },
    []
  );

  const handleDeleteAsset = useCallback((id: string) => {
    setWorkspace((prev) => ({
      ...prev,
      assets: prev.assets.filter((a) => a.id !== id),
    }));
  }, []);

  // Vault / Memory actions
  const handleRestoreWorkspace = useCallback(
    (restored: WorkspaceState) => {
      setWorkspace(restored);
      setActivePackId(null);
      showToast(`"${restored.workspaceName}" başarıyla geri yüklendi.`);
    },
    [showToast]
  );

  const handleClearMemory = useCallback(() => {
    setWorkspace(
      createEmptyWorkspaceState('Tertip Çalışma Alanı', 'İşletme & Operasyon')
    );
    setActivePackId(null);
    showToast('Tüm veriler RAM bellekten temizlendi.');
  }, [showToast]);

  const isEmpty =
    workspace.documents.length === 0 &&
    workspace.chartSeries.length === 0 &&
    workspace.reminders.length === 0 &&
    workspace.assets.length === 0;

  const auditReadiness = useMemo(
    () => computeAuditReadiness(workspace),
    [workspace]
  );

  const navBadges = useMemo(() => {
    const openReminders = workspace.reminders.filter((r) => !r.completed).length;
    return {
      documents: workspace.documents.length || undefined,
      operations: openReminders || undefined,
    };
  }, [workspace.documents.length, workspace.reminders]);

  return (
    <>
      <input
        ref={globalFileInputRef}
        type="file"
        multiple
        accept={ACCEPTED_FILES}
        className="hidden"
        onChange={(e) => {
          const files = e.target.files ? Array.from(e.target.files) : [];
          if (files.length > 0) {
            setActiveTab('documents');
            void handleIngestFiles(files);
          }
          e.target.value = '';
        }}
      />

      <AppShell
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        workspaceName={workspace.workspaceName}
        sector={workspace.sector}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        onUploadClick={handleGlobalUploadClick}
        isEmpty={isEmpty}
        onLoadDemo={handleLoadDemo}
        badges={navBadges}
      >
        {activeTab === 'dashboard' && (
          <DashboardView
            workspace={workspace}
            activePackId={activePackId}
            onSelectSectorPack={handleSelectSectorPack}
            onNavigate={setActiveTab}
            onUploadClick={handleGlobalUploadClick}
            onLoadDemo={handleLoadDemo}
            onToggleReminder={handleToggleReminder}
          />
        )}

        {activeTab === 'documents' && (
          <DocumentsView
            workspace={workspace}
            documents={workspace.documents}
            ingestProgress={ingestProgress}
            onIngestFiles={(files) => void handleIngestFiles(files)}
            onDeleteDocument={handleDeleteDocument}
            onLoadDemo={handleLoadDemo}
          />
        )}

        {activeTab === 'operations' && (
          <OperationsView
            reminders={workspace.reminders}
            assets={workspace.assets}
            assetMissingIds={auditReadiness.assetMissingIds}
            onToggleReminder={handleToggleReminder}
            onAddReminder={handleAddReminder}
            onDeleteReminder={handleDeleteReminder}
            onAddAsset={handleAddAsset}
            onUpdateAssetStatus={handleUpdateAssetStatus}
            onDeleteAsset={handleDeleteAsset}
          />
        )}

        {activeTab === 'assistant' && (
          <AssistantView workspace={workspace} onLoadDemo={handleLoadDemo} />
        )}

        {activeTab === 'privacy' && (
          <PrivacyView
            workspace={workspace}
            onRestoreWorkspace={handleRestoreWorkspace}
            onClearMemory={handleClearMemory}
          />
        )}
      </AppShell>

      {/* Global Drag & Drop Overlay */}
      {globalDragOver && (
        <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-tertip-backdrop backdrop-blur-xs">
          <div className="rounded-3xl border-2 border-dashed border-tertip-gold bg-tertip-surface px-10 py-8 text-center shadow-lg">
            <UploadCloud className="mx-auto h-10 w-10 text-tertip-accent" />
            <p className="mt-3 text-base font-semibold text-tertip-ink">
              Belgeleri analiz etmek için bırakın
            </p>
            <p className="mt-1 text-xs text-tertip-ink-muted">
              %100 yerel tarayıcı işlemesi · 0 sunucu aktarımı
            </p>
          </div>
        </div>
      )}

      {/* Subtle Toast Feedback */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed inset-x-4 bottom-20 z-50 flex items-center gap-2 rounded-xl border border-tertip-border bg-tertip-surface px-4 py-2.5 text-xs font-medium text-tertip-ink shadow-md lg:inset-x-auto lg:bottom-5 lg:right-5"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0 text-tertip-success" />
          <span>{toast}</span>
        </div>
      )}
    </>
  );
}

export default App;
