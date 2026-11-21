import React, { useMemo, useRef, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Download,
  FileCheck2,
  HardDrive,
  KeyRound,
  Lock,
  Package,
  RefreshCw,
  ShieldAlert,
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
import {
  collectZeroNetworkProof,
  downloadKvkkProofReport,
  exportEncryptedVaultFile,
  exportExecutiveBriefingHtml,
  importEncryptedVaultFile,
  scanWorkspacePii,
} from '../../lib';
import type { ZeroNetworkProof } from '../../lib';
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

  // Live Zero-Network Proof Monitor
  const [networkProof, setNetworkProof] = useState<ZeroNetworkProof>(() =>
    collectZeroNetworkProof()
  );

  // Live KVKK PII Scan
  const kvkkScan = useMemo(() => scanWorkspacePii(workspace), [workspace]);

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

  const handleRefreshProof = () => {
    setNetworkProof(collectZeroNetworkProof());
  };

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
    <div className="space-y-5 sm:space-y-6">
      <SectionHeader
        eyebrow="SIFIR SUNUCU · KVKK KALKANI · ŞİFRELİ KASA"
        title="Gizlilik & Yedek"
        subtitle="Tertip hiçbir bulut veritabanı, sunucu veya tarayıcı kalıcı deposu kullanmaz. Canlı sıfır-ağ kanıtını doğrulayın, KVKK taramasını inceleyin ve şifreli .tertip kasanızı yönetin."
        as="h1"
      />

      {/* Live Zero-Network Proof Monitor */}
      <Card
        variant="elevated"
        padding="md"
        header={
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-tertip-success" />
              <h2 className="text-sm font-semibold text-tertip-ink">
                Canlı &quot;Sıfır Ağ&quot; Kanıt Monitörü
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant={networkProof.isZeroCloudVerified ? 'success' : 'warning'}
                size="sm"
                dot
              >
                {networkProof.isZeroCloudVerified
                  ? '0 Dış İstek Doğrulandı'
                  : `${networkProof.externalRequests} Dış İstek`}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                icon={<RefreshCw className="h-3.5 w-3.5" />}
                onClick={handleRefreshProof}
              >
                Yenile
              </Button>
            </div>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3">
            <div className="rounded-xl border border-tertip-border/60 bg-tertip-surface p-3">
              <p className="text-[11px] text-tertip-ink-muted">Dış Ağ İsteği</p>
              <p className="mt-0.5 font-mono text-lg font-semibold text-tertip-success">
                {networkProof.externalRequests}
              </p>
            </div>
            <div className="rounded-xl border border-tertip-border/60 bg-tertip-surface p-3">
              <p className="text-[11px] text-tertip-ink-muted">Dış Veri Aktarımı</p>
              <p className="mt-0.5 font-mono text-lg font-semibold text-tertip-success">
                {networkProof.externalBytes} B
              </p>
            </div>
            <div className="rounded-xl border border-tertip-border/60 bg-tertip-surface p-3">
              <p className="text-[11px] text-tertip-ink-muted">localStorage</p>
              <p className="mt-0.5 font-mono text-lg font-semibold text-tertip-ink">
                {networkProof.localStorageKeys} anahtar
              </p>
            </div>
            <div className="rounded-xl border border-tertip-border/60 bg-tertip-surface p-3">
              <p className="text-[11px] text-tertip-ink-muted">sessionStorage</p>
              <p className="mt-0.5 font-mono text-lg font-semibold text-tertip-ink">
                {networkProof.sessionStorageKeys} anahtar
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-tertip-ink-muted">
              Tarayıcı <code className="font-mono text-[11px]">PerformanceResourceTiming</code>{' '}
              kayıtlarına göre bu oturumda toplam{' '}
              <strong>{networkProof.sameOriginRequests}</strong> yerel kaynak
              yüklendi, dış sunuculara <strong>0 bayt</strong> gönderildi.
            </p>
            <Button
              variant="secondary"
              size="sm"
              icon={<FileCheck2 className="h-4 w-4" />}
              onClick={() => downloadKvkkProofReport(networkProof)}
              className="min-h-11 w-full shrink-0 sm:min-h-0 sm:w-auto"
            >
              KVKK Oturum Kanıt Raporu İndir
            </Button>
          </div>
        </div>
      </Card>

      {/* KVKK Shield Live PII Scan + Air-Gapped Offline Package */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card
          variant="default"
          padding="md"
          header={
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {kvkkScan.isClean ? (
                  <ShieldCheck className="h-4 w-4 text-tertip-success" />
                ) : (
                  <ShieldAlert className="h-4 w-4 text-tertip-gold" />
                )}
                <h3 className="text-sm font-semibold text-tertip-ink">
                  KVKK Kalkanı — Canlı Hassas Veri Taraması
                </h3>
              </div>
              <Badge
                variant={kvkkScan.isClean ? 'success' : 'warning'}
                size="sm"
              >
                {kvkkScan.isClean
                  ? 'Temiz'
                  : `${kvkkScan.totalMatches} Hassas Kayıt`}
              </Badge>
            </div>
          }
        >
          <div className="space-y-3">
            <p className="text-xs leading-relaxed text-tertip-ink-muted">
              Belgelerinizdeki geçerli TCKN, VKN, TR IBAN, telefon, e-posta ve
              hasta/kişi isimleri tarayıcı içinde tespit edilir ve paylaşım
              öncesinde tek tıkla maskelenir.
            </p>

            {kvkkScan.findings.length > 0 ? (
              <ul className="space-y-1.5">
                {kvkkScan.findings.map((item) => (
                  <li
                    key={item.kind}
                    className="flex items-center justify-between gap-2 rounded-lg border border-tertip-border/70 bg-tertip-surface-elevated px-3 py-2 text-xs"
                  >
                    <span className="font-medium text-tertip-ink">
                      {item.label}
                    </span>
                    <div className="flex items-center gap-2">
                      <code className="font-mono text-[11px] text-tertip-ink-muted">
                        {item.maskedSample}
                      </code>
                      <Badge variant="gold" size="sm">
                        {item.count}
                      </Badge>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="rounded-xl border border-tertip-success-border bg-tertip-success-soft p-3 text-xs text-tertip-success">
                Bellekteki belgelerde açık TCKN, IBAN veya kişisel veri tespit
                edilmedi.
              </div>
            )}

            <Button
              variant="primary"
              size="sm"
              fullWidth
              icon={<Download className="h-4 w-4" />}
              onClick={() =>
                exportExecutiveBriefingHtml(workspace, { anonymizeKvkk: true })
              }
              className="min-h-11 sm:min-h-0"
            >
              KVKK Maskeli Yönetici Brifingi İndir
            </Button>
          </div>
        </Card>

        {/* Air-Gapped Offline Single-File Package Info */}
        <Card
          variant="default"
          padding="md"
          header={
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-tertip-accent" />
                <h3 className="text-sm font-semibold text-tertip-ink">
                  Air-Gapped Çevrimdışı Paket (Tek HTML)
                </h3>
              </div>
              <Badge variant="accent" size="sm" icon={<WifiOff className="h-3 w-3" />}>
                İnternetsiz Kullanım
              </Badge>
            </div>
          }
        >
          <div className="space-y-3">
            <p className="text-xs leading-relaxed text-tertip-ink-secondary">
              Hastane içi kapalı ağlar, şantiyeler veya internet erişimi olmayan
              kurumsal bilgisayarlar için Tertip tek bir taşınabilir HTML
              dosyası olarak derlenebilir.
            </p>
            <div className="rounded-xl border border-tertip-border bg-tertip-surface-elevated p-3 font-mono text-xs text-tertip-ink">
              bun run build:airgap
            </div>
            <p className="text-xs text-tertip-ink-muted">
              Bu komut tüm CSS ve JavaScript paketlerini tek bir{' '}
              <code className="font-mono text-[11px]">
                dist-airgap/tertip-offline.html
              </code>{' '}
              dosyasına gömer; USB bellekten doğrudan çift tıklayarak
              çalıştırabilirsiniz.
            </p>

            <div className="grid grid-cols-2 gap-2.5 border-t border-tertip-border/60 pt-3">
              <div className="rounded-xl border border-tertip-border/60 bg-tertip-surface p-2.5">
                <p className="text-[11px] text-tertip-ink-muted">Bellekteki Belge</p>
                <p className="font-mono text-sm font-semibold text-tertip-ink">
                  {workspace.documents.length} belge · {workspace.assets.length} varlık
                </p>
              </div>
              <div className="rounded-xl border border-tertip-border/60 bg-tertip-surface p-2.5">
                <p className="text-[11px] text-tertip-ink-muted">Şifreleme Standardı</p>
                <p className="font-mono text-sm font-semibold text-tertip-ink">
                  AES-GCM-256
                </p>
              </div>
            </div>
          </div>
        </Card>
      </div>

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
              className="min-h-11 sm:min-h-0"
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
              icon={<Lock className="h-4 w-4" />}
              className="min-h-11 sm:min-h-0"
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
            className="min-h-11 w-full sm:min-h-0 sm:w-auto"
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
