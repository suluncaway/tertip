import React, { useMemo, useState } from 'react';
import {
  Building2,
  CalendarClock,
  CheckCircle2,
  Circle,
  Cpu,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Wrench,
} from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Modal,
  SectionHeader,
} from '../../components/ui';
import type { AssetItem, ReminderItem } from '../../types';

export interface OperationsViewProps {
  reminders: ReminderItem[];
  assets: AssetItem[];
  onToggleReminder: (id: string) => void;
  onAddReminder: (reminder: Omit<ReminderItem, 'id'>) => void;
  onDeleteReminder: (id: string) => void;
  onAddAsset: (asset: Omit<AssetItem, 'id'>) => void;
  onUpdateAssetStatus: (id: string, status: AssetItem['status']) => void;
  onDeleteAsset: (id: string) => void;
}

const REMINDER_CATEGORIES: {
  key: 'all' | ReminderItem['category'];
  label: string;
}[] = [
  { key: 'all', label: 'Tümü' },
  { key: 'maintenance', label: 'Bakım' },
  { key: 'sut', label: 'SUT' },
  { key: 'finance', label: 'Finans' },
  { key: 'meeting', label: 'Toplantı' },
  { key: 'other', label: 'Diğer' },
];

const CATEGORY_LABEL: Record<ReminderItem['category'], string> = {
  maintenance: 'Bakım',
  sut: 'SUT',
  finance: 'Finans',
  meeting: 'Toplantı',
  other: 'Diğer',
};

const ASSET_STATUS_META: Record<
  AssetItem['status'],
  { label: string; variant: 'success' | 'warning' | 'danger' }
> = {
  active: { label: 'Aktif', variant: 'success' },
  maintenance: { label: 'Bakımda', variant: 'warning' },
  attention: { label: 'Dikkat Gerekiyor', variant: 'danger' },
};

