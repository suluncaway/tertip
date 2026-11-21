import type { ChartSeriesPoint, WorkspaceState } from '../../types';
import { computeAuditReadiness } from '../analytics/auditReadiness';
import { runCrossDocumentAudit } from '../analytics/crossDocAudit';
import { anonymizeWorkspace } from '../privacy/kvkkShield';

export interface BriefingExportOptions {
  anonymizeKvkk: boolean;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatCurrencyTr(value: number): string {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatNumberTr(value: number): string {
  return new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 1 }).format(value);
}

function renderInlineTrendSvg(series: ChartSeriesPoint[]): string {
  if (series.length === 0) {
    return '<p style="color:#62694F;font-size:13px;">Grafik için dönem serisi verisi bulunmuyor.</p>';
  }

  const width = 680;
  const height = 210;
  const padLeft = 56;
  const padRight = 24;
  const padTop = 20;
  const padBottom = 34;
  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;

  const maxVal = Math.max(
    1,
    ...series.map((p) => Math.max(p.revenue ?? 0, p.cost ?? 0, p.profit ?? 0))
  );

  const slotW = chartW / series.length;
  const barW = Math.min(26, Math.max(10, slotW * 0.28));

  const bars = series
    .map((pt, i) => {
      const cx = padLeft + i * slotW + slotW / 2;
      const revH = ((pt.revenue ?? 0) / maxVal) * chartH;
      const profH = ((Math.max(0, pt.profit ?? 0)) / maxVal) * chartH;
      const revY = padTop + chartH - revH;
      const profY = padTop + chartH - profH;

      return `
        <rect x="${(cx - barW - 2).toFixed(1)}" y="${revY.toFixed(1)}" width="${barW.toFixed(1)}" height="${revH.toFixed(1)}" rx="4" fill="#4F5B2A" />
        <rect x="${(cx + 2).toFixed(1)}" y="${profY.toFixed(1)}" width="${barW.toFixed(1)}" height="${profH.toFixed(1)}" rx="4" fill="#B8892D" />
        <text x="${cx.toFixed(1)}" y="${height - 10}" text-anchor="middle" font-size="11" fill="#62694F">${escapeHtml(pt.period)}</text>
      `;
    })
    .join('');

  return `
    <svg viewBox="0 0 ${width} ${height}" width="100%" height="auto" role="img" aria-label="Gelir ve Net Kâr Trendi">
      <line x1="${padLeft}" y1="${padTop + chartH}" x2="${width - padRight}" y2="${padTop + chartH}" stroke="#D8C9A8" stroke-width="1" />
      <line x1="${padLeft}" y1="${padTop + chartH / 2}" x2="${width - padRight}" y2="${padTop + chartH / 2}" stroke="#EDE4D2" stroke-dasharray="4 4" />
      <text x="${padLeft - 8}" y="${padTop + 6}" text-anchor="end" font-size="10" fill="#62694F">${formatNumberTr(maxVal / 1_000_000)}M</text>
      <text x="${padLeft - 8}" y="${padTop + chartH / 2 + 4}" text-anchor="end" font-size="10" fill="#62694F">${formatNumberTr(maxVal / 2_000_000)}M</text>
      ${bars}
    </svg>
    <div style="display:flex;gap:16px;font-size:12px;color:#62694F;margin-top:6px;">
      <span><span style="display:inline-block;width:10px;height:10px;border-radius:3px;background:#4F5B2A;margin-right:6px;"></span>Gelir</span>
      <span><span style="display:inline-block;width:10px;height:10px;border-radius:3px;background:#B8892D;margin-right:6px;"></span>Net Kâr</span>
    </div>
  `;
}

