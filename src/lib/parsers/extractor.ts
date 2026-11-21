import type {
  AssetItem,
  ChartSeriesPoint,
  ExtractedMetric,
  ParsedTable,
  ReminderItem,
  TertipDocument,
} from '../../types';

export interface ExtractionResult {
  metrics: ExtractedMetric[];
  chartSeries: ChartSeriesPoint[];
  assets: AssetItem[];
  reminders: ReminderItem[];
  inferredCategory: string;
}

function normalizeTr(text: string): string {
  return text
    .toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i')
    .replace(/İ/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .trim();
}

function makeId(prefix: string, seed: string): string {
  let hash = 5381;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 33) ^ seed.charCodeAt(i);
  }
  const suffix = (hash >>> 0).toString(36);
  return `${prefix}_${suffix}`;
}

export function parseLocalizedNumber(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;

  const raw = String(value)
    .replace(/[₺$€£%\s]/g, '')
    .replace(/TL/gi, '')
    .replace(/TRY/gi, '')
    .trim();

  if (!raw || !/\d/.test(raw)) return null;

  // Determine decimal separator heuristic:
  // Turkish format: 1.250.400,50 -> dots are thousands, comma is decimal
  // US format: 1,250,400.50 -> commas are thousands, dot is decimal
  const lastDot = raw.lastIndexOf('.');
  const lastComma = raw.lastIndexOf(',');

  let normalized = raw;
  if (lastDot !== -1 && lastComma !== -1) {
    if (lastComma > lastDot) {
      normalized = raw.replace(/\./g, '').replace(',', '.');
    } else {
      normalized = raw.replace(/,/g, '');
    }
  } else if (lastComma !== -1) {
    const afterComma = raw.length - lastComma - 1;
    if (afterComma === 3 && raw.indexOf(',') === lastComma && raw.length > 4) {
      normalized = raw.replace(/,/g, '');
    } else {
      normalized = raw.replace(',', '.');
    }
  } else if (lastDot !== -1) {
    const dotCount = (raw.match(/\./g) ?? []).length;
    const afterDot = raw.length - lastDot - 1;
    if (dotCount > 1 || (afterDot === 3 && raw.length > 4)) {
      normalized = raw.replace(/\./g, '');
    }
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseDateToIso(input: string): string | null {
  const trimmed = input.trim();

  // YYYY-MM-DD
  const isoMatch = /\b(20\d{2})[-./](0?[1-9]|1[0-2])[-./](0?[1-9]|[12]\d|3[01])\b/.exec(trimmed);
  if (isoMatch) {
    const y = isoMatch[1];
    const m = isoMatch[2].padStart(2, '0');
    const d = isoMatch[3].padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // DD.MM.YYYY or DD/MM/YYYY
  const trMatch = /\b(0?[1-9]|[12]\d|3[01])[./-](0?[1-9]|1[0-2])[./-](20\d{2})\b/.exec(trimmed);
  if (trMatch) {
    const d = trMatch[1].padStart(2, '0');
    const m = trMatch[2].padStart(2, '0');
    const y = trMatch[3];
    return `${y}-${m}-${d}`;
  }

  return null;
}

function findHeader(headers: string[], keywords: string[]): string | undefined {
  for (const header of headers) {
    const norm = normalizeTr(header);
    if (keywords.some((kw) => norm.includes(kw))) {
      return header;
    }
  }
  return undefined;
}

function inferCategory(doc: TertipDocument): string {
  const hay = normalizeTr(`${doc.name} ${doc.rawText.slice(0, 1200)}`);

  if (/(sut|sgk|medula|fatura|tahakkuk)/.test(hay)) return 'SUT & Mevzuat';
  if (/(gelir|gider|maliyet|ciro|kar|bilanco|finans|butce|mali)/.test(hay)) {
    return 'Finans & Mali Analiz';
  }
  if (/(cihaz|kalibrasyon|bakim|biyomedikal|demirbas|envanter|ekipman)/.test(hay)) {
    return 'Cihaz & Envanter';
  }
  if (/(hasta|taburcu|poliklinik|ameliyat|yogun bakim|klinik|muayene)/.test(hay)) {
    return 'Klinik & Hasta İstatistikleri';
  }
  if (/(tesis|bina|hijyen|wc|temizlik|elektrik|jenerator|klima)/.test(hay)) {
    return 'Tesis & Bakım';
  }
  if (/(toplanti|kurul|tutanak|gundem|plan)/.test(hay)) return 'Toplantı & Planlama';

  return 'Genel Operasyon';
}

function extractSeriesFromTable(
  table: ParsedTable,
  docId: string
): { points: ChartSeriesPoint[]; metrics: ExtractedMetric[] } {
  const periodCol = findHeader(table.headers, [
    'donem',
    'ay',
    'tarih',
    'period',
    'month',
    'ceyrek',
    'hafta',
  ]);
  const patientsCol = findHeader(table.headers, [
    'hasta',
    'muayene',
    'basvuru',
    'patient',
    'visit',
    'poliklinik',
  ]);
  const dischargedCol = findHeader(table.headers, [
    'taburcu',
    'cikis',
    'discharged',
  ]);
  const revenueCol = findHeader(table.headers, [
    'gelir',
    'ciro',
    'hasilat',
    'revenue',
    'income',
    'satis',
    'tahsilat',
  ]);
  const costCol = findHeader(table.headers, [
    'gider',
    'maliyet',
    'harcama',
    'masraf',
    'cost',
    'expense',
  ]);
  const profitCol = findHeader(table.headers, [
    'net kar',
    'kar',
    'profit',
    'favok',
    'ebitda',
  ]);
  const marginCol = findHeader(table.headers, ['marj', 'margin']);

  const hasAnyMetricCol = Boolean(
    patientsCol || dischargedCol || revenueCol || costCol || profitCol
  );
  if (!periodCol || !hasAnyMetricCol) {
    return { points: [], metrics: [] };
  }

  const points: ChartSeriesPoint[] = [];
  let sumPatients = 0;
  let sumDischarged = 0;
  let sumRevenue = 0;
  let sumCost = 0;
  let sumProfit = 0;

  for (const row of table.rows) {
    const periodRaw = row[periodCol];
    if (periodRaw === null || periodRaw === undefined) continue;
    const period = String(periodRaw).trim();
    if (!period || /^(toplam|total|genel toplam|ortalama)$/i.test(normalizeTr(period))) {
      continue;
    }

    const patients = patientsCol ? parseLocalizedNumber(row[patientsCol]) : null;
    const discharged = dischargedCol ? parseLocalizedNumber(row[dischargedCol]) : null;
    const revenue = revenueCol ? parseLocalizedNumber(row[revenueCol]) : null;
    const cost = costCol ? parseLocalizedNumber(row[costCol]) : null;
    let profit = profitCol ? parseLocalizedNumber(row[profitCol]) : null;
    let margin = marginCol ? parseLocalizedNumber(row[marginCol]) : null;

    if (profit === null && revenue !== null && cost !== null) {
      profit = Math.round((revenue - cost) * 100) / 100;
    }
    if (margin === null && profit !== null && revenue !== null && revenue > 0) {
      margin = Math.round((profit / revenue) * 1000) / 10;
    }

    const point: ChartSeriesPoint = { period };
    if (patients !== null) {
      point.patients = patients;
      sumPatients += patients;
    }
    if (discharged !== null) {
      point.discharged = discharged;
      sumDischarged += discharged;
    }
    if (revenue !== null) {
      point.revenue = revenue;
      sumRevenue += revenue;
    }
    if (cost !== null) {
      point.cost = cost;
      sumCost += cost;
    }
    if (profit !== null) {
      point.profit = profit;
      sumProfit += profit;
    }
    if (margin !== null) {
      point.margin = margin;
    }

    if (Object.keys(point).length > 1) {
      points.push(point);
    }
  }

  const metrics: ExtractedMetric[] = [];
  const periodLabel =
    points.length > 1
      ? `${points[0].period} – ${points[points.length - 1].period}`
      : points[0]?.period;

  if (sumPatients > 0) {
    metrics.push({
      id: makeId('met', `${docId}_${table.name}_patients`),
      label: 'Toplam Hasta / Başvuru',
      value: Math.round(sumPatients),
      unit: 'hasta',
      period: periodLabel,
      category: 'volume',
      sourceDocId: docId,
    });
  }
  if (sumDischarged > 0) {
    metrics.push({
      id: makeId('met', `${docId}_${table.name}_discharged`),
      label: 'Toplam Taburcu',
      value: Math.round(sumDischarged),
      unit: 'hasta',
      period: periodLabel,
      category: 'volume',
      sourceDocId: docId,
    });
  }
  if (sumRevenue > 0) {
    metrics.push({
      id: makeId('met', `${docId}_${table.name}_revenue`),
      label: 'Toplam Gelir',
      value: Math.round(sumRevenue),
      unit: 'TL',
      period: periodLabel,
      category: 'revenue',
      sourceDocId: docId,
    });
  }
  if (sumCost > 0) {
    metrics.push({
      id: makeId('met', `${docId}_${table.name}_cost`),
      label: 'Toplam Gider',
      value: Math.round(sumCost),
      unit: 'TL',
      period: periodLabel,
      category: 'cost',
      sourceDocId: docId,
    });
  }
  if (sumProfit !== 0) {
    metrics.push({
      id: makeId('met', `${docId}_${table.name}_profit`),
      label: 'Net Kâr',
      value: Math.round(sumProfit),
      unit: 'TL',
      period: periodLabel,
      category: 'profit',
      sourceDocId: docId,
    });
  }

  return { points, metrics };
}

function extractAssetsFromTable(
  table: ParsedTable,
  docId: string
): { assets: AssetItem[]; reminders: ReminderItem[] } {
  const nameCol = findHeader(table.headers, [
    'cihaz',
    'ekipman',
    'demirbas',
    'varlik',
    'alan',
    'oda',
    'tesis',
    'asset',
    'device',
  ]);

  if (!nameCol) return { assets: [], reminders: [] };

  const codeCol = findHeader(table.headers, ['kod', 'seri', 'envanter', 'code', 'serial']);
  const deptCol = findHeader(table.headers, [
    'bolum',
    'birim',
    'servis',
    'departman',
    'konum',
    'lokasyon',
    'department',
  ]);
  const catCol = findHeader(table.headers, ['kategori', 'tur', 'tip', 'sinif', 'category']);
  const statusCol = findHeader(table.headers, ['durum', 'status', 'hal']);
  const acquiredCol = findHeader(table.headers, [
    'alim',
    'kurulum',
    'teslim',
    'edinis',
    'acquired',
  ]);
  const maintCol = findHeader(table.headers, [
    'bakim',
    'kalibrasyon',
    'kontrol',
    'maintenance',
  ]);
  const notesCol = findHeader(table.headers, ['not', 'aciklama', 'detay', 'notes']);

  const assets: AssetItem[] = [];
  const reminders: ReminderItem[] = [];

  for (const row of table.rows) {
    const rawName = row[nameCol];
    if (!rawName || String(rawName).trim().length < 2) continue;

    const name = String(rawName).trim();
    const code = codeCol && row[codeCol] ? String(row[codeCol]).trim() : undefined;
    const department =
      deptCol && row[deptCol] ? String(row[deptCol]).trim() : 'Genel Birim';
    const category =
      catCol && row[catCol] ? String(row[catCol]).trim() : 'Tıbbi Cihaz & Ekipman';

    const statusRaw = statusCol && row[statusCol] ? normalizeTr(String(row[statusCol])) : '';
    let status: AssetItem['status'] = 'active';
    if (/(bakim|servis|tamir|maintenance)/.test(statusRaw)) {
      status = 'maintenance';
    } else if (/(ariza|dikkat|kritik|uyari|bekle|attention)/.test(statusRaw)) {
      status = 'attention';
    }

    const acquiredAt =
      acquiredCol && row[acquiredCol]
        ? parseDateToIso(String(row[acquiredCol])) ?? String(row[acquiredCol]).trim()
        : undefined;
    const nextMaintenanceDate =
      maintCol && row[maintCol] ? parseDateToIso(String(row[maintCol])) ?? undefined : undefined;
    const notes = notesCol && row[notesCol] ? String(row[notesCol]).trim() : undefined;

    const assetId = makeId('ast', `${docId}_${name}_${code ?? department}`);
    assets.push({
      id: assetId,
      name,
      code,
      department,
      category,
      acquiredAt,
      status,
      nextMaintenanceDate,
      notes,
      linkedDocIds: [docId],
    });

    if (nextMaintenanceDate) {
      reminders.push({
        id: makeId('rem', `${docId}_${assetId}_${nextMaintenanceDate}`),
        title: `${name} — Periyodik Bakım / Kalibrasyon`,
        dueDate: nextMaintenanceDate,
        priority: status === 'attention' ? 'high' : 'medium',
        category: 'maintenance',
        completed: false,
        sourceDocId: docId,
        assetId,
        autoExtracted: true,
        notes: `${department} birimi envanter tablosundan otomatik çıkarıldı.`,
      });
    }
  }

  return { assets, reminders };
}

function extractRemindersFromText(rawText: string, docId: string, docName: string): ReminderItem[] {
  const reminders: ReminderItem[] = [];
  const seenKeys = new Set<string>();
  const lines = rawText.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length < 8 || trimmed.length > 260) continue;

    const isoDate = parseDateToIso(trimmed);
    if (!isoDate) continue;

    const norm = normalizeTr(trimmed);
    let category: ReminderItem['category'] | null = null;
    let priority: ReminderItem['priority'] = 'medium';

    if (/(sut|sgk|medula|bildirim|beyanname|mevzuat)/.test(norm)) {
      category = 'sut';
      priority = 'high';
    } else if (/(bakim|kalibrasyon|servis|kontrol|denetim|wc|tesis|jenerator|klima)/.test(norm)) {
      category = 'maintenance';
      priority = /(acil|kritik|zorunlu)/.test(norm) ? 'high' : 'medium';
    } else if (/(fatura|odeme|butce|tahsilat|mali|finans|son odeme)/.test(norm)) {
      category = 'finance';
      priority = 'high';
    } else if (/(toplanti|kurul|komite|sunum|degerlendirme)/.test(norm)) {
      category = 'meeting';
      priority = 'medium';
    } else if (/(son tarih|son gun|teslim|deadline|hatirlat)/.test(norm)) {
      category = 'other';
      priority = 'high';
    }

    if (!category) continue;

    const cleanTitle = trimmed
      .replace(/^[-•*\d.)\s]+/, '')
      .slice(0, 96)
      .trim();
    const dedupeKey = `${isoDate}_${normalizeTr(cleanTitle).slice(0, 40)}`;
    if (seenKeys.has(dedupeKey)) continue;
    seenKeys.add(dedupeKey);

    reminders.push({
      id: makeId('rem', `${docId}_${dedupeKey}`),
      title: cleanTitle,
      dueDate: isoDate,
      priority,
      category,
      completed: false,
      sourceDocId: docId,
      autoExtracted: true,
      notes: `${docName} belgesinden otomatik çıkarıldı.`,
    });

    if (reminders.length >= 12) break;
  }

  return reminders;
}

