import type { ParsedTable, TertipDocument, WorkspaceState } from '../../types';
import { parseLocalizedNumber } from '../parsers/extractor';

export interface AuditFinding {
  id: string;
  severity: 'high' | 'medium' | 'low';
  type: 'discrepancy' | 'duplicate' | 'anomaly';
  title: string;
  detail: string;
  docIds: string[];
  metricValue?: string;
}

export interface CrossDocAuditResult {
  findings: AuditFinding[];
  anomalyCount: number;
  duplicateCount: number;
  discrepancyCount: number;
}

export interface LocalQueryResult {
  columns: string[];
  rows: Record<string, string | number | null>[];
  rowCount: number;
  tableName?: string;
  error?: string;
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

function makeFindingId(prefix: string, idx: number): string {
  return `audit_${prefix}_${idx}`;
}

function computeStats(values: number[]): {
  mean: number;
  stdDev: number;
  q1: number;
  q3: number;
  iqr: number;
} {
  const n = values.length;
  const mean = values.reduce((a, b) => a + b, 0) / n;
  const variance = values.reduce((acc, v) => acc + (v - mean) ** 2, 0) / n;
  const stdDev = Math.sqrt(variance);
  const sorted = [...values].sort((a, b) => a - b);
  const q1 = sorted[Math.floor((n - 1) * 0.25)];
  const q3 = sorted[Math.floor((n - 1) * 0.75)];
  return { mean, stdDev, q1, q3, iqr: q3 - q1 };
}

function formatNumberTr(value: number): string {
  return new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 1 }).format(value);
}