export function buildExecutiveBriefingHtml(
  state: WorkspaceState,
  options: BriefingExportOptions
): string {
  const safeState = options.anonymizeKvkk ? anonymizeWorkspace(state) : state;
  const readiness = computeAuditReadiness(safeState);
  const audit = runCrossDocumentAudit(safeState);

  const totalRevenue = safeState.chartSeries.reduce((s, p) => s + (p.revenue ?? 0), 0);
  const totalProfit = safeState.chartSeries.reduce((s, p) => s + (p.profit ?? 0), 0);
  const totalPatients = safeState.chartSeries.reduce((s, p) => s + (p.patients ?? 0), 0);
  const avgMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

  const openReminders = safeState.reminders
    .filter((r) => !r.completed)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .slice(0, 8);

  const nowStr = new Date().toLocaleString('tr-TR');

  const reminderRows =
    openReminders.length === 0
      ? '<tr><td colspan="3" style="color:#62694F;">Açık hatırlatıcı bulunmuyor.</td></tr>'
      : openReminders
          .map(
            (r) => `
            <tr>
              <td style="font-weight:600;">${escapeHtml(r.title)}</td>
              <td>${escapeHtml(r.dueDate)}</td>
              <td><span class="pill ${r.priority === 'high' ? 'pill-high' : 'pill-med'}">${
                r.priority === 'high' ? 'Yüksek' : r.priority === 'medium' ? 'Orta' : 'Düşük'
              }</span></td>
            </tr>`
          )
          .join('');

  const findingItems =
    audit.findings.length === 0
      ? '<p style="color:#4F5B2A;font-size:13px;font-weight:600;">Belgeler arası tutarsızlık, mükerrer satır veya kritik anomali tespit edilmedi.</p>'
      : `<ul style="margin:0;padding-left:18px;font-size:13px;line-height:1.6;">
          ${audit.findings
            .slice(0, 6)
            .map(
              (f) =>
                `<li><strong>${escapeHtml(f.title)}:</strong> ${escapeHtml(f.detail)}</li>`
            )
            .join('')}
        </ul>`;

  return `<!doctype html>
<html lang="tr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Tertip Yönetici Brifingi — ${escapeHtml(safeState.workspaceName)}</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; padding: 28px 18px; background: #F5EFE3; color: #1F2414; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    .sheet { max-width: 880px; margin: 0 auto; background: #FCF9F2; border: 1px solid #D8C9A8; border-radius: 18px; padding: 32px; box-shadow: 0 14px 36px rgba(31,36,20,0.07); }
    .header { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; border-bottom: 1px solid #D8C9A8; padding-bottom: 18px; margin-bottom: 22px; flex-wrap: wrap; }
    .eyebrow { font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase; color: #4F5B2A; font-weight: 700; }
    h1 { margin: 6px 0 4px; font-size: 24px; color: #1F2414; }
    .sub { font-size: 13px; color: #62694F; }
    .badge { display: inline-block; padding: 6px 12px; border-radius: 999px; font-size: 12px; font-weight: 700; background: #4F5B2A; color: #FCF9F2; }
    .badge-gold { background: #B8892D; }
    .kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 12px; margin-bottom: 24px; }
    .kpi { background: #F8F3E8; border: 1px solid #D8C9A8; border-radius: 12px; padding: 14px 16px; }
    .kpi-label { font-size: 12px; color: #62694F; }
    .kpi-val { font-size: 20px; font-weight: 700; color: #1F2414; margin-top: 4px; }
    .section { margin-top: 24px; padding-top: 18px; border-top: 1px solid #EDE4D2; }
    .section h2 { margin: 0 0 12px; font-size: 16px; color: #4F5B2A; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th, td { text-align: left; padding: 9px 10px; border-bottom: 1px solid #EDE4D2; }
    th { color: #62694F; font-weight: 600; background: #F8F3E8; }
    .pill { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 700; }
    .pill-high { background: #FCE8E6; color: #A94438; }
    .pill-med { background: #F8EED8; color: #8A641B; }
    .footer { margin-top: 28px; padding-top: 14px; border-top: 1px solid #D8C9A8; font-size: 11.5px; color: #62694F; display: flex; justify-content: space-between; flex-wrap: wrap; gap: 8px; }
    @media print {
      body { background: #fff; padding: 0; }
      .sheet { border: none; box-shadow: none; padding: 12px; }
    }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="header">
      <div>
        <div class="eyebrow">TERTİP · YÖNETİCİ OPERASYON BRİFİNGİ</div>
        <h1>${escapeHtml(safeState.workspaceName)}</h1>
        <div class="sub">${escapeHtml(safeState.sector)} · Hazırlanma: ${escapeHtml(nowStr)}</div>
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px;">
        <span class="badge">Denetime Hazırlık: %${readiness.score}</span>
        ${
          options.anonymizeKvkk
            ? '<span class="badge badge-gold">KVKK Maskeli Sürüm</span>'
            : ''
        }
      </div>
    </div>

    <div class="kpis">
      <div class="kpi">
        <div class="kpi-label">Toplam Gelir</div>
        <div class="kpi-val">${formatCurrencyTr(totalRevenue)}</div>
      </div>
      <div class="kpi">
        <div class="kpi-label">Net Kâr</div>
        <div class="kpi-val">${formatCurrencyTr(totalProfit)}</div>
      </div>
      <div class="kpi">
        <div class="kpi-label">Ortalama Marj</div>
        <div class="kpi-val">%${avgMargin.toFixed(1)}</div>
      </div>
      <div class="kpi">
        <div class="kpi-label">Toplam Hacim / İşlem</div>
        <div class="kpi-val">${formatNumberTr(totalPatients)}</div>
      </div>
    </div>

    <div class="section">
      <h2>Dönemsel Gelir &amp; Net Kâr Trendi</h2>
      ${renderInlineTrendSvg(safeState.chartSeries)}
    </div>

    <div class="section">
      <h2>Öncelikli Hatırlatıcılar ve Yaklaşan Süreçler (${openReminders.length})</h2>
      <table>
        <thead>
          <tr><th>Görev / Süreç</th><th>Son Tarih</th><th>Öncelik</th></tr>
        </thead>
        <tbody>${reminderRows}</tbody>
      </table>
    </div>

    <div class="section">
      <h2>Çapraz Belge Denetimi &amp; Risk Bulguları (${audit.findings.length})</h2>
      ${findingItems}
    </div>

    <div class="footer">
      <span>Tertip · %100 Yerel, Sunucusuz Operasyonel Analitik</span>
      <span>Belgeler: ${safeState.documents.length} · Varlıklar: ${safeState.assets.length} · Eksik Kanıt: ${readiness.missingItems.length}</span>
    </div>
  </div>
</body>
</html>`;
}

export function exportExecutiveBriefingHtml(
  state: WorkspaceState,
  options: BriefingExportOptions
): void {
  const html = buildExecutiveBriefingHtml(state, options);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  try {
    const a = document.createElement('a');
    a.href = url;
    a.download = options.anonymizeKvkk ? 'tertip-brief-kvkk.html' : 'tertip-brief.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

export function printExecutiveBriefing(
  state: WorkspaceState,
  options: BriefingExportOptions
): void {
  const html = buildExecutiveBriefingHtml(state, options);
  const win = window.open('', '_blank', 'width=960,height=780');
  if (!win) {
    // Fallback to HTML download if popup was blocked
    exportExecutiveBriefingHtml(state, options);
    return;
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => {
    win.print();
  }, 250);
}
