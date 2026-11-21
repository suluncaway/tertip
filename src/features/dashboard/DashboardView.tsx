import React, { useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Circle,
  Database,
  Download,
  FileSpreadsheet,
  FolderOpen,
  Printer,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Upload,
  Wallet,
  Wrench,
} from 'lucide-react';
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  AuditReadinessGauge,
  Badge,
  Button,
  Card,
  EmptyState,
  MorningBriefingCard,
  SectionHeader,
  SectorPackPicker,
  StatCard,
} from '../../components/ui';
import {
  SECTOR_PACKS,
  computeAuditReadiness,
  exportExecutiveBriefingHtml,
  printExecutiveBriefing,
} from '../../lib';
import type { NavTab, ReminderItem, WorkspaceState } from '../../types';

export interface DashboardViewProps {
  workspace: WorkspaceState;
  activePackId: string | null;
  onSelectSectorPack: (packId: string) => void;
  onNavigate: (tab: NavTab) => void;
  onUploadClick: () => void;
  onLoadDemo: () => void;
  onToggleReminder: (id: string) => void;
}

const REMINDER_CATEGORY_META: Record<
  ReminderItem['category'],
  { label: string; color: string }
> = {
  maintenance: { label: 'Bakım & Kalibrasyon', color: 'var(--tertip-chart-1)' },
  sut: { label: 'SUT & Mevzuat', color: 'var(--tertip-chart-2)' },
  finance: { label: 'Finans & Fatura', color: 'var(--tertip-chart-3)' },
  meeting: { label: 'Toplantı & Kurul', color: 'var(--tertip-chart-4)' },
  other: { label: 'Diğer Operasyon', color: 'var(--tertip-chart-5)' },
};

function formatCurrencyCompact(value: number): string {
  if (!Number.isFinite(value)) return '₺0';
  const abs = Math.abs(value);
  if (abs >= 1_000_000) {
    return `₺${(value / 1_000_000).toLocaleString('tr-TR', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 2,
    })}M`;
  }
  if (abs >= 1_000) {
    return `₺${(value / 1_000).toLocaleString('tr-TR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 1,
    })}B`;
  }
  return `₺${value.toLocaleString('tr-TR')}`;
}

function formatNumber(value: number): string {
  return value.toLocaleString('tr-TR');
}