function formatDateTr(isoDate?: string): string {
  if (!isoDate) return 'Belirtilmedi';
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function getTodayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export const OperationsView: React.FC<OperationsViewProps> = ({
  reminders,
  assets,
  onToggleReminder,
  onAddReminder,
  onDeleteReminder,
  onAddAsset,
  onUpdateAssetStatus,
  onDeleteAsset,
}) => {
  const [activeSection, setActiveSection] = useState<'reminders' | 'assets'>(
    'reminders'
  );

  // Reminders state
  const [categoryFilter, setCategoryFilter] = useState<
    'all' | ReminderItem['category']
  >('all');
  const [showCompleted, setShowCompleted] = useState(true);
  const [reminderModalOpen, setReminderModalOpen] = useState(false);
  const [remTitle, setRemTitle] = useState('');
  const [remDueDate, setRemDueDate] = useState(getTodayIso());
  const [remPriority, setRemPriority] =
    useState<ReminderItem['priority']>('medium');
  const [remCategory, setRemCategory] =
    useState<ReminderItem['category']>('maintenance');
  const [remAssetId, setRemAssetId] = useState('');
  const [remNotes, setRemNotes] = useState('');

  // Assets state
  const [assetStatusFilter, setAssetStatusFilter] = useState<
    'all' | AssetItem['status']
  >('all');
  const [assetSearch, setAssetSearch] = useState('');
  const [assetModalOpen, setAssetModalOpen] = useState(false);
  const [assetName, setAssetName] = useState('');
  const [assetCode, setAssetCode] = useState('');
  const [assetDepartment, setAssetDepartment] = useState('');
  const [assetCategory, setAssetCategory] = useState('Tıbbi Cihaz');
  const [assetStatus, setAssetStatus] = useState<AssetItem['status']>('active');
  const [assetNextMaint, setAssetNextMaint] = useState('');
  const [assetNotes, setAssetNotes] = useState('');

  const filteredReminders = useMemo(() => {
    const priorityRank = { high: 0, medium: 1, low: 2 };
    return reminders
      .filter((r) => {
        if (categoryFilter !== 'all' && r.category !== categoryFilter) {
          return false;
        }
        if (!showCompleted && r.completed) return false;
        return true;
      })
      .sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        const pDiff = priorityRank[a.priority] - priorityRank[b.priority];
        if (pDiff !== 0) return pDiff;
        return a.dueDate.localeCompare(b.dueDate);
      });
  }, [reminders, categoryFilter, showCompleted]);

  const filteredAssets = useMemo(() => {
    const q = assetSearch.trim().toLocaleLowerCase('tr-TR');
    return assets.filter((a) => {
      if (assetStatusFilter !== 'all' && a.status !== assetStatusFilter) {
        return false;
      }
      if (!q) return true;
      return (
        a.name.toLocaleLowerCase('tr-TR').includes(q) ||
        (a.code ?? '').toLocaleLowerCase('tr-TR').includes(q) ||
        a.department.toLocaleLowerCase('tr-TR').includes(q) ||
        a.category.toLocaleLowerCase('tr-TR').includes(q)
      );
    });
  }, [assets, assetStatusFilter, assetSearch]);

  const openRemindersCount = reminders.filter((r) => !r.completed).length;

  const handleCreateReminder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!remTitle.trim()) return;
    onAddReminder({
      title: remTitle.trim(),
      dueDate: remDueDate || getTodayIso(),
      priority: remPriority,
      category: remCategory,
      completed: false,
      assetId: remAssetId || undefined,
      autoExtracted: false,
      notes: remNotes.trim() || undefined,
    });
    setRemTitle('');
    setRemNotes('');
    setRemAssetId('');
    setReminderModalOpen(false);
  };

  const handleCreateAsset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assetName.trim()) return;
    onAddAsset({
      name: assetName.trim(),
      code: assetCode.trim() || undefined,
      department: assetDepartment.trim() || 'Genel',
      category: assetCategory.trim() || 'Cihaz',
      status: assetStatus,
      nextMaintenanceDate: assetNextMaint || undefined,
      notes: assetNotes.trim() || undefined,
      linkedDocIds: [],
    });
    setAssetName('');
    setAssetCode('');
    setAssetDepartment('');
    setAssetNextMaint('');
    setAssetNotes('');
    setAssetModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="OPERASYON & TAKİP"
        title="Operasyon & Hatırlatıcılar"
        subtitle="Bakım takvimleri, SUT/mevzuat teslim tarihleri, tıbbi cihazlar ve tesis/alan kontrollerini tek yerden yönetin."
        as="h1"
        actions={
          activeSection === 'reminders' ? (
            <Button
              variant="primary"
              size="sm"
              icon={<Plus className="h-4 w-4" />}
              onClick={() => setReminderModalOpen(true)}
            >
              Hatırlatıcı Ekle
            </Button>
          ) : (
            <Button
              variant="primary"
              size="sm"
              icon={<Plus className="h-4 w-4" />}
              onClick={() => setAssetModalOpen(true)}
            >
              Varlık / Alan Ekle
            </Button>
          )
        }
      />

      {/* Two-Tab Segmented Switcher */}
      <div className="inline-flex rounded-xl border border-tertip-border bg-tertip-surface-elevated p-1">
        <button
          type="button"
          onClick={() => setActiveSection('reminders')}
          className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            activeSection === 'reminders'
              ? 'bg-tertip-accent text-tertip-accent-ink shadow-xs'
              : 'text-tertip-ink-secondary hover:text-tertip-ink'
          }`}
        >
          <CalendarClock className="h-4 w-4" />
          Hatırlatıcılar & Süreçler
          <span
            className={`rounded-full px-1.5 py-0.5 text-[11px] font-mono ${
              activeSection === 'reminders'
                ? 'bg-white/20 text-tertip-accent-ink'
                : 'bg-tertip-surface-subtle text-tertip-ink-muted'
            }`}
          >
            {openRemindersCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('assets')}
          className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            activeSection === 'assets'
              ? 'bg-tertip-accent text-tertip-accent-ink shadow-xs'
              : 'text-tertip-ink-secondary hover:text-tertip-ink'
          }`}
        >
          <Building2 className="h-4 w-4" />
          Varlık & Alan Takibi
          <span
            className={`rounded-full px-1.5 py-0.5 text-[11px] font-mono ${
              activeSection === 'assets'
                ? 'bg-white/20 text-tertip-accent-ink'
                : 'bg-tertip-surface-subtle text-tertip-ink-muted'
            }`}
          >
            {assets.length}
          </span>
        </button>
      </div>

      {/* SECTION 1: REMINDERS */}
      {activeSection === 'reminders' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
              {REMINDER_CATEGORIES.map((cat) => (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => setCategoryFilter(cat.key)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                    categoryFilter === cat.key
                      ? 'bg-tertip-accent text-tertip-accent-ink'
                      : 'bg-tertip-surface-subtle text-tertip-ink-secondary hover:bg-tertip-border/60'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-tertip-ink-muted">
              <input
                type="checkbox"
                checked={showCompleted}
                onChange={(e) => setShowCompleted(e.target.checked)}
                className="h-3.5 w-3.5 accent-tertip-accent"
              />
              Tamamlananları göster
            </label>
          </div>

          {filteredReminders.length === 0 ? (
            <Card variant="default" padding="lg">
              <EmptyState
                icon={<CalendarClock className="h-6 w-6" />}
                title="Bu filtrede hatırlatıcı yok"
                description="Belgelerinizden otomatik çıkarılan görevler burada listelenir; dilerseniz manuel hatırlatıcı da ekleyebilirsiniz."
                action={
                  <Button
                    variant="primary"
                    size="sm"
                    icon={<Plus className="h-4 w-4" />}
                    onClick={() => setReminderModalOpen(true)}
                  >
                    Yeni Hatırlatıcı Ekle
                  </Button>
                }
              />
            </Card>
          ) : (
            <div className="space-y-2.5">
              {filteredReminders.map((item) => {
                const linkedAsset = assets.find((a) => a.id === item.assetId);
                return (
                  <Card
                    key={item.id}
                    variant="default"
                    padding="sm"
                    className={item.completed ? 'opacity-65' : ''}
                  >
                    <div className="flex items-start justify-between gap-3 px-1">
                      <div className="flex items-start gap-3 min-w-0">
                        <button
                          type="button"
                          onClick={() => onToggleReminder(item.id)}
                          className="mt-0.5 shrink-0 text-tertip-accent transition-transform hover:scale-110"
                          aria-label={
                            item.completed
                              ? `"${item.title}" görevini yeniden aç`
                              : `"${item.title}" görevini tamamla`
                          }
                        >
                          {item.completed ? (
                            <CheckCircle2 className="h-5 w-5 text-tertip-success" />
                          ) : (
                            <Circle className="h-5 w-5 text-tertip-ink-muted" />
                          )}
                        </button>

                        <div className="min-w-0">
                          <p
                            className={`text-sm font-medium ${
                              item.completed
                                ? 'line-through text-tertip-ink-muted'
                                : 'text-tertip-ink'
                            }`}
                          >
                            {item.title}
                          </p>
                          {item.notes && (
                            <p className="mt-0.5 text-xs text-tertip-ink-muted">
                              {item.notes}
                            </p>
                          )}
                          <div className="mt-2 flex flex-wrap items-center gap-1.5">
                            <Badge variant="neutral" size="sm">
                              {CATEGORY_LABEL[item.category]}
                            </Badge>
                            <Badge
                              variant={
                                item.priority === 'high'
                                  ? 'danger'
                                  : item.priority === 'medium'
                                    ? 'warning'
                                    : 'neutral'
                              }
                              size="sm"
                              dot
                            >
                              {item.priority === 'high'
                                ? 'Acil'
                                : item.priority === 'medium'
                                  ? 'Orta'
                                  : 'Normal'}
                            </Badge>
                            {item.autoExtracted && (
                              <Badge
                                variant="accent"
                                size="sm"
                                icon={<Sparkles className="h-3 w-3" />}
                              >
                                Otomatik Çıkarıldı
                              </Badge>
                            )}
                            {linkedAsset && (
                              <Badge variant="gold" size="sm">
                                {linkedAsset.name}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-2">
                        <span className="rounded-lg bg-tertip-surface-subtle px-2.5 py-1 font-mono text-xs text-tertip-ink-secondary">
                          {formatDateTr(item.dueDate)}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label={`${item.title} hatırlatıcısını sil`}
                          onClick={() => onDeleteReminder(item.id)}
                        >
                          <Trash2 className="h-4 w-4 text-tertip-danger" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SECTION 2: ASSETS & FACILITIES */}
      {activeSection === 'assets' && (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-tertip-ink-muted" />
              <input
                type="search"
                value={assetSearch}
                onChange={(e) => setAssetSearch(e.target.value)}
                placeholder="Cihaz, poliklinik, alan veya kod ara..."
                className="w-full rounded-xl border border-tertip-border bg-tertip-surface py-2 pl-9 pr-3 text-sm text-tertip-ink placeholder:text-tertip-ink-muted focus:border-tertip-accent focus:outline-none"
              />
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {(
                [
                  ['all', 'Tümü'],
                  ['active', 'Aktif'],
                  ['maintenance', 'Bakımda'],
                  ['attention', 'Dikkat Gerekiyor'],
                ] as const
              ).map(([statusKey, label]) => (
                <button
                  key={statusKey}
                  type="button"
                  onClick={() => setAssetStatusFilter(statusKey)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                    assetStatusFilter === statusKey
                      ? 'bg-tertip-accent text-tertip-accent-ink'
                      : 'bg-tertip-surface-subtle text-tertip-ink-secondary hover:bg-tertip-border/60'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {filteredAssets.length === 0 ? (
            <Card variant="default" padding="lg">
              <EmptyState
                icon={<Cpu className="h-6 w-6" />}
                title="Kayıtlı varlık veya alan bulunamadı"
                description="Tıbbi cihazlar, ameliyathane, poliklinik veya bakım alanlarını ekleyerek periyodik bakımlarını takip edin."
                action={
                  <Button
                    variant="primary"
                    size="sm"
                    icon={<Plus className="h-4 w-4" />}
                    onClick={() => setAssetModalOpen(true)}
                  >
                    Yeni Varlık / Alan Ekle
                  </Button>
                }
              />
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {filteredAssets.map((asset) => {
                const statusMeta = ASSET_STATUS_META[asset.status];
                return (
                  <Card key={asset.id} variant="default" padding="md">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm font-semibold text-tertip-ink">
                            {asset.name}
                          </h3>
                          {asset.code && (
                            <span className="rounded bg-tertip-surface-subtle px-1.5 py-0.5 font-mono text-[11px] text-tertip-ink-muted">
                              {asset.code}
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-xs text-tertip-ink-muted">
                          {asset.department} · {asset.category}
                        </p>
                      </div>

                      <Badge variant={statusMeta.variant} size="sm" dot>
                        {statusMeta.label}
                      </Badge>
                    </div>

                    {asset.notes && (
                      <p className="mt-3 text-xs leading-relaxed text-tertip-ink-secondary">
                        {asset.notes}
                      </p>
                    )}

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-tertip-border/60 pt-3">
                      <div className="inline-flex items-center gap-1.5 text-xs text-tertip-ink-muted">
                        <Wrench className="h-3.5 w-3.5 text-tertip-gold" />
                        <span>Sonraki bakım:</span>
                        <span className="font-mono text-tertip-ink">
                          {formatDateTr(asset.nextMaintenanceDate)}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <select
                          aria-label={`${asset.name} durumu`}
                          value={asset.status}
                          onChange={(e) =>
                            onUpdateAssetStatus(
                              asset.id,
                              e.target.value as AssetItem['status']
                            )
                          }
                          className="rounded-lg border border-tertip-border bg-tertip-surface-elevated px-2 py-1 text-xs text-tertip-ink focus:border-tertip-accent focus:outline-none"
                        >
                          <option value="active">Aktif</option>
                          <option value="maintenance">Bakımda</option>
                          <option value="attention">Dikkat Gerekiyor</option>
                        </select>
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label={`${asset.name} varlığını sil`}
                          onClick={() => onDeleteAsset(asset.id)}
                        >
                          <Trash2 className="h-4 w-4 text-tertip-danger" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Add Manual Reminder Modal */}
      <Modal
        open={reminderModalOpen}
        onClose={() => setReminderModalOpen(false)}
        title="Yeni Hatırlatıcı Ekle"
        subtitle="Bakım, SUT raporu, finansal ödeme veya kurul toplantısı planlayın."
        size="md"
      >
        <form onSubmit={handleCreateReminder} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-tertip-ink">
              Görev / Hatırlatıcı Başlığı *
            </label>
            <input
              type="text"
              required
              value={remTitle}
              onChange={(e) => setRemTitle(e.target.value)}
              placeholder="Örn: MR Cihazı yıllık kalibrasyon kontrolü"
              className="w-full rounded-xl border border-tertip-border bg-tertip-surface px-3 py-2 text-sm text-tertip-ink focus:border-tertip-accent focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-tertip-ink">
                Son Tarih
              </label>
              <input
                type="date"
                value={remDueDate}
                onChange={(e) => setRemDueDate(e.target.value)}
                className="w-full rounded-xl border border-tertip-border bg-tertip-surface px-3 py-2 text-sm text-tertip-ink focus:border-tertip-accent focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-tertip-ink">
                Kategori
              </label>
              <select
                value={remCategory}
                onChange={(e) =>
                  setRemCategory(e.target.value as ReminderItem['category'])
                }
                className="w-full rounded-xl border border-tertip-border bg-tertip-surface px-3 py-2 text-sm text-tertip-ink focus:border-tertip-accent focus:outline-none"
              >
                <option value="maintenance">Bakım</option>
                <option value="sut">SUT</option>
                <option value="finance">Finans</option>
                <option value="meeting">Toplantı</option>
                <option value="other">Diğer</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-tertip-ink">
                Öncelik
              </label>
              <select
                value={remPriority}
                onChange={(e) =>
                  setRemPriority(e.target.value as ReminderItem['priority'])
                }
                className="w-full rounded-xl border border-tertip-border bg-tertip-surface px-3 py-2 text-sm text-tertip-ink focus:border-tertip-accent focus:outline-none"
              >
                <option value="high">Acil</option>
                <option value="medium">Orta</option>
                <option value="low">Normal</option>
              </select>
            </div>
          </div>

          {assets.length > 0 && (
            <div>
              <label className="mb-1 block text-xs font-medium text-tertip-ink">
                İlgili Varlık / Alan (İsteğe Bağlı)
              </label>
              <select
                value={remAssetId}
                onChange={(e) => setRemAssetId(e.target.value)}
                className="w-full rounded-xl border border-tertip-border bg-tertip-surface px-3 py-2 text-sm text-tertip-ink focus:border-tertip-accent focus:outline-none"
              >
                <option value="">Seçilmedi</option>
                {assets.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.department})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs font-medium text-tertip-ink">
              Notlar
            </label>
            <textarea
              rows={2}
              value={remNotes}
              onChange={(e) => setRemNotes(e.target.value)}
              placeholder="Sorumlu ekip, belge numarası veya ek bilgi..."
              className="w-full rounded-xl border border-tertip-border bg-tertip-surface px-3 py-2 text-sm text-tertip-ink focus:border-tertip-accent focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setReminderModalOpen(false)}
            >
              İptal
            </Button>
            <Button type="submit" variant="primary">
              Hatırlatıcıyı Kaydet
            </Button>
          </div>
        </form>
      </Modal>

      {/* Add Asset Modal */}
      <Modal
        open={assetModalOpen}
        onClose={() => setAssetModalOpen(false)}
        title="Yeni Varlık veya Alan Ekle"
        subtitle="Tıbbi cihaz, teknik ekipman, poliklinik veya bakım alanı tanımlayın."
        size="md"
      >
        <form onSubmit={handleCreateAsset} className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-tertip-ink">
                Varlık / Alan Adı *
              </label>
              <input
                type="text"
                required
                value={assetName}
                onChange={(e) => setAssetName(e.target.value)}
                placeholder="Örn: Siemens Somatom BT Cihazı veya Poliklinik 2 WC"
                className="w-full rounded-xl border border-tertip-border bg-tertip-surface px-3 py-2 text-sm text-tertip-ink focus:border-tertip-accent focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-tertip-ink">
                Envanter Kodu
              </label>
              <input
                type="text"
                value={assetCode}
                onChange={(e) => setAssetCode(e.target.value)}
                placeholder="Örn: CHZ-2026-05"
                className="w-full rounded-xl border border-tertip-border bg-tertip-surface px-3 py-2 font-mono text-sm text-tertip-ink focus:border-tertip-accent focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-tertip-ink">
                Bölüm / Konum
              </label>
              <input
                type="text"
                value={assetDepartment}
                onChange={(e) => setAssetDepartment(e.target.value)}
                placeholder="Örn: Radyoloji, Ameliyathane, Poliklinik"
                className="w-full rounded-xl border border-tertip-border bg-tertip-surface px-3 py-2 text-sm text-tertip-ink focus:border-tertip-accent focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-tertip-ink">
                Kategori
              </label>
              <select
                value={assetCategory}
                onChange={(e) => setAssetCategory(e.target.value)}
                className="w-full rounded-xl border border-tertip-border bg-tertip-surface px-3 py-2 text-sm text-tertip-ink focus:border-tertip-accent focus:outline-none"
              >
                <option value="Tıbbi Cihaz">Tıbbi Cihaz</option>
                <option value="Poliklinik / Oda">Poliklinik / Oda</option>
                <option value="Bakım Alanı / Tesis">Bakım Alanı / Tesis</option>
                <option value="Teknik Altyapı">Teknik Altyapı</option>
                <option value="Ekipman">Ekipman</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-tertip-ink">
                Durum
              </label>
              <select
                value={assetStatus}
                onChange={(e) =>
                  setAssetStatus(e.target.value as AssetItem['status'])
                }
                className="w-full rounded-xl border border-tertip-border bg-tertip-surface px-3 py-2 text-sm text-tertip-ink focus:border-tertip-accent focus:outline-none"
              >
                <option value="active">Aktif</option>
                <option value="maintenance">Bakımda</option>
                <option value="attention">Dikkat Gerekiyor</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-tertip-ink">
                Sonraki Bakım Tarihi
              </label>
              <input
                type="date"
                value={assetNextMaint}
                onChange={(e) => setAssetNextMaint(e.target.value)}
                className="w-full rounded-xl border border-tertip-border bg-tertip-surface px-3 py-2 text-sm text-tertip-ink focus:border-tertip-accent focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-tertip-ink">
              Bakım / Operasyon Notu
            </label>
            <textarea
              rows={2}
              value={assetNotes}
              onChange={(e) => setAssetNotes(e.target.value)}
              placeholder="Garanti süresi, servis firması veya periyodik kontrol detayları..."
              className="w-full rounded-xl border border-tertip-border bg-tertip-surface px-3 py-2 text-sm text-tertip-ink focus:border-tertip-accent focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setAssetModalOpen(false)}
            >
              İptal
            </Button>
            <Button type="submit" variant="primary">
              Varlığı Kaydet
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