export function runCrossDocumentAudit(state: WorkspaceState): CrossDocAuditResult {
  const findings: AuditFinding[] = [];
  let idx = 1;

  // 1. Duplicate row detection across all tables & documents
  const seenRowSignatures = new Map<
    string,
    { docId: string; docName: string; tableName: string; preview: string }
  >();

  for (const doc of state.documents) {
    for (const table of doc.tables) {
      for (const row of table.rows) {
        const vals = table.headers
          .map((h) => String(row[h] ?? '').trim())
          .filter((v) => v.length > 0);
        if (vals.length < 2) continue;
        const sig = normalizeTr(vals.join('|'));
        const existing = seenRowSignatures.get(sig);
        if (existing) {
          const sameDoc = existing.docId === doc.id;
          findings.push({
            id: makeFindingId('dup', idx++),
            severity: sameDoc ? 'medium' : 'high',
            type: 'duplicate',
            title: sameDoc
              ? `Tablo içi mükerrer satır: ${table.name}`
              : `Belgeler arası mükerrer kayıt tespit edildi`,
            detail: sameDoc
              ? `"${doc.name}" içindeki "${table.name}" tablosunda aynı kayıt birden fazla kez geçiyor: ${vals.slice(0, 3).join(' · ')}`
              : `"${existing.docName}" ve "${doc.name}" belgelerinde birebir aynı satır tespit edildi: ${vals.slice(0, 3).join(' · ')}`,
            docIds: sameDoc ? [doc.id] : [existing.docId, doc.id],
            metricValue: vals[0],
          });
          if (findings.length >= 25) break;
        } else {
          seenRowSignatures.set(sig, {
            docId: doc.id,
            docName: doc.name,
            tableName: table.name,
            preview: vals.slice(0, 3).join(' · '),
          });
        }
      }
    }
  }

  // 2. Cross-document financial & profit/margin consistency checks
  for (const pt of state.chartSeries) {
    if (
      pt.revenue !== undefined &&
      pt.cost !== undefined &&
      pt.profit !== undefined
    ) {
      const expectedProfit = pt.revenue - pt.cost;
      const diff = Math.abs(expectedProfit - pt.profit);
      if (diff > Math.max(100, pt.revenue * 0.015)) {
        findings.push({
          id: makeFindingId('disc', idx++),
          severity: 'high',
          type: 'discrepancy',
          title: `${pt.period} dönemi Gelir-Gider / Net Kâr tutarsızlığı`,
          detail: `Gelir (${formatNumberTr(pt.revenue)}) - Gider (${formatNumberTr(
            pt.cost
          )}) = ${formatNumberTr(expectedProfit)} olmalı, ancak kayıtlı Net Kâr ${formatNumberTr(
            pt.profit
          )} (fark: ${formatNumberTr(diff)}).`,
          docIds: state.documents.slice(0, 1).map((d) => d.id),
          metricValue: `${formatNumberTr(diff)} TL fark`,
        });
      }
    }
    if (
      pt.patients !== undefined &&
      pt.discharged !== undefined &&
      pt.discharged > pt.patients
    ) {
      findings.push({
        id: makeFindingId('disc', idx++),
        severity: 'medium',
        type: 'discrepancy',
        title: `${pt.period} döneminde taburcu sayısı hasta girişini aşıyor`,
        detail: `Kayıtlı hasta (${formatNumberTr(pt.patients)}) sayısından fazla taburcu (${formatNumberTr(
          pt.discharged
        )}) görünüyor; önceki aydan devir yoksa veri girişini doğrulayın.`,
        docIds: state.documents.slice(0, 1).map((d) => d.id),
        metricValue: `${pt.discharged} / ${pt.patients}`,
      });
    }
  }

  // Compare revenue metrics from different documents against chartSeries total
  const chartRevenueTotal = state.chartSeries.reduce((sum, p) => sum + (p.revenue ?? 0), 0);
  if (chartRevenueTotal > 0) {
    const revMetrics = state.metrics.filter((m) => m.category === 'revenue');
    for (const m of revMetrics) {
      if (m.value > 0 && revMetrics.length > 1) {
        const deltaRatio = Math.abs(m.value - chartRevenueTotal) / chartRevenueTotal;
        if (deltaRatio > 0.03) {
          findings.push({
            id: makeFindingId('disc', idx++),
            severity: 'high',
            type: 'discrepancy',
            title: `Belge geliri ile dönem serisi toplamı uyuşmuyor`,
            detail: `"${m.label}" (${formatNumberTr(m.value)} TL) ile grafik serisi toplam geliri (${formatNumberTr(
              chartRevenueTotal
            )} TL) arasında %${(deltaRatio * 100).toFixed(1)} fark var.`,
            docIds: [m.sourceDocId],
            metricValue: `%${(deltaRatio * 100).toFixed(1)} sapma`,
          });
        }
      }
    }
  }

  // Check attention/maintenance assets that lack a linked active reminder
  for (const asset of state.assets) {
    if (asset.status === 'attention') {
      const hasActiveReminder = state.reminders.some(
        (r) => !r.completed && (r.assetId === asset.id || normalizeTr(r.title).includes(normalizeTr(asset.name).slice(0, 14)))
      );
      if (!hasActiveReminder) {
        findings.push({
          id: makeFindingId('disc', idx++),
          severity: 'medium',
          type: 'discrepancy',
          title: `Kritik varlık için açık takip hatırlatıcısı yok: ${asset.name}`,
          detail: `"${asset.name}" (${asset.department}) "Dikkat" durumunda ancak eşleşen açık bir bakım/aksiyon hatırlatıcısı bulunamadı.`,
          docIds: asset.linkedDocIds,
          metricValue: 'Takip eksik',
        });
      }
    }
  }

  // 3. Statistical Z-score & IQR anomaly detection on chartSeries
  if (state.chartSeries.length >= 4) {
    const fields: { key: 'revenue' | 'cost' | 'profit' | 'margin' | 'patients'; label: string; unit: string }[] = [
      { key: 'revenue', label: 'Gelir', unit: 'TL' },
      { key: 'cost', label: 'Gider', unit: 'TL' },
      { key: 'margin', label: 'Kâr Marjı', unit: '%' },
      { key: 'patients', label: 'Hacim / Hasta', unit: '' },
    ];

    for (const f of fields) {
      const pts = state.chartSeries
        .map((p) => ({ period: p.period, val: p[f.key] }))
        .filter((x): x is { period: string; val: number } => typeof x.val === 'number');

      if (pts.length < 4) continue;
      const stats = computeStats(pts.map((p) => p.val));
      if (stats.stdDev === 0) continue;

      for (const p of pts) {
        const z = (p.val - stats.mean) / stats.stdDev;
        const outsideIqr =
          stats.iqr > 0 &&
          (p.val < stats.q1 - 1.5 * stats.iqr || p.val > stats.q3 + 1.5 * stats.iqr);

        if (Math.abs(z) >= 1.75 || outsideIqr) {
          const direction = z > 0 ? 'ortalamanın belirgin üzerinde' : 'ortalamanın belirgin altında';
          findings.push({
            id: makeFindingId('anom', idx++),
            severity: Math.abs(z) >= 2.2 ? 'high' : 'low',
            type: 'anomaly',
            title: `${p.period} — ${f.label} istatistiksel sapma (Z=${z.toFixed(1)})`,
            detail: `${p.period} dönemi ${f.label} değeri (${formatNumberTr(p.val)}${
              f.unit ? ` ${f.unit}` : ''
            }), dönem ortalamasının (${formatNumberTr(stats.mean)}) ${direction}.`,
            docIds: state.documents.slice(0, 1).map((d) => d.id),
            metricValue: `Z = ${z > 0 ? '+' : ''}${z.toFixed(2)}`,
          });
        }
      }
    }
  }

  // 4. Anomaly detection on arbitrary uploaded table numeric columns
  for (const doc of state.documents) {
    for (const table of doc.tables) {
      if (table.rows.length < 5) continue;
      for (const header of table.headers) {
        const normH = normalizeTr(header);
        if (/(donem|ay|tarih|kod|seri|no|id)/.test(normH)) continue;

        const entries: { rowIdx: number; label: string; val: number }[] = [];
        table.rows.forEach((row, rIdx) => {
          const num = parseLocalizedNumber(row[header]);
          if (num !== null) {
            const firstCol = table.headers[0];
            entries.push({
              rowIdx: rIdx + 1,
              label: String(row[firstCol] ?? `Satır ${rIdx + 1}`),
              val: num,
            });
          }
        });

        if (entries.length < 5) continue;
        const stats = computeStats(entries.map((e) => e.val));
        if (stats.stdDev === 0 || stats.iqr === 0) continue;

        for (const e of entries) {
          const z = (e.val - stats.mean) / stats.stdDev;
          if (Math.abs(z) >= 2.3) {
            findings.push({
              id: makeFindingId('tbl_anom', idx++),
              severity: 'medium',
              type: 'anomaly',
              title: `${table.name} → "${header}" sütununda uç değer`,
              detail: `"${e.label}" satırındaki ${header} değeri (${formatNumberTr(
                e.val
              )}), tablo ortalamasından (${formatNumberTr(stats.mean)}) yüksek sapma gösteriyor.`,
              docIds: [doc.id],
              metricValue: `Z = ${z > 0 ? '+' : ''}${z.toFixed(1)}`,
            });
            break;
          }
        }
      }
    }
  }

  // Sort high -> medium -> low
  const severityRank: Record<AuditFinding['severity'], number> = {
    high: 0,
    medium: 1,
    low: 2,
  };
  findings.sort((a, b) => severityRank[a.severity] - severityRank[b.severity]);

  return {
    findings,
    anomalyCount: findings.filter((f) => f.type === 'anomaly').length,
    duplicateCount: findings.filter((f) => f.type === 'duplicate').length,
    discrepancyCount: findings.filter((f) => f.type === 'discrepancy').length,
  };
}

