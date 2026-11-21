import type { ChartSeriesPoint, WorkspaceState } from '../../types';

export interface MetricDelta {
  key: 'revenue' | 'cost' | 'profit' | 'patients' | 'discharged';
  label: string;
  unit: string;
  prev: number;
  curr: number;
  abs: number;
  pct: number | null;
  invertSentiment?: boolean;
}

export interface WaterfallStep {
  label: string;
  value: number;
  kind: 'start' | 'up' | 'down' | 'end';
}

export interface OperationalChangeSummary {
  newReminders: number;
  completedReminders: number;
  overdueReminders: number;
  attentionAssets: number;
  maintenanceAssets: number;
  newAssets: number;
  highlights: string[];
}

export interface PeriodDeltaResult {
  insufficientData: boolean;
  reason?: string;
  currentPeriod: string;
  previousPeriod: string;
  metrics: MetricDelta[];
  marginDeltaPts: number;
  prevMargin: number;
  currMargin: number;
  waterfall: WaterfallStep[];
  drivers: string[];
  story: string[];
  operationalChanges: OperationalChangeSummary;
}

export interface ComparePeriodsOptions {
  currentPeriod?: string;
  previousPeriod?: string;
}

function formatNumberTr(value: number, maxFractionDigits = 0): string {
  return new Intl.NumberFormat('tr-TR', {
    maximumFractionDigits: maxFractionDigits,
  }).format(value);
}