function extractMetricsFromText(rawText: string, docId: string): ExtractedMetric[] {
  const metrics: ExtractedMetric[] = [];
  const patterns: {
    regex: RegExp;
    label: string;
    unit: string;
    category: ExtractedMetric['category'];
  }[] = [
    {
      regex: /(?:toplam\s+)?gelir[:\s]+([0-9.,]+)\s*(?:tl|₺|try)?/i,
      label: 'Belgeden Çıkarılan Gelir',
      unit: 'TL',
      category: 'revenue',
    },
    {
      regex: /(?:toplam\s+)?(?:gider|maliyet)[:\s]+([0-9.,]+)\s*(?:tl|₺|try)?/i,
      label: 'Belgeden Çıkarılan Gider',
      unit: 'TL',
      category: 'cost',
    },
    {
      regex: /(?:net\s+)?k[aâ]r[:\s]+([0-9.,]+)\s*(?:tl|₺|try)?/i,
      label: 'Belgeden Çıkarılan Net Kâr',
      unit: 'TL',
      category: 'profit',
    },
    {
      regex: /(?:toplam\s+)?hasta(?:\s+say[ıi]s[ıi])?[:\s]+([0-9.,]+)/i,
      label: 'Belgeden Çıkarılan Hasta Sayısı',
      unit: 'hasta',
      category: 'volume',
    },
  ];

  for (const p of patterns) {
    const match = p.regex.exec(rawText);
    if (!match) continue;
    const val = parseLocalizedNumber(match[1]);
    if (val !== null && val > 0) {
      metrics.push({
        id: makeId('met', `${docId}_text_${p.category}`),
        label: p.label,
        value: Math.round(val),
        unit: p.unit,
        category: p.category,
        sourceDocId: docId,
      });
    }
  }

  return metrics;
}