// ============================================================================
// Lightweight 100% In-Browser SQL / Table Query Engine
// ============================================================================

interface IndexedTable {
  alias: string;
  docName: string;
  table: ParsedTable;
}

function collectTables(docs: TertipDocument[]): IndexedTable[] {
  const result: IndexedTable[] = [];
  for (const doc of docs) {
    for (const table of doc.tables) {
      result.push({
        alias: table.name,
        docName: doc.name,
        table,
      });
    }
  }
  return result;
}

function resolveColumn(headers: string[], requested: string): string | null {
  const clean = requested.replace(/^["'`]|["'`]$/g, '').trim();
  const exact = headers.find((h) => h === clean);
  if (exact) return exact;
  const normReq = normalizeTr(clean);
  const normExact = headers.find((h) => normalizeTr(h) === normReq);
  if (normExact) return normExact;
  const partial = headers.find((h) => normalizeTr(h).includes(normReq));
  return partial ?? null;
}

function resolveTable(tables: IndexedTable[], requested: string): IndexedTable | null {
  const clean = requested.replace(/^["'`]|["'`]$/g, '').trim();
  const normReq = normalizeTr(clean);
  if (!normReq) return null;

  return (
    tables.find((t) => normalizeTr(t.alias) === normReq) ??
    tables.find((t) => normalizeTr(t.alias).includes(normReq)) ??
    tables.find((t) => normalizeTr(t.docName).includes(normReq)) ??
    null
  );
}

function compareValues(
  left: string | number | null | undefined,
  op: string,
  rawRight: string
): boolean {
  const rightClean = rawRight.replace(/^['"]|['"]$/g, '').trim();
  const upperOp = op.toUpperCase();

  if (upperOp === 'LIKE' || upperOp === 'CONTAINS') {
    const leftStr = normalizeTr(String(left ?? ''));
    const needle = normalizeTr(rightClean.replace(/%/g, ''));
    return leftStr.includes(needle);
  }

  const leftNum = parseLocalizedNumber(left);
  const rightNum = parseLocalizedNumber(rightClean);

  if (leftNum !== null && rightNum !== null) {
    switch (upperOp) {
      case '=':
        return leftNum === rightNum;
      case '!=':
      case '<>':
        return leftNum !== rightNum;
      case '>':
        return leftNum > rightNum;
      case '>=':
        return leftNum >= rightNum;
      case '<':
        return leftNum < rightNum;
      case '<=':
        return leftNum <= rightNum;
      default:
        return false;
    }
  }

  const lStr = normalizeTr(String(left ?? ''));
  const rStr = normalizeTr(rightClean);
  switch (upperOp) {
    case '=':
      return lStr === rStr;
    case '!=':
    case '<>':
      return lStr !== rStr;
    case '>':
      return lStr > rStr;
    case '>=':
      return lStr >= rStr;
    case '<':
      return lStr < rStr;
    case '<=':
      return lStr <= rStr;
    default:
      return false;
  }
}

export function runLocalTableQuery(
  docs: TertipDocument[],
  query: string
): LocalQueryResult {
  const trimmed = query.trim().replace(/;+\s*$/, '');
  const tables = collectTables(docs);

  if (!trimmed) {
    return {
      columns: [],
      rows: [],
      rowCount: 0,
      error: 'Lütfen bir sorgu girin (ör. SHOW TABLES veya SELECT * FROM ...).',
    };
  }

  if (/^SHOW\s+TABLES$/i.test(trimmed)) {
    const rows = tables.map((t) => ({
      Tablo: t.alias,
      'Kaynak Belge': t.docName,
      Satır: t.table.rows.length,
      Sütunlar: t.table.headers.join(', '),
    }));
    return {
      columns: ['Tablo', 'Kaynak Belge', 'Satır', 'Sütunlar'],
      rows,
      rowCount: rows.length,
      tableName: 'SHOW TABLES',
    };
  }

  // Parse: SELECT <selectClause> FROM <tableClause> [WHERE <whereClause>] [ORDER BY <orderClause>] [LIMIT <n>]
  const sqlRegex =
    /^SELECT\s+(.+?)\s+FROM\s+("[^"]+"|`[^`]+`|\S+)(?:\s+WHERE\s+(.+?))?(?:\s+ORDER\s+BY\s+(.+?))?(?:\s+LIMIT\s+(\d+))?$/i;

  const match = sqlRegex.exec(trimmed);
  if (!match) {
    return {
      columns: [],
      rows: [],
      rowCount: 0,
      error:
        'Sorgu sözdizimi anlaşılamadı. Desteklenen biçim: SELECT <sütunlar|*|SUM/AVG/COUNT/MIN/MAX> FROM <tablo> [WHERE ...] [ORDER BY ...] [LIMIT n] veya SHOW TABLES.',
    };
  }

  const [, selectPart, tablePart, wherePart, orderPart, limitPart] = match;
  const target = resolveTable(tables, tablePart);

  if (!target) {
    const available = tables.map((t) => `"${t.alias}"`).join(', ') || 'yok';
    return {
      columns: [],
      rows: [],
      rowCount: 0,
      error: `"${tablePart}" tablosu bulunamadı. Mevcut tablolar: ${available}`,
    };
  }

  let workingRows = [...target.table.rows];

  // WHERE filtering (supports AND)
  if (wherePart) {
    const conditions = wherePart.split(/\s+AND\s+/i);
    for (const cond of conditions) {
      const condMatch =
        /^("[^"]+"|`[^`]+`|[a-zA-Z0-9_ğüşıöçĞÜŞİÖÇ%().\s-]+?)\s*(>=|<=|!=|<>|=|>|<|LIKE|CONTAINS)\s*(.+)$/i.exec(
          cond.trim()
        );
      if (!condMatch) {
        return {
          columns: [],
          rows: [],
          rowCount: 0,
          error: `WHERE koşulu anlaşılamadı: "${cond.trim()}"`,
        };
      }
      const [, colRaw, op, valRaw] = condMatch;
      const col = resolveColumn(target.table.headers, colRaw);
      if (!col) {
        return {
          columns: [],
          rows: [],
          rowCount: 0,
          error: `"${colRaw.trim()}" sütunu "${target.alias}" tablosunda bulunamadı.`,
        };
      }
      workingRows = workingRows.filter((row) => compareValues(row[col], op, valRaw));
    }
  }

  // ORDER BY
  if (orderPart) {
    const orderMatch = /^(.+?)(?:\s+(ASC|DESC))?$/i.exec(orderPart.trim());
    if (orderMatch) {
      const col = resolveColumn(target.table.headers, orderMatch[1]);
      const desc = (orderMatch[2] ?? 'ASC').toUpperCase() === 'DESC';
      if (col) {
        workingRows.sort((a, b) => {
          const an = parseLocalizedNumber(a[col]);
          const bn = parseLocalizedNumber(b[col]);
          let cmp = 0;
          if (an !== null && bn !== null) {
            cmp = an - bn;
          } else {
            cmp = String(a[col] ?? '').localeCompare(String(b[col] ?? ''), 'tr-TR');
          }
          return desc ? -cmp : cmp;
        });
      }
    }
  }

  // SELECT expressions (check if aggregate)
  const rawExprs = selectPart
    .split(',')
    .map((e) => e.trim())
    .filter(Boolean);

  const aggRegex = /^(SUM|AVG|COUNT|MIN|MAX)\s*\(\s*([^)]+)\s*\)(?:\s+AS\s+(.+))?$/i;
  const hasAggregate = rawExprs.some((expr) => aggRegex.test(expr));

  if (hasAggregate) {
    const aggRow: Record<string, string | number | null> = {};
    const columns: string[] = [];

    for (const expr of rawExprs) {
      const am = aggRegex.exec(expr);
      if (!am) continue;
      const fn = am[1].toUpperCase();
      const arg = am[2].trim();
      const alias = am[3]?.replace(/^["'`]|["'`]$/g, '').trim() || `${fn}(${arg})`;
      columns.push(alias);

      if (fn === 'COUNT' && arg === '*') {
        aggRow[alias] = workingRows.length;
        continue;
      }

      const col = resolveColumn(target.table.headers, arg);
      if (!col) {
        return {
          columns: [],
          rows: [],
          rowCount: 0,
          error: `Fonksiyon içindeki "${arg}" sütunu bulunamadı.`,
        };
      }

      if (fn === 'COUNT') {
        aggRow[alias] = workingRows.filter(
          (r) => r[col] !== null && r[col] !== undefined && String(r[col]).trim() !== ''
        ).length;
        continue;
      }

      const nums = workingRows
        .map((r) => parseLocalizedNumber(r[col]))
        .filter((n): n is number => n !== null);

      if (nums.length === 0) {
        aggRow[alias] = null;
      } else if (fn === 'SUM') {
        aggRow[alias] = Math.round(nums.reduce((a, b) => a + b, 0) * 100) / 100;
      } else if (fn === 'AVG') {
        aggRow[alias] = Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 100) / 100;
      } else if (fn === 'MIN') {
        aggRow[alias] = Math.min(...nums);
      } else if (fn === 'MAX') {
        aggRow[alias] = Math.max(...nums);
      }
    }

    return {
      columns,
      rows: [aggRow],
      rowCount: 1,
      tableName: target.alias,
    };
  }

  // Standard row projection
  if (limitPart) {
    const limit = Number.parseInt(limitPart, 10);
    if (Number.isFinite(limit) && limit >= 0) {
      workingRows = workingRows.slice(0, limit);
    }
  }

  let selectedCols: { source: string; alias: string }[];
  if (rawExprs.length === 1 && rawExprs[0] === '*') {
    selectedCols = target.table.headers.map((h) => ({ source: h, alias: h }));
  } else {
    selectedCols = [];
    for (const expr of rawExprs) {
      const asMatch = /^(.+?)\s+AS\s+(.+)$/i.exec(expr);
      const colExpr = asMatch ? asMatch[1].trim() : expr;
      const alias = asMatch ? asMatch[2].replace(/^["'`]|["'`]$/g, '').trim() : null;
      const resolved = resolveColumn(target.table.headers, colExpr);
      if (!resolved) {
        return {
          columns: [],
          rows: [],
          rowCount: 0,
          error: `"${colExpr}" sütunu "${target.alias}" tablosunda bulunamadı.`,
        };
      }
      selectedCols.push({ source: resolved, alias: alias ?? resolved });
    }
  }

  const columns = selectedCols.map((c) => c.alias);
  const projectedRows = workingRows.map((row) => {
    const out: Record<string, string | number | null> = {};
    for (const c of selectedCols) {
      out[c.alias] = row[c.source] ?? null;
    }
    return out;
  });

  return {
    columns,
    rows: projectedRows,
    rowCount: projectedRows.length,
    tableName: target.alias,
  };
}