function formatCurrencyTr(value: number): string {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatSignedPct(pct: number | null): string {
  if (pct === null || !Number.isFinite(pct)) return '—';
  const sign = pct > 0 ? '+' : '';
  return `${sign}%${formatNumberTr(pct, 1)}`;
}

function calcPct(prev: number, curr: number): number | null {
  if (prev === 0) return curr === 0 ? 0 : null;
  return Math.round(((curr - prev) / Math.abs(prev)) * 1000) / 10;
}

function buildProfitWaterfall(
  prevPeriod: string,
  currPeriod: string,
  prevRevenue: number,
  currRevenue: number,
  prevCost: number,
  currCost: number,
  prevProfit: number,
  currProfit: number,
  prevVolume: number,
  currVolume: number
): {
  waterfall: WaterfallStep[];
  volumeEffect: number | null;
  priceEffect: number | null;
  costEffect: number;
} {
  const startVal = Math.round(prevProfit);
  const endVal = Math.round(currProfit);

  // Exact algebraic decomposition when both periods have positive volume:
  // ΔP = (Q1 - Q0)*(uR0 - uC0) + Q1*(uR1 - uR0) - Q1*(uC1 - uC0)
  // Using integer-safe residual on costEffect so start + vol + price + cost === end exactly.
  if (prevVolume > 0 && currVolume > 0 && prevRevenue > 0 && currRevenue > 0) {
    const uR0 = prevRevenue / prevVolume;
    const uR1 = currRevenue / currVolume;
    const uC0 = prevCost / prevVolume;
    const uM0 = prevProfit / prevVolume;

    const rawVolumeEffect = (currVolume - prevVolume) * uM0;
    const rawPriceEffect = currVolume * (uR1 - uR0);

    const volumeEffect = Math.round(rawVolumeEffect);
    const priceEffect = Math.round(rawPriceEffect);
    const costEffect = endVal - startVal - volumeEffect - priceEffect;

    const waterfall: WaterfallStep[] = [
      { label: `${prevPeriod} Kârı`, value: startVal, kind: 'start' },
      {
        label: 'Hacim Etkisi',
        value: volumeEffect,
        kind: volumeEffect >= 0 ? 'up' : 'down',
      },
      {
        label: 'Fiyat Etkisi',
        value: priceEffect,
        kind: priceEffect >= 0 ? 'up' : 'down',
      },
      {
        label: 'Maliyet Etkisi',
        value: costEffect,
        kind: costEffect >= 0 ? 'up' : 'down',
      },
      { label: `${currPeriod} Kârı`, value: endVal, kind: 'end' },
    ];

    return { waterfall, volumeEffect, priceEffect, costEffect };
  }

  // Fallback when volume is unavailable: Revenue change + Cost change = Profit change
  const revEffect = Math.round(currRevenue - prevRevenue);
  const costEffect = endVal - startVal - revEffect;

  const waterfall: WaterfallStep[] = [
    { label: `${prevPeriod} Kârı`, value: startVal, kind: 'start' },
    {
      label: 'Gelir Etkisi',
      value: revEffect,
      kind: revEffect >= 0 ? 'up' : 'down',
    },
    {
      label: 'Maliyet Etkisi',
      value: costEffect,
      kind: costEffect >= 0 ? 'up' : 'down',
    },
    { label: `${currPeriod} Kârı`, value: endVal, kind: 'end' },
  ];

  return { waterfall, volumeEffect: null, priceEffect: null, costEffect };
}

function summarizeOperationalState(state: WorkspaceState): OperationalChangeSummary {
  const todayIso = new Date().toISOString().slice(0, 10);
  const completedReminders = state.reminders.filter((r) => r.completed).length;
  const overdueReminders = state.reminders.filter(
    (r) => !r.completed && r.dueDate < todayIso
  ).length;
  const attentionAssets = state.assets.filter((a) => a.status === 'attention').length;
  const maintenanceAssets = state.assets.filter((a) => a.status === 'maintenance').length;

  const highlights: string[] = [];
  if (overdueReminders > 0) {
    highlights.push(`${overdueReminders} açık hatırlatıcı son tarihini geçmiş durumda.`);
  }
  if (attentionAssets > 0) {
    highlights.push(`${attentionAssets} varlık/alan "Dikkat" durumunda aksiyon bekliyor.`);
  }
  if (maintenanceAssets > 0) {
    highlights.push(`${maintenanceAssets} cihaz/alan aktif bakım sürecinde.`);
  }
  if (completedReminders > 0) {
    highlights.push(`${completedReminders} operasyonel görev tamamlandı.`);
  }

  return {
    newReminders: state.reminders.filter((r) => !r.completed).length,
    completedReminders,
    overdueReminders,
    attentionAssets,
    maintenanceAssets,
    newAssets: state.assets.length,
    highlights,
  };
}

function buildNarrative(
  prevPeriod: string,
  currPeriod: string,
  metrics: MetricDelta[],
  prevMargin: number,
  currMargin: number,
  marginDeltaPts: number,
  volumeEffect: number | null,
  priceEffect: number | null,
  costEffect: number,
  opSummary: OperationalChangeSummary
): { drivers: string[]; story: string[] } {
  const rev = metrics.find((m) => m.key === 'revenue');
  const cost = metrics.find((m) => m.key === 'cost');
  const profit = metrics.find((m) => m.key === 'profit');
  const vol = metrics.find((m) => m.key === 'patients');

  const drivers: string[] = [];
  const story: string[] = [];

  if (rev && cost && profit) {
    const revWord = rev.abs >= 0 ? 'arttı' : 'geriledi';
    const marginWord =
      Math.abs(marginDeltaPts) < 0.05
        ? 'sabit kaldı'
        : marginDeltaPts > 0
          ? `${formatNumberTr(Math.abs(marginDeltaPts), 1)} puan yükseldi`
          : `${formatNumberTr(Math.abs(marginDeltaPts), 1)} puan geriledi`;

    const costReason =
      cost.pct !== null && rev.pct !== null && cost.pct > rev.pct
        ? `temel baskı maliyetlerin ${formatSignedPct(cost.pct)} artmasından kaynaklandı`
        : cost.pct !== null && rev.pct !== null && rev.pct > cost.pct
          ? `gelir artışı (${formatSignedPct(rev.pct)}) maliyet artışının (${formatSignedPct(cost.pct)}) üzerinde gerçekleşerek marjı destekledi`
          : `net kâr ${formatCurrencyTr(profit.prev)} seviyesinden ${formatCurrencyTr(profit.curr)} seviyesine ulaştı`;

    story.push(
      `${prevPeriod} → ${currPeriod} döneminde ciro ${formatSignedPct(rev.pct)} ${revWord} (${formatCurrencyTr(
        rev.curr
      )}), net kâr marjı %${formatNumberTr(prevMargin, 1)} → %${formatNumberTr(
        currMargin,
        1
      )} (${marginWord}); ${costReason}.`
    );
  }

  if (volumeEffect !== null && priceEffect !== null && profit) {
    const effects = [
      { name: 'hacim değişimi', val: volumeEffect },
      { name: 'birim gelir (fiyat/karma) değişimi', val: priceEffect },
      { name: 'birim maliyet değişimi', val: costEffect },
    ].sort((a, b) => Math.abs(b.val) - Math.abs(a.val));

    const topDriver = effects[0];
    const topSign = topDriver.val >= 0 ? 'pozitif' : 'negatif';
    story.push(
      `Net kârdaki ${formatCurrencyTr(profit.abs)} tutarındaki değişimin en büyük sürücüsü ${formatCurrencyTr(
        topDriver.val
      )} ${topSign} etkiyle ${topDriver.name} oldu.`
    );

    drivers.push(
      `Hacim etkisi: ${volumeEffect >= 0 ? '+' : ''}${formatCurrencyTr(volumeEffect)}${
        vol && vol.pct !== null ? ` (hacim ${formatSignedPct(vol.pct)})` : ''
      }`
    );
    drivers.push(
      `Birim gelir etkisi: ${priceEffect >= 0 ? '+' : ''}${formatCurrencyTr(priceEffect)}`
    );
    drivers.push(
      `Birim maliyet etkisi: ${costEffect >= 0 ? '+' : ''}${formatCurrencyTr(costEffect)}`
    );
  } else if (rev && cost) {
    drivers.push(`Gelir değişimi: ${rev.abs >= 0 ? '+' : ''}${formatCurrencyTr(rev.abs)}`);
    drivers.push(`Maliyet değişimi: ${cost.abs >= 0 ? '+' : ''}${formatCurrencyTr(cost.abs)}`);
  }

  if (opSummary.highlights.length > 0) {
    story.push(`Operasyonel tarafta: ${opSummary.highlights.slice(0, 2).join(' ')}`);
    for (const h of opSummary.highlights.slice(0, 3)) {
      drivers.push(h);
    }
  }

  return { drivers, story };
}

function emptyDeltaResult(reason: string): PeriodDeltaResult {
  return {
    insufficientData: true,
    reason,
    currentPeriod: '',
    previousPeriod: '',
    metrics: [],
    marginDeltaPts: 0,
    prevMargin: 0,
    currMargin: 0,
    waterfall: [],
    drivers: [],
    story: [],
    operationalChanges: {
      newReminders: 0,
      completedReminders: 0,
      overdueReminders: 0,
      attentionAssets: 0,
      maintenanceAssets: 0,
      newAssets: 0,
      highlights: [],
    },
  };
}

function buildDeltaFromPoints(
  prevPt: ChartSeriesPoint,
  currPt: ChartSeriesPoint,
  opSummary: OperationalChangeSummary
): PeriodDeltaResult {
  const prevRevenue = prevPt.revenue ?? 0;
  const currRevenue = currPt.revenue ?? 0;
  const prevCost = prevPt.cost ?? 0;
  const currCost = currPt.cost ?? 0;
  const prevProfit = prevPt.profit ?? prevRevenue - prevCost;
  const currProfit = currPt.profit ?? currRevenue - currCost;
  const prevPatients = prevPt.patients ?? 0;
  const currPatients = currPt.patients ?? 0;
  const prevDischarged = prevPt.discharged ?? 0;
  const currDischarged = currPt.discharged ?? 0;

  const prevMargin =
    prevPt.margin !== undefined
      ? prevPt.margin
      : prevRevenue > 0
        ? Math.round((prevProfit / prevRevenue) * 1000) / 10
        : 0;
  const currMargin =
    currPt.margin !== undefined
      ? currPt.margin
      : currRevenue > 0
        ? Math.round((currProfit / currRevenue) * 1000) / 10
        : 0;
  const marginDeltaPts = Math.round((currMargin - prevMargin) * 10) / 10;

  const metrics: MetricDelta[] = [
    {
      key: 'revenue',
      label: 'Gelir / Ciro',
      unit: 'TL',
      prev: prevRevenue,
      curr: currRevenue,
      abs: Math.round(currRevenue - prevRevenue),
      pct: calcPct(prevRevenue, currRevenue),
    },
    {
      key: 'cost',
      label: 'Toplam Maliyet',
      unit: 'TL',
      prev: prevCost,
      curr: currCost,
      abs: Math.round(currCost - prevCost),
      pct: calcPct(prevCost, currCost),
      invertSentiment: true,
    },
    {
      key: 'profit',
      label: 'Net Kâr',
      unit: 'TL',
      prev: prevProfit,
      curr: currProfit,
      abs: Math.round(currProfit - prevProfit),
      pct: calcPct(prevProfit, currProfit),
    },
  ];

  if (prevPatients > 0 || currPatients > 0) {
    metrics.push({
      key: 'patients',
      label: 'Hacim / İşlem',
      unit: 'adet',
      prev: prevPatients,
      curr: currPatients,
      abs: Math.round(currPatients - prevPatients),
      pct: calcPct(prevPatients, currPatients),
    });
  }

  if (prevDischarged > 0 || currDischarged > 0) {
    metrics.push({
      key: 'discharged',
      label: 'Tamamlanan / Taburcu',
      unit: 'adet',
      prev: prevDischarged,
      curr: currDischarged,
      abs: Math.round(currDischarged - prevDischarged),
      pct: calcPct(prevDischarged, currDischarged),
    });
  }

  const { waterfall, volumeEffect, priceEffect, costEffect } = buildProfitWaterfall(
    prevPt.period,
    currPt.period,
    prevRevenue,
    currRevenue,
    prevCost,
    currCost,
    prevProfit,
    currProfit,
    prevPatients,
    currPatients
  );

  const { drivers, story } = buildNarrative(
    prevPt.period,
    currPt.period,
    metrics,
    prevMargin,
    currMargin,
    marginDeltaPts,
    volumeEffect,
    priceEffect,
    costEffect,
    opSummary
  );

  return {
    insufficientData: false,
    currentPeriod: currPt.period,
    previousPeriod: prevPt.period,
    metrics,
    marginDeltaPts,
    prevMargin,
    currMargin,
    waterfall,
    drivers,
    story,
    operationalChanges: opSummary,
  };
}

export function comparePeriods(
  state: WorkspaceState,
  opts?: ComparePeriodsOptions
): PeriodDeltaResult {
  const series = state.chartSeries;
  if (series.length < 2) {
    return emptyDeltaResult(
      'Dönemler arası fark hikâyesi için en az 2 dönemlik finansal/operasyonel seri gereklidir.'
    );
  }

  let currIdx = series.length - 1;
  let prevIdx = series.length - 2;

  if (opts?.currentPeriod) {
    const found = series.findIndex((p) => p.period === opts.currentPeriod);
    if (found !== -1) currIdx = found;
  }
  if (opts?.previousPeriod) {
    const found = series.findIndex((p) => p.period === opts.previousPeriod);
    if (found !== -1) prevIdx = found;
  } else if (currIdx > 0) {
    prevIdx = currIdx - 1;
  }

  if (currIdx === prevIdx || !series[prevIdx] || !series[currIdx]) {
    return emptyDeltaResult('Karşılaştırmak için iki farklı dönem seçilmelidir.');
  }

  const opSummary = summarizeOperationalState(state);
  return buildDeltaFromPoints(series[prevIdx], series[currIdx], opSummary);
}

function aggregateWorkspaceSeries(state: WorkspaceState, fallbackLabel: string): ChartSeriesPoint | null {
  if (state.chartSeries.length === 0) return null;
  const revenue = state.chartSeries.reduce((s, p) => s + (p.revenue ?? 0), 0);
  const cost = state.chartSeries.reduce((s, p) => s + (p.cost ?? 0), 0);
  const profit = state.chartSeries.reduce(
    (s, p) => s + (p.profit ?? (p.revenue ?? 0) - (p.cost ?? 0)),
    0
  );
  const patients = state.chartSeries.reduce((s, p) => s + (p.patients ?? 0), 0);
  const discharged = state.chartSeries.reduce((s, p) => s + (p.discharged ?? 0), 0);
  const margin = revenue > 0 ? Math.round((profit / revenue) * 1000) / 10 : 0;

  const first = state.chartSeries[0]?.period;
  const last = state.chartSeries[state.chartSeries.length - 1]?.period;
  const periodLabel =
    first && last && first !== last
      ? `${fallbackLabel} (${first}–${last})`
      : first
        ? `${fallbackLabel} (${first})`
        : fallbackLabel;

  return {
    period: periodLabel,
    revenue,
    cost,
    profit,
    patients,
    discharged,
    margin,
  };
}

export function compareWorkspaces(
  prev: WorkspaceState,
  curr: WorkspaceState
): PeriodDeltaResult {
  const prevAgg = aggregateWorkspaceSeries(prev, 'Önceki Yedek');
  const currAgg = aggregateWorkspaceSeries(curr, 'Mevcut Çalışma Alanı');

  if (!prevAgg || !currAgg) {
    return emptyDeltaResult(
      'Karşılaştırılan çalışma alanlarından birinde dönemsel seri verisi bulunmuyor.'
    );
  }

  const todayIso = new Date().toISOString().slice(0, 10);
  const prevRemMap = new Map(prev.reminders.map((r) => [r.id, r]));
  const prevAssetMap = new Map(prev.assets.map((a) => [a.id, a]));

  let newReminders = 0;
  let completedReminders = 0;
  let overdueReminders = 0;
  for (const r of curr.reminders) {
    const old = prevRemMap.get(r.id);
    if (!old) newReminders += 1;
    if (r.completed && (!old || !old.completed)) completedReminders += 1;
    if (!r.completed && r.dueDate < todayIso) overdueReminders += 1;
  }

  let newAssets = 0;
  let newlyAttention = 0;
  let newlyMaintenance = 0;
  for (const a of curr.assets) {
    const old = prevAssetMap.get(a.id);
    if (!old) newAssets += 1;
    if (a.status === 'attention' && old?.status !== 'attention') newlyAttention += 1;
    if (a.status === 'maintenance' && old?.status !== 'maintenance') newlyMaintenance += 1;
  }

  const highlights: string[] = [];
  if (newReminders > 0) highlights.push(`${newReminders} yeni hatırlatıcı eklendi.`);
  if (completedReminders > 0) highlights.push(`${completedReminders} hatırlatıcı tamamlandı.`);
  if (overdueReminders > 0) highlights.push(`${overdueReminders} hatırlatıcı gecikmede.`);
  if (newlyAttention > 0) highlights.push(`${newlyAttention} varlık "Dikkat" durumuna geçti.`);
  if (newlyMaintenance > 0) highlights.push(`${newlyMaintenance} varlık bakıma alındı.`);
  if (newAssets > 0) highlights.push(`${newAssets} yeni varlık envantere eklendi.`);

  const opSummary: OperationalChangeSummary = {
    newReminders,
    completedReminders,
    overdueReminders,
    attentionAssets: curr.assets.filter((a) => a.status === 'attention').length,
    maintenanceAssets: curr.assets.filter((a) => a.status === 'maintenance').length,
    newAssets,
    highlights,
  };

  return buildDeltaFromPoints(prevAgg, currAgg, opSummary);
}
