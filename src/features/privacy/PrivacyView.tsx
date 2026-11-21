import React, { useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  HardDrive,
  KeyRound,
  Lock,
  ShieldCheck,
  Trash2,
  Upload,
  WifiOff,
} from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  Modal,
  SectionHeader,
} from '../../components/ui';
import { exportEncryptedVaultFile, importEncryptedVaultFile } from '../../lib';
import type { WorkspaceState } from '../../types';

export interface PrivacyViewProps {
  workspace: WorkspaceState;
  onRestoreWorkspace: (nextState: WorkspaceState) => void;
  onClearMemory: () => void;
}

export const PrivacyView: React.FC<PrivacyViewProps> = ({
  workspace,
  onRestoreWorkspace,
  onClearMemory,
}) => {
  const importFileInputRef = useRef<HTMLInputElement>(null);

  // Export state
  const [exportPassword, setExportPassword] = useState('');
  const [exportConfirm, setExportConfirm] = useState('');
  const [exportBusy, setExportBusy] = useState(false);
  const [exportFeedback, setExportFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Import state
  const [selectedVaultFile, setSelectedVaultFile] = useState<File | null>(null);
  const [importPassword, setImportPassword] = useState('');
  const [importBusy, setImportBusy] = useState(false);
  const [importFeedback, setImportFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Clear confirmation modal
  const [clearModalOpen, setClearModalOpen] = useState(false);

  const handleExport = async (e: React.FormEvent) => {
    e.preventDefault();
    setExportFeedback(null);

    if (exportPassword.length < 6) {
      setExportFeedback({
        type: 'error',
        text: 'Güvenli şifreleme için en az 6 karakterlik bir parola belirleyin.',
      });
      return;
    }

    if (exportPassword !== exportConfirm) {
      setExportFeedback({
        type: 'error',
        text: 'Girilen parolalar eşleşmiyor.',
      });
      return;
    }

    setExportBusy(true);
    try {
      const slug = workspace.workspaceName
        .toLocaleLowerCase('tr-TR')
        .replace(/[^a-z0-9]+/gi, '-')
        .replace(/^-+|-+$/g, '');
      const dateTag = new Date().toISOString().slice(0, 10);
      await exportEncryptedVaultFile(
        workspace,
        exportPassword,
        `${slug || 'tertip-yedek'}-${dateTag}.tertip`
      );
      setExportPassword('');
      setExportConfirm('');
      setExportFeedback({
        type: 'success',
        text: 'Şifreli .tertip kasa dosyanız AES-GCM-256 ile oluşturuldu ve bilgisayarınıza indirildi.',
      });
    } catch (err) {
      setExportFeedback({
        type: 'error',
        text:
          err instanceof Error
            ? err.message
            : 'Şifreli yedek oluşturulurken bir hata oluştu.',
      });
    } finally {
      setExportBusy(false);
    }
  };

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    setImportFeedback(null);

    if (!selectedVaultFile) {
      setImportFeedback({
        type: 'error',
        text: 'Lütfen önce bir .tertip yedek dosyası seçin.',
      });
      return;
    }

    if (!importPassword) {
      setImportFeedback({
        type: 'error',
        text: 'Kasa dosyasını açmak için parolanızı girin.',
      });
      return;
    }

    setImportBusy(true);
    try {
      const restored = await importEncryptedVaultFile(
        selectedVaultFile,
        importPassword
      );
      onRestoreWorkspace(restored);
      setImportPassword('');
      setSelectedVaultFile(null);
      if (importFileInputRef.current) {
        importFileInputRef.current.value = '';
      }
      setImportFeedback({
        type: 'success',
        text: `"${restored.workspaceName}" çalışma alanı (${restored.documents.length} belge, ${restored.reminders.length} hatırlatıcı) başarıyla RAM belleğe yüklendi.`,
      });
    } catch (err) {
      setImportFeedback({
        type: 'error',
        text:
          err instanceof Error
            ? err.message
            : 'Dosya çözülemedi. Parolanızı veya dosya bütünlüğünü kontrol edin.',
      });
    } finally {
      setImportBusy(false);
    }
  };

  const confirmClearMemory = () => {
    onClearMemory();
    setClearModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="SIFIR SUNUCU · ŞİFRELİ YEREL KASA"
        title="Gizlilik & Yedek"
        subtitle="Tertip hiçbir bulut veritabanı, sunucu veya tarayıcı kalıcı deposu kullanmaz. Çalışmanızı parolalı AES-GCM-256 .tertip dosyası olarak saklayın."
        as="h1"
      />

      {/* Transparent Privacy Status Card */}
      <Card variant="elevated" padding="md">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-tertip-success-soft text-tertip-success">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-semibold text-tertip-ink">
                  %100 Yerel RAM Modu Aktif
                </h2>
                <Badge variant="success" size="sm" dot>
                  0 Sunucu · 0 Uzak Veritabanı
                </Badge>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-tertip-ink-secondary">
                Yüklediğiniz tüm Excel, PDF, sunum ve görsel verileri yalnızca
                bu sekmenin geçici belleğinde (RAM) tutulur.{' '}
                <code className="font-mono text-[11px]">localStorage</code>,{' '}
                <code className="font-mono text-[11px]">IndexedDB</code> veya
                üçüncü parti analitik çerezi yazılmaz. Sekme kapandığında bellek
                temizlenir.
              </p>
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap gap-2">
            <Badge variant="neutral" size="sm" icon={<WifiOff className="h-3 w-3" />}>
              Çevrimdışı Çalışır
            </Badge>
            <Badge variant="gold" size="sm" icon={<Lock className="h-3 w-3" />}>
              PBKDF2 + AES-GCM-256
            </Badge>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 border-t border-tertip-border/60 pt-4 sm:grid-cols-4">
          <div className="rounded-xl bg-tertip-surface p-3 border border-tertip-border/60">
            <p className="text-[11px] text-tertip-ink-muted">Bellekteki Belge</p>
            <p className="mt-0.5 font-mono text-lg font-semibold text-tertip-ink">
              {workspace.documents.length}
            </p>
          </div>
          <div className="rounded-xl bg-tertip-surface p-3 border border-tertip-border/60">
            <p className="text-[11px] text-tertip-ink-muted">Grafik Dönemi</p>
            <p className="mt-0.5 font-mono text-lg font-semibold text-tertip-ink">
              {workspace.chartSeries.length}
            </p>
          </div>
          <div className="rounded-xl bg-tertip-surface p-3 border border-tertip-border/60">
            <p className="text-[11px] text-tertip-ink-muted">Varlık & Alan</p>
            <p className="mt-0.5 font-mono text-lg font-semibold text-tertip-ink">
              {workspace.assets.length}
            </p>
          </div>
          <div className="rounded-xl bg-tertip-surface p-3 border border-tertip-border/60">
            <p className="text-[11px] text-tertip-ink-muted">Hatırlatıcı</p>
            <p className="mt-0.5 font-mono text-lg font-semibold text-tertip-ink">
              {workspace.reminders.length}
            </p>
          </div>
        </div>
      </Card>

      {/* Export & Import Grid */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Export Encrypted Vault */}
        <Card
          variant="default"
          padding="md"
          header={
            <div className="flex items-center gap-2">
              <Download className="h-4 w-4 text-tertip-accent" />
              <h3 className="text-sm font-semibold text-tertip-ink">
                Şifreli .tertip Yedeği Dışa Aktar
              </h3>
            </div>
          }
        >
          <form onSubmit={handleExport} className="space-y-4">
            <p className="text-xs leading-relaxed text-tertip-ink-muted">
              Tüm belgelerinizi, grafik serilerinizi, varlıklarınızı ve
              hatırlatıcılarınızı Web Crypto API (PBKDF2-SHA256 250.000 tur +
              AES-GCM-256) ile şifreleyip tek bir{' '}
              <code className="font-mono">.tertip</code> dosyasına indirin.
            </p>

            <div>
              <label className="mb-1 block text-xs font-medium text-tertip-ink">
                Kasa Parolası (En az 6 karakter)
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={exportPassword}
                onChange={(e) => setExportPassword(e.target.value)}
                placeholder="Güçlü bir parola belirleyin..."
                className="w-full rounded-xl border border-tertip-border bg-tertip-surface px-3 py-2 text-sm text-tertip-ink focus:border-tertip-accent focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-tertip-ink">
                Parola Tekrar
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={exportConfirm}
                onChange={(e) => setExportConfirm(e.target.value)}
                placeholder="Parolanızı tekrar girin..."
                className="w-full rounded-xl border border-tertip-border bg-tertip-surface px-3 py-2 text-sm text-tertip-ink focus:border-tertip-accent focus:outline-none"
              />
            </div>

            {exportFeedback && (
              <div
                className={`flex items-start gap-2 rounded-xl border p-3 text-xs ${
                  exportFeedback.type === 'success'
                    ? 'border-tertip-success-border bg-tertip-success-soft text-tertip-success'
                    : 'border-tertip-danger-border bg-tertip-danger-soft text-tertip-danger'
                }`}
              >
                {exportFeedback.type === 'success' ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                ) : (
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                )}
                <span>{exportFeedback.text}</span>
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              fullWidth
              loading={exportBusy}
              icon={<KeyRound className="h-4 w-4" />}
            >
              Şifreli .tertip Dosyasını İndir
            </Button>
          </form>
        </Card>

        {/* Import Encrypted Vault */}
        <Card
          variant="default"
          padding="md"
          header={
            <div className="flex items-center gap-2">
              <Upload className="h-4 w-4 text-tertip-gold" />
              <h3 className="text-sm font-semibold text-tertip-ink">
                Şifreli .tertip Yedeğinden Geri Yükle
              </h3>
            </div>
          }
        >
          <form onSubmit={handleImport} className="space-y-4">
            <p className="text-xs leading-relaxed text-tertip-ink-muted">
              Daha önce bilgisayarınıza kaydettiğiniz{' '}
              <code className="font-mono">.tertip</code> dosyasını seçip
              parolanızı girin. Çözümleme tamamen tarayıcınızda yapılır.
            </p>

            <div>
              <label className="mb-1 block text-xs font-medium text-tertip-ink">
                .tertip Kasa Dosyası
              </label>
              <input
                ref={importFileInputRef}
                type="file"
                accept=".tertip,application/json"
                onChange={(e) =>
                  setSelectedVaultFile(e.target.files?.[0] ?? null)
                }
                className="w-full rounded-xl border border-tertip-border bg-tertip-surface px-3 py-2 text-xs text-tertip-ink file:mr-3 file:rounded-lg file:border-0 file:bg-tertip-accent-soft file:px-3 file:py-1 file:text-xs file:font-medium file:text-tertip-accent"
              />
              {selectedVaultFile && (
                <p className="mt-1 flex items-center gap-1 text-[11px] text-tertip-ink-muted">
                  <HardDrive className="h-3 w-3" />
                  Seçili: <span className="font-mono">{selectedVaultFile.name}</span>
                </p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-tertip-ink">
                Kasa Parolası
              </label>
              <input
                type="password"
                required
                value={importPassword}
                onChange={(e) => setImportPassword(e.target.value)}
                placeholder="Yedeği oluştururken kullandığınız parola..."
                className="w-full rounded-xl border border-tertip-border bg-tertip-surface px-3 py-2 text-sm text-tertip-ink focus:border-tertip-accent focus:outline-none"
              />
            </div>

            {importFeedback && (
              <div
                className={`flex items-start gap-2 rounded-xl border p-3 text-xs ${
                  importFeedback.type === 'success'
                    ? 'border-tertip-success-border bg-tertip-success-soft text-tertip-success'
                    : 'border-tertip-danger-border bg-tertip-danger-soft text-tertip-danger'
                }`}
              >
                {importFeedback.type === 'success' ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                ) : (
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                )}
                <span>{importFeedback.text}</span>
              </div>
            )}

            <Button
              type="submit"
              variant="secondary"
              fullWidth
              loading={importBusy}
              icon={<Upload className="h-4 w-4" />}
            >
              Şifreyi Çöz ve RAM&apos;e Yükle
            </Button>
          </form>
        </Card>
      </div>

      {/* Instant Clear Memory Danger Zone */}
      <Card variant="default" padding="md">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-semibold text-tertip-danger">
              Anında Bellek Temizliği
            </h3>
            <p className="mt-1 text-xs text-tertip-ink-muted">
              Oturumunuzu bitirirken tüm belgeleri, grafikleri, varlıkları ve
              hatırlatıcıları RAM bellekten tek tıkla sıfırlayın.
            </p>
          </div>
          <Button
            variant="danger"
            icon={<Trash2 className="h-4 w-4" />}
            onClick={() => setClearModalOpen(true)}
          >
            Belleği Temizle (Tüm Verileri Sıfırla)
          </Button>
        </div>
      </Card>

      {/* Confirmation Modal */}
      <Modal
        open={clearModalOpen}
        onClose={() => setClearModalOpen(false)}
        title="Belleği Temizlemek İstediğinize Emin misiniz?"
        subtitle="Bu işlem RAM bellekteki tüm belgeleri, grafikleri, varlıkları ve hatırlatıcıları sıfırlar."
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => setClearModalOpen(false)}
            >
              Vazgeç
            </Button>
            <Button
              variant="danger"
              icon={<Trash2 className="h-4 w-4" />}
              onClick={confirmClearMemory}
            >
              Evet, Belleği Temizle
            </Button>
          </div>
        }
      >
        <p className="text-xs leading-relaxed text-tertip-ink-secondary">
          Henüz <code className="font-mono">.tertip</code> yedeği almadıysanız
          bu oturumdaki tüm çalışma kaybolacaktır. Devam etmek istiyor musunuz?
        </p>
      </Modal>
    </div>
  );
};