function formatDateTr(isoDate: string): string {
  const parsed = new Date(isoDate);
  if (Number.isNaN(parsed.getTime())) return isoDate;
  return parsed.toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function getPriorityBadgeVariant(priority: ReminderItem['priority']) {
  if (priority === 'high') return 'danger' as const;
  if (priority === 'medium') return 'warning' as const;
  return 'neutral' as const;
}

function getPriorityLabel(priority: ReminderItem['priority']) {
  if (priority === 'high') return 'Acil';
  if (priority === 'medium') return 'Orta';
  return 'Normal';
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  workspace,
  activePackId,
  onSelectSectorPack,
  onNavigate,
  onUploadClick,
  onLoadDemo,
  onToggleReminder,
}) => {
  const [anonymizeBriefing, setAnonymizeBriefing] = useState(true);

  const isEmpty =
    workspace.documents.length === 0 &&
    workspace.chartSeries.length === 0 &&
    workspace.reminders.length === 0 &&
    workspace.assets.length === 0;

  const packOptions = useMemo(
    () =>
      SECTOR_PACKS.map((p) => ({
        id: p.id,
        name: p.name,
        badge: p.badge,
        description: p.description,
      })),
    []
  );

  const readiness = useMemo(
    () => computeAuditReadiness(workspace),
    [workspace]
  );

  const kpis = useMemo(() => {
    const series = workspace.chartSeries;
    const totalPatients = series.reduce((acc, s) => acc + (s.patients ?? 0), 0);
    const totalRevenue = series.reduce((acc, s) => acc + (s.revenue ?? 0), 0);
    const totalCost = series.reduce((acc, s) => acc + (s.cost ?? 0), 0);
    const totalProfit =
      series.reduce((acc, s) => acc + (s.profit ?? 0), 0) ||
      Math.max(0, totalRevenue - totalCost);

    const avgMargin =
      totalRevenue > 0
        ? (totalProfit / totalRevenue) * 100
        : series.length > 0
          ? series.reduce((acc, s) => acc + (s.margin ?? 0), 0) / series.length
          : 0;

    const latest = series.length > 0 ? series[series.length - 1] : undefined;
    const prev = series.length > 1 ? series[series.length - 2] : undefined;

    const patientTrend =
      latest?.patients && prev?.patients && prev.patients > 0
        ? ((latest.patients - prev.patients) / prev.patients) * 100
        : null;

    const revenueTrend =
      latest?.revenue && prev?.revenue && prev.revenue > 0
        ? ((latest.revenue - prev.revenue) / prev.revenue) * 100
        : null;

    const marginDelta =
      latest?.margin !== undefined && prev?.margin !== undefined
        ? latest.margin - prev.margin
        : null;

    const openReminders = workspace.reminders.filter((r) => !r.completed);
    const urgentCount = openReminders.filter((r) => r.priority === 'high').length;
    const activeAssets = workspace.assets.filter((a) => a.status === 'active').length;
    const attentionAssets = workspace.assets.filter((a) => a.status !== 'active').length;

    return {
      totalPatients,
      latestPatients: latest?.patients ?? 0,
      latestPeriod: latest?.period ?? '',
      totalRevenue,
      totalProfit,
      avgMargin,
      patientTrend,
      revenueTrend,
      marginDelta,
      openRemindersCount: openReminders.length,
      urgentCount,
      activeAssets,
      attentionAssets,
      totalAssets: workspace.assets.length,
    };
  }, [workspace]);

  const reminderDistribution = useMemo(() => {
    const counts: Record<ReminderItem['category'], number> = {
      maintenance: 0,
      sut: 0,
      finance: 0,
      meeting: 0,
      other: 0,
    };
    for (const r of workspace.reminders) {
      counts[r.category] = (counts[r.category] ?? 0) + 1;
    }
    return (Object.keys(counts) as ReminderItem['category'][])
      .map((cat) => ({
        key: cat,
        name: REMINDER_CATEGORY_META[cat].label,
        value: counts[cat],
        color: REMINDER_CATEGORY_META[cat].color,
      }))
      .filter((item) => item.value > 0);
  }, [workspace.reminders]);

  const urgentReminders = useMemo(() => {
    const priorityRank = { high: 0, medium: 1, low: 2 };
    return [...workspace.reminders]
      .filter((r) => !r.completed)
      .sort((a, b) => {
        const pDiff = priorityRank[a.priority] - priorityRank[b.priority];
        if (pDiff !== 0) return pDiff;
        return a.dueDate.localeCompare(b.dueDate);
      })
      .slice(0, 6);
  }, [workspace.reminders]);

  const hasFinancialSeries = workspace.chartSeries.some(
    (s) => (s.revenue ?? 0) > 0 || (s.cost ?? 0) > 0 || (s.profit ?? 0) > 0
  );
  const hasPatientSeries = workspace.chartSeries.some(
    (s) => (s.patients ?? 0) > 0 || (s.discharged ?? 0) > 0
  );

  if (isEmpty) {
    return (
      <div className="space-y-5 sm:space-y-6">
        <SectionHeader
          eyebrow="OPERASYONEL KOMUTA MERKEZİ"
          title="Genel Bakış"
          subtitle="Excel, PDF, sunum ve görsel belgelerinizi tamamen tarayıcı belleğinde analiz edin; grafikler, finansal göstergeler ve bakım hatırlatıcıları otomatik oluşsun."
          as="h1"
        />

        <Card variant="elevated" padding="md">
          <EmptyState
            icon={<Sparkles className="h-7 w-7" />}
            title="Çalışma alanınız hazır — ilk belgenizi ekleyin"
            description="Tertip bir not defteri değil; işletme operasyonları, finansal grafikler, cihaz/alan bakımı ve belge zekâsı platformudur. Verileriniz hiçbir sunucuya gönderilmez, yalnızca tarayıcı belleğinde (RAM) işlenir."
            action={
              <Button
                variant="primary"
                size="lg"
                icon={<Upload className="h-4 w-4" />}
                onClick={onUploadClick}
                className="w-full sm:w-auto"
              >
                <span className="sm:hidden">Belge Seç / Fotoğraf Çek</span>
                <span className="hidden sm:inline">
                  Belge Yükle (Excel, PDF, PPTX, Görsel)
                </span>
              </Button>
            }
            secondaryAction={
              <Button
                variant="secondary"
                size="lg"
                icon={<Database className="h-4 w-4" />}
                onClick={onLoadDemo}
                className="w-full sm:w-auto"
              >
                <span className="sm:hidden">Örnek Veriyi Yükle</span>
                <span className="hidden sm:inline">
                  Örnek Hastane Verisini Yükle
                </span>
              </Button>
            }
          />
        </Card>

        {/* 4-Sector Instant Demo Pack Picker */}
        <SectorPackPicker
          packs={packOptions}
          activePackId={activePackId}
          onSelectPack={onSelectSectorPack}
          variant="cards"
          title="Tek Tıkla Sektörel Başlangıç Paketi"
          subtitle="Kendi sektörünüzdeki gerçekçi belgeler, grafikler ve denetim takvimleriyle Tertip'i anında keşfedin."
        />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card variant="default" padding="md">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-tertip-accent-soft text-tertip-accent">
                <FileSpreadsheet className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-tertip-ink">
                  Çoklu Format & Türkçe OCR
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-tertip-ink-muted">
                  Excel tabloları, PDF raporları, PowerPoint sunumları ve taranmış
                  görseller tarayıcınızda çözümlenir.
                </p>
              </div>
            </div>
          </Card>

          <Card variant="default" padding="md">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-tertip-gold-soft text-tertip-gold">
                <CalendarClock className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-tertip-ink">
                  Otomatik Hatırlatıcı & Denetim Skoru
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-tertip-ink-muted">
                  Bakım tarihleri, SUT/Medula teslim süreleri ve denetim
                  hazırlık skoru belgelerden otomatik çıkarılır.
                </p>
              </div>
            </div>
          </Card>

          <Card variant="default" padding="md">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-tertip-success-soft text-tertip-success">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-tertip-ink">
                  Sıfır Sunucu, KVKK Maskeli Brifing
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-tertip-ink-muted">
                  Uzak veritabanı yok. Çalışmanızı AES-GCM şifreli{' '}
                  <code className="font-mono text-[11px]">.tertip</code> kasası
                  veya KVKK maskeli yönetici brifingi olarak kaydedin.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <SectionHeader
        eyebrow={workspace.sector.toUpperCase()}
        title="Genel Bakış"
        subtitle={`${workspace.documents.length} belge, ${workspace.chartSeries.length} dönemlik performans verisi ve ${workspace.assets.length} operasyonel varlık üzerinden anlık özet.`}
        as="h1"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              icon={<FolderOpen className="h-4 w-4" />}
              onClick={() => onNavigate('documents')}
            >
              Belgeler ({workspace.documents.length})
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={<Upload className="h-4 w-4" />}
              onClick={onUploadClick}
            >
              Belge Ekle
            </Button>
          </div>
        }
      />

      {/* Compact Sector Pack Switcher */}
      <SectorPackPicker
        packs={packOptions}
        activePackId={activePackId}
        onSelectPack={onSelectSectorPack}
        variant="pills"
      />

      {/* Bugünün Tertibi — Editorial Morning Briefing & Swipeable Timeline */}
      <MorningBriefingCard
        workspaceName={workspace.workspaceName}
        reminders={workspace.reminders}
        onCompleteReminder={onToggleReminder}
        onViewAllOperations={() => onNavigate('operations')}
      />

      {/* Executive KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard
          label="Toplam Hacim / İşlem"
          value={
            kpis.totalPatients > 0
              ? formatNumber(kpis.totalPatients)
              : `${workspace.documents.length} Belge`
          }
          sublabel={
            kpis.latestPatients > 0
              ? `Son dönem (${kpis.latestPeriod}): ${formatNumber(kpis.latestPatients)}`
              : 'Hacim serisi bekleniyor'
          }
          trend={
            kpis.patientTrend !== null
              ? {
                  value: `${kpis.patientTrend >= 0 ? '+' : ''}${kpis.patientTrend.toFixed(1)}%`,
                  direction:
                    kpis.patientTrend > 0
                      ? 'up'
                      : kpis.patientTrend < 0
                        ? 'down'
                        : 'neutral',
                  label: 'önceki aya göre',
                }
              : undefined
          }
          icon={<Activity className="h-5 w-5" />}
          tone="accent"
        />

        <StatCard
          label="Toplam Gelir"
          value={formatCurrencyCompact(kpis.totalRevenue)}
          sublabel={
            workspace.chartSeries.length > 0
              ? `${workspace.chartSeries.length} aylık kümülatif gelir`
              : 'Finansal tablo yükleyin'
          }
          trend={
            kpis.revenueTrend !== null
              ? {
                  value: `${kpis.revenueTrend >= 0 ? '+' : ''}${kpis.revenueTrend.toFixed(1)}%`,
                  direction:
                    kpis.revenueTrend > 0
                      ? 'up'
                      : kpis.revenueTrend < 0
                        ? 'down'
                        : 'neutral',
                  label: 'aylık değişim',
                }
              : undefined
          }
          icon={<Wallet className="h-5 w-5" />}
          tone="gold"
        />

        <StatCard
          label="Net Kâr & Kâr Marjı"
          value={formatCurrencyCompact(kpis.totalProfit)}
          sublabel={`Ortalama Kâr Marjı: %${kpis.avgMargin.toFixed(1)}`}
          trend={
            kpis.marginDelta !== null
              ? {
                  value: `${kpis.marginDelta >= 0 ? '+' : ''}${kpis.marginDelta.toFixed(1)} puan`,
                  direction:
                    kpis.marginDelta > 0
                      ? 'up'
                      : kpis.marginDelta < 0
                        ? 'down'
                        : 'neutral',
                  label: 'marj ivmesi',
                }
              : undefined
          }
          icon={<TrendingUp className="h-5 w-5" />}
          tone="success"
        />

        <StatCard
          label="Varlık & Yaklaşan Bakım"
          value={`${kpis.activeAssets}/${kpis.totalAssets} Aktif`}
          sublabel={`${kpis.openRemindersCount} açık görev · ${kpis.urgentCount} acil · ${kpis.attentionAssets} bakım/dikkat`}
          icon={<Wrench className="h-5 w-5" />}
          tone={kpis.urgentCount > 0 ? 'warning' : 'default'}
          onClick={() => onNavigate('operations')}
        />
      </div>

      {/* Audit Readiness Gauge + 1-Click Executive Briefing Export */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        <div className="xl:col-span-7">
          <AuditReadinessGauge
            score={readiness.score}
            passedCount={readiness.passedChecks}
            totalCount={readiness.totalChecks}
            missingItems={readiness.missingItems.slice(0, 4).map((m) => ({
              id: m.id,
              label: m.title,
              detail: m.reason,
              severity: m.severity,
            }))}
            onActionClick={() => onNavigate('operations')}
            actionLabel="Eksik Kanıtları Gider"
          />
        </div>

        <Card
          variant="elevated"
          padding="md"
          className="flex flex-col justify-between xl:col-span-5"
          header={
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-semibold text-tertip-ink">
                  Tek Tıkla Yönetici Brifingi
                </h2>
                <p className="text-xs text-tertip-ink-muted">
                  Çevrimdışı HTML rapor veya yazdırılabilir PDF özeti üretin
                </p>
              </div>
              <Badge variant="gold" size="sm">
                v2 İhracat
              </Badge>
            </div>
          }
        >
          <div className="space-y-4">
            <p className="text-xs leading-relaxed text-tertip-ink-secondary">
              Yönetim kurulu veya denetçiler için KPI kartları, trend grafiği,
              denetim hazırlık skoru ve yaklaşan görevleri tek dosya{' '}
              <code className="font-mono text-[11px]">tertip-brief.html</code>{' '}
              olarak indirin.
            </p>

            <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-tertip-border bg-tertip-surface p-3 text-xs">
              <input
                type="checkbox"
                checked={anonymizeBriefing}
                onChange={(e) => setAnonymizeBriefing(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-tertip-accent"
              />
              <div>
                <span className="font-semibold text-tertip-ink">
                  KVKK Kalkanı ile Maskele (Önerilen)
                </span>
                <p className="mt-0.5 text-[11px] text-tertip-ink-muted">
                  TCKN, VKN, IBAN, telefon ve hasta isimleri dışa aktarım
                  öncesinde otomatik sansürlenir.
                </p>
              </div>
            </label>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Button
                variant="primary"
                size="md"
                icon={<Download className="h-4 w-4" />}
                onClick={() =>
                  exportExecutiveBriefingHtml(workspace, {
                    anonymizeKvkk: anonymizeBriefing,
                  })
                }
                className="min-h-11"
              >
                tertip-brief.html İndir
              </Button>
              <Button
                variant="secondary"
                size="md"
                icon={<Printer className="h-4 w-4" />}
                onClick={() =>
                  printExecutiveBriefing(workspace, {
                    anonymizeKvkk: anonymizeBriefing,
                  })
                }
                className="min-h-11"
              >
                PDF / Yazdır
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* Primary Charts Row */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        {/* (a) Aylık Gelir, Maliyet & Kâr Marjı */}
        <Card
          variant="default"
          padding="md"
          className="xl:col-span-7"
          header={
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-semibold text-tertip-ink">
                  Aylık Gelir, Maliyet & Kâr Marjı
                </h2>
                <p className="text-xs text-tertip-ink-muted">
                  Dönemsel finansal performans ve marj (%) eğrisi
                </p>
              </div>
              <Badge variant="gold" size="sm">
                Finansal Seri
              </Badge>
            </div>
          }
        >
          {hasFinancialSeries ? (
            <div className="h-56 w-full sm:h-72">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={workspace.chartSeries}
                  margin={{ top: 12, right: 12, left: 4, bottom: 4 }}
                >
                  <defs>
                    <linearGradient id="tertipRevenueGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--tertip-chart-1)" stopOpacity={0.34} />
                      <stop offset="95%" stopColor="var(--tertip-chart-1)" stopOpacity={0.03} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--tertip-border)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="period"
                    tick={{ fill: 'var(--tertip-ink-muted)', fontSize: 12 }}
                    axisLine={{ stroke: 'var(--tertip-border)' }}
                    tickLine={false}
                  />
                  <YAxis
                    yAxisId="left"
                    tickFormatter={(v: number) => formatCurrencyCompact(v)}
                    tick={{ fill: 'var(--tertip-ink-muted)', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    width={64}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tickFormatter={(v: number) => `%${v}`}
                    tick={{ fill: 'var(--tertip-chart-2)', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    width={42}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--tertip-surface)',
                      borderColor: 'var(--tertip-border)',
                      borderRadius: '12px',
                      color: 'var(--tertip-ink)',
                      boxShadow: 'var(--tertip-shadow-md)',
                      fontSize: '12px',
                    }}
                    formatter={(value: number | string, name: string) => {
                      const num = typeof value === 'number' ? value : Number(value);
                      if (name === 'Kâr Marjı (%)') {
                        return [`%${num.toFixed(1)}`, name];
                      }
                      return [formatCurrencyCompact(num), name];
                    }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }}
                  />
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="revenue"
                    name="Gelir"
                    stroke="var(--tertip-chart-1)"
                    strokeWidth={2.5}
                    fill="url(#tertipRevenueGrad)"
                  />
                  <Bar
                    yAxisId="left"
                    dataKey="cost"
                    name="Maliyet"
                    fill="var(--tertip-chart-3)"
                    fillOpacity={0.78}
                    radius={[6, 6, 0, 0]}
                    barSize={22}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="margin"
                    name="Kâr Marjı (%)"
                    stroke="var(--tertip-chart-2)"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: 'var(--tertip-chart-2)', strokeWidth: 0 }}
                    activeDot={{ r: 6 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState
              compact
              title="Finansal grafik verisi bulunamadı"
              description="Gelir, maliyet veya kâr sütunları içeren bir Excel/CSV tablosu yüklediğinizde grafik otomatik oluşur."
            />
          )}
        </Card>

        {/* (b) Aylık Hacim / Tamamlanan İşlem */}
        <Card
          variant="default"
          padding="md"
          className="xl:col-span-5"
          header={
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-semibold text-tertip-ink">
                  Aylık Giriş & Tamamlanan Hacim
                </h2>
                <p className="text-xs text-tertip-ink-muted">
                  Dönemsel operasyon hacmi karşılaştırması
                </p>
              </div>
              <Badge variant="accent" size="sm">
                Hacim Analizi
              </Badge>
            </div>
          }
        >
          {hasPatientSeries ? (
            <div className="h-56 w-full sm:h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={workspace.chartSeries}
                  margin={{ top: 12, right: 8, left: 0, bottom: 4 }}
                  barGap={4}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--tertip-border)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="period"
                    tick={{ fill: 'var(--tertip-ink-muted)', fontSize: 12 }}
                    axisLine={{ stroke: 'var(--tertip-border)' }}
                    tickLine={false}
                  />
                  <YAxis
                    tickFormatter={(v: number) => formatNumber(v)}
                    tick={{ fill: 'var(--tertip-ink-muted)', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    width={52}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--tertip-surface)',
                      borderColor: 'var(--tertip-border)',
                      borderRadius: '12px',
                      color: 'var(--tertip-ink)',
                      boxShadow: 'var(--tertip-shadow-md)',
                      fontSize: '12px',
                    }}
                    formatter={(value: number | string, name: string) => [
                      formatNumber(Number(value)),
                      name,
                    ]}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
                  <Bar
                    dataKey="patients"
                    name="Toplam Hacim"
                    fill="var(--tertip-chart-1)"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={24}
                  />
                  <Bar
                    dataKey="discharged"
                    name="Tamamlanan"
                    fill="var(--tertip-chart-2)"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={24}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState
              compact
              title="Hacim verisi henüz yok"
              description="Hasta sayısı, sipariş veya hacim sütunları içeren belgeler yüklendiğinde burada görünür."
            />
          )}
        </Card>
      </div>

      {/* Secondary Row: Urgent Reminders + Operations Distribution */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        {/* Urgent Upcoming Reminders */}
        <Card
          variant="default"
          padding="md"
          className="xl:col-span-7"
          header={
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-tertip-gold" />
                <h2 className="text-base font-semibold text-tertip-ink">
                  Öncelikli Yaklaşan Hatırlatıcılar
                </h2>
              </div>
              <Button
                variant="ghost"
                size="sm"
                iconRight={<ArrowRight className="h-3.5 w-3.5" />}
                onClick={() => onNavigate('operations')}
              >
                Tümünü Yönet
              </Button>
            </div>
          }
        >
          {urgentReminders.length === 0 ? (
            <EmptyState
              compact
              icon={<CheckCircle2 className="h-6 w-6" />}
              title="Bekleyen kritik hatırlatıcı yok"
              description="Tüm operasyonel görevler tamamlanmış görünüyor."
            />
          ) : (
            <ul className="divide-y divide-tertip-border/60">
              {urgentReminders.map((item) => {
                const catMeta = REMINDER_CATEGORY_META[item.category];
                return (
                  <li
                    key={item.id}
                    className="flex items-start justify-between gap-3 py-3 first:pt-1 last:pb-1"
                  >
                    <div className="flex items-start gap-2.5 min-w-0">
                      <button
                        type="button"
                        onClick={() => onToggleReminder(item.id)}
                        className="-ml-2 -mt-1.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-tertip-ink-muted transition-colors hover:bg-tertip-surface-subtle hover:text-tertip-accent"
                        aria-label={`"${item.title}" görevini tamamla`}
                      >
                        <Circle className="h-4 w-4" />
                      </button>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-tertip-ink">
                          {item.title}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-tertip-ink-muted">
                          <span className="font-mono">
                            {formatDateTr(item.dueDate)}
                          </span>
                          <span>·</span>
                          <span>{catMeta.label}</span>
                          {item.autoExtracted && (
                            <Badge variant="accent" size="sm">
                              Otomatik
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <Badge
                      variant={getPriorityBadgeVariant(item.priority)}
                      size="sm"
                      dot
                    >
                      {getPriorityLabel(item.priority)}
                    </Badge>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        {/* (c) Hatırlatıcı & Operasyon Dağılımı */}
        <Card
          variant="default"
          padding="md"
          className="xl:col-span-5"
          header={
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-semibold text-tertip-ink">
                  Hatırlatıcı & Operasyon Dağılımı
                </h2>
                <p className="text-xs text-tertip-ink-muted">
                  Kategori bazında kayıtlı iş ve takip kalemleri
                </p>
              </div>
              <Badge variant="neutral" size="sm">
                {workspace.reminders.length} Kayıt
              </Badge>
            </div>
          }
        >
          {reminderDistribution.length > 0 ? (
            <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-2">
              <div className="h-[220px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={reminderDistribution}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={52}
                      outerRadius={82}
                      paddingAngle={3}
                      stroke="var(--tertip-surface)"
                      strokeWidth={2}
                    >
                      {reminderDistribution.map((entry) => (
                        <Cell key={entry.key} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--tertip-surface)',
                        borderColor: 'var(--tertip-border)',
                        borderRadius: '10px',
                        color: 'var(--tertip-ink)',
                        fontSize: '12px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-2.5">
                {reminderDistribution.map((entry) => {
                  const pct = Math.round(
                    (entry.value / Math.max(1, workspace.reminders.length)) * 100
                  );
                  return (
                    <div
                      key={entry.key}
                      className="flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: entry.color }}
                        />
                        <span className="truncate font-medium text-tertip-ink">
                          {entry.name}
                        </span>
                      </div>
                      <span className="shrink-0 font-mono text-tertip-ink-muted">
                        {entry.value} (%{pct})
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <EmptyState
              compact
              title="Dağılım için hatırlatıcı yok"
              description="Operasyon sekmesinden hatırlatıcı ekleyin veya belge yükleyin."
            />
          )}
        </Card>
      </div>
    </div>
  );
};