export function mergeChartSeries(
  existing: ChartSeriesPoint[],
  incoming: ChartSeriesPoint[]
): ChartSeriesPoint[] {
  const map = new Map<string, ChartSeriesPoint>();

  for (const pt of existing) {
    map.set(normalizeTr(pt.period), { ...pt });
  }

  for (const pt of incoming) {
    const key = normalizeTr(pt.period);
    const prev = map.get(key);
    if (!prev) {
      map.set(key, { ...pt });
    } else {
      const merged: ChartSeriesPoint = { ...prev, ...pt, period: prev.period };
      if (
        merged.revenue !== undefined &&
        merged.cost !== undefined &&
        pt.profit === undefined
      ) {
        merged.profit = Math.round((merged.revenue - merged.cost) * 100) / 100;
      }
      if (
        merged.profit !== undefined &&
        merged.revenue !== undefined &&
        merged.revenue > 0 &&
        pt.margin === undefined
      ) {
        merged.margin = Math.round((merged.profit / merged.revenue) * 1000) / 10;
      }
      map.set(key, merged);
    }
  }

  return Array.from(map.values());
}

export function extractIntelligenceFromDocument(doc: TertipDocument): ExtractionResult {
  const metrics: ExtractedMetric[] = [];
  let chartSeries: ChartSeriesPoint[] = [];
  const assets: AssetItem[] = [];
  const reminders: ReminderItem[] = [];

  for (const table of doc.tables) {
    const seriesRes = extractSeriesFromTable(table, doc.id);
    if (seriesRes.points.length > 0) {
      chartSeries = mergeChartSeries(chartSeries, seriesRes.points);
    }
    metrics.push(...seriesRes.metrics);

    const assetRes = extractAssetsFromTable(table, doc.id);
    assets.push(...assetRes.assets);
    reminders.push(...assetRes.reminders);
  }

  if (metrics.length === 0 && doc.rawText.length > 0) {
    metrics.push(...extractMetricsFromText(doc.rawText, doc.id));
  }

  if (doc.rawText.length > 0) {
    const textReminders = extractRemindersFromText(doc.rawText, doc.id, doc.name);
    const existingIds = new Set(reminders.map((r) => r.id));
    for (const r of textReminders) {
      if (!existingIds.has(r.id)) {
        reminders.push(r);
        existingIds.add(r.id);
      }
    }
  }

  const inferredCategory = inferCategory(doc);

  return {
    metrics,
    chartSeries,
    assets,
    reminders,
    inferredCategory,
  };
}
