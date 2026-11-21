import type { WorkspaceState } from '../../types';
import { computeAuditReadiness } from '../analytics/auditReadiness';
import { runCrossDocumentAudit } from '../analytics/crossDocAudit';
import { comparePeriods } from '../analytics/periodDelta';
import { anonymizeWorkspace } from '../privacy/kvkkShield';

export type CapsuleSection =
  | 'kpis'
  | 'chart'
  | 'reminders'
  | 'assets'
  | 'documents'
  | 'audit'
  | 'delta';

export interface AuditorCapsuleOptions {
  sections: CapsuleSection[];
  documentIds?: string[];
  anonymizeKvkk: boolean;
  auditorName?: string;
  note?: string;
  password?: string;
}

export interface AuditorCapsuleResult {
  html: string;
  fingerprint: string;
  rawHashHex: string;
  createdAt: string;
  sections: CapsuleSection[];
  encrypted: boolean;
}

export interface CapsuleVerificationResult {
  valid: boolean;
  fingerprint: string;
  matchesExpected?: boolean;
  createdAt?: string;
  sections: CapsuleSection[];
  encrypted: boolean;
  error?: string;
}

interface CapsuleMeta {
  format: 'tertip-capsule';
  version: 1;
  createdAt: string;
  workspaceName: string;
  sector: string;
  sections: CapsuleSection[];
  anonymized: boolean;
  auditorName?: string;
  note?: string;
  encrypted: boolean;
  sha256: string;
  fingerprint: string;
  kdf?: 'PBKDF2-SHA256';
  iterations?: number;
  cipher?: 'AES-GCM-256';
  salt?: string;
  iv?: string;
}

export const CAPSULE_HONESTY_NOTE =
  'Dürüstlük Notu: Dosya içindeki SHA-256 mührü aktarım sonrası izinsiz değişiklikleri tespit eder; ancak dosyaya erişen biri içeriği değiştirip mührü de yeniden üretebilir. Kesin doğrulama için parmak izini göndericiyle ayrı bir kanaldan (telefon veya kurumsal e-posta) teyit edin.';

const PBKDF2_ITERATIONS = 250_000;

function getSubtle(): SubtleCrypto {
  if (typeof crypto === 'undefined' || !crypto.subtle) {
    throw new Error('Tarayıcınız Web Crypto API desteklemiyor veya güvenli bağlam dışında.');
  }
  return crypto.subtle;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function safeJsonForScript(obj: unknown): string {
  return JSON.stringify(obj)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

export function formatCapsuleFingerprint(hex: string): string {
  const clean = hex.replace(/[^0-9A-Fa-f]/g, '').toUpperCase().slice(0, 32);
  return clean.replace(/(.{4})(?=.)/g, '$1-');
}

function canonicalizeValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(canonicalizeValue);
  }
  if (value !== null && typeof value === 'object') {
    const sorted: Record<string, unknown> = {};
    const keys = Object.keys(value as Record<string, unknown>).sort();
    for (const k of keys) {
      const v = (value as Record<string, unknown>)[k];
      if (v !== undefined) {
        sorted[k] = canonicalizeValue(v);
      }
    }
    return sorted;
  }
  return value;
}

function canonicalJsonStringify(value: unknown): string {
  return JSON.stringify(canonicalizeValue(value))
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

async function sha256Hex(text: string): Promise<string> {
  const subtle = getSubtle();
  const digest = await subtle.digest('SHA-256', new TextEncoder().encode(text));
  return bytesToHex(new Uint8Array(digest));
}

async function encryptPayloadString(
  plaintext: string,
  password: string
): Promise<{ salt: string; iv: string; ciphertext: string }> {
  const subtle = getSubtle();
  const salt = new Uint8Array(new ArrayBuffer(16));
  const iv = new Uint8Array(new ArrayBuffer(12));
  crypto.getRandomValues(salt);
  crypto.getRandomValues(iv);

  const keyMaterial = await subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  const key = await subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  );

  const enc = await subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(plaintext)
  );

  return {
    salt: bytesToBase64(salt),
    iv: bytesToBase64(iv),
    ciphertext: bytesToBase64(new Uint8Array(enc)),
  };
}

function buildCanonicalPayload(
  state: WorkspaceState,
  opts: AuditorCapsuleOptions,
  createdAt: string
): Record<string, unknown> {
  const safeState = opts.anonymizeKvkk ? anonymizeWorkspace(state) : state;
  const sectionSet = new Set<CapsuleSection>(opts.sections);

  const payload: Record<string, unknown> = {
    workspaceName: safeState.workspaceName,
    sector: safeState.sector,
    createdAt,
    anonymized: opts.anonymizeKvkk,
    auditorName: opts.auditorName?.trim() || undefined,
    note: opts.note?.trim() || undefined,
    sections: [...opts.sections],
  };

  if (sectionSet.has('kpis')) {
    const totalRevenue = safeState.chartSeries.reduce((s, p) => s + (p.revenue ?? 0), 0);
    const totalCost = safeState.chartSeries.reduce((s, p) => s + (p.cost ?? 0), 0);
    const totalProfit = safeState.chartSeries.reduce((s, p) => s + (p.profit ?? 0), 0);
    const totalVolume = safeState.chartSeries.reduce((s, p) => s + (p.patients ?? 0), 0);
    payload.kpis = {
      totalRevenue,
      totalCost,
      totalProfit,
      avgMargin: totalRevenue > 0 ? Math.round((totalProfit / totalRevenue) * 1000) / 10 : 0,
      totalVolume,
      metrics: safeState.metrics,
    };
  }

  if (sectionSet.has('chart')) {
    payload.chartSeries = safeState.chartSeries;
  }

  if (sectionSet.has('reminders')) {
    payload.reminders = safeState.reminders;
  }

  if (sectionSet.has('assets')) {
    payload.assets = safeState.assets;
  }

  if (sectionSet.has('documents')) {
    const allowedIds =
      opts.documentIds && opts.documentIds.length > 0 ? new Set(opts.documentIds) : null;
    payload.documents = safeState.documents
      .filter((d) => (!allowedIds ? true : allowedIds.has(d.id)))
      .map((d) => ({
        id: d.id,
        name: d.name,
        kind: d.kind,
        category: d.category,
        uploadedAt: d.uploadedAt,
        summary: d.summary,
        ocrUsed: Boolean(d.ocrUsed),
        tableCount: d.tables.length,
        excerpt: d.rawText.slice(0, 1400),
      }));
  }

  if (sectionSet.has('audit')) {
    payload.audit = {
      readiness: computeAuditReadiness(safeState),
      crossDoc: runCrossDocumentAudit(safeState),
    };
  }

  if (sectionSet.has('delta')) {
    payload.delta = comparePeriods(safeState);
  }

  return payload;
}

export async function buildAuditorCapsule(
  state: WorkspaceState,
  opts: AuditorCapsuleOptions
): Promise<AuditorCapsuleResult> {
  if (opts.sections.length === 0) {
    throw new Error('Denetçi kapsülü için en az bir bölüm seçilmelidir.');
  }

  const createdAt = new Date().toISOString();
  const payloadObj = buildCanonicalPayload(state, opts, createdAt);
  const canonicalJson = canonicalJsonStringify(payloadObj);

  const hasPassword = Boolean(opts.password && opts.password.trim().length > 0);
  if (hasPassword && (opts.password?.trim().length ?? 0) < 6) {
    throw new Error('Kapsül şifreleme parolası en az 6 karakter olmalıdır.');
  }

  let storedPayloadText = canonicalJson;
  let encMeta: { salt: string; iv: string } | null = null;

  if (hasPassword && opts.password) {
    const enc = await encryptPayloadString(canonicalJson, opts.password);
    storedPayloadText = enc.ciphertext;
    encMeta = { salt: enc.salt, iv: enc.iv };
  }

  const rawHashHex = await sha256Hex(storedPayloadText);
  const fingerprint = formatCapsuleFingerprint(rawHashHex);

  const meta: CapsuleMeta = {
    format: 'tertip-capsule',
    version: 1,
    createdAt,
    workspaceName: state.workspaceName,
    sector: state.sector,
    sections: [...opts.sections],
    anonymized: opts.anonymizeKvkk,
    auditorName: opts.auditorName?.trim() || undefined,
    note: opts.note?.trim() || undefined,
    encrypted: hasPassword,
    sha256: rawHashHex,
    fingerprint,
    ...(encMeta
      ? {
          kdf: 'PBKDF2-SHA256' as const,
          iterations: PBKDF2_ITERATIONS,
          cipher: 'AES-GCM-256' as const,
          salt: encMeta.salt,
          iv: encMeta.iv,
        }
      : {}),
  };

  // storedPayloadText is already HTML-safe (escaped in canonicalJsonStringify or base64 ciphertext)
  // and embedded verbatim so the SHA-256 seal always matches the exact script payload text.
  const html = `<!doctype html>
<html lang="tr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline';" />
  <title>Tertip Denetçi Kapsülü — ${escapeHtml(state.workspaceName)}</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; padding: 24px 14px; background: #F5EFE3; color: #1F2414; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.55; }
    .wrap { max-width: 880px; margin: 0 auto; background: #FCF9F2; border: 1px solid #D8C9A8; border-radius: 18px; padding: 28px; box-shadow: 0 14px 36px rgba(31,36,20,0.07); }
    .eyebrow { font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase; color: #4F5B2A; font-weight: 700; }
    h1 { margin: 6px 0 4px; font-size: 23px; }
    .muted { color: #62694F; font-size: 13px; }
    .seal { margin: 18px 0; padding: 16px 18px; border-radius: 14px; border: 1px solid #D8C9A8; background: #F8F3E8; }
    .seal.ok { border-color: #4F5B2A; background: #EEF3E2; }
    .seal.bad { border-color: #A94438; background: #FCE8E6; }
    .seal-title { font-weight: 800; font-size: 15px; margin-bottom: 6px; }
    .fp { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 15px; font-weight: 700; letter-spacing: 0.06em; padding: 8px 12px; background: #FCF9F2; border: 1px solid #D8C9A8; border-radius: 8px; display: inline-block; word-break: break-all; margin: 6px 0; }
    .honesty { margin-top: 10px; font-size: 12px; color: #62694F; background: #FCF9F2; border-left: 3px solid #B8892D; padding: 8px 12px; border-radius: 6px; }
    .unlock-box { margin: 18px 0; padding: 18px; border-radius: 12px; border: 1px solid #D8C9A8; background: #F8F3E8; }
    .unlock-row { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 10px; }
    input[type="password"] { flex: 1; min-width: 200px; padding: 10px 12px; border-radius: 10px; border: 1px solid #D8C9A8; font-size: 14px; }
    button { padding: 10px 18px; border-radius: 10px; border: none; background: #4F5B2A; color: #FCF9F2; font-weight: 700; cursor: pointer; }
    .sec { margin-top: 22px; padding-top: 16px; border-top: 1px solid #EDE4D2; }
    .sec h2 { margin: 0 0 10px; font-size: 16px; color: #4F5B2A; }
    .kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(165px, 1fr)); gap: 10px; }
    .kpi { background: #F8F3E8; border: 1px solid #D8C9A8; border-radius: 10px; padding: 12px; }
    .kpi-l { font-size: 11.5px; color: #62694F; }
    .kpi-v { font-size: 18px; font-weight: 700; margin-top: 3px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th, td { text-align: left; padding: 8px 10px; border-bottom: 1px solid #EDE4D2; }
    th { background: #F8F3E8; color: #62694F; }
    .err { color: #A94438; font-weight: 700; font-size: 13px; margin-top: 8px; }
    .footer { margin-top: 24px; padding-top: 12px; border-top: 1px solid #D8C9A8; font-size: 11.5px; color: #62694F; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="eyebrow">TERTİP · MÜHÜRLÜ DENETÇİ KAPSÜLÜ (SALT OKUNUR)</div>
    <h1>${escapeHtml(state.workspaceName)}</h1>
    <div class="muted">${escapeHtml(state.sector)} · Oluşturulma: ${escapeHtml(new Date(createdAt).toLocaleString('tr-TR'))}${
      opts.auditorName ? ` · Denetçi: ${escapeHtml(opts.auditorName)}` : ''
    }${opts.anonymizeKvkk ? ' · KVKK Maskeli' : ''}</div>
    ${opts.note ? `<p class="muted" style="margin-top:8px;"><strong>Not:</strong> ${escapeHtml(opts.note)}</p>` : ''}

    <div id="sealBox" class="seal">
      <div id="sealTitle" class="seal-title">Mühür doğrulanıyor...</div>
      <div class="muted">SHA-256 Parmak İzi:</div>
      <div id="fpDisplay" class="fp">${escapeHtml(fingerprint)}</div>
      <div class="honesty">${escapeHtml(CAPSULE_HONESTY_NOTE)}</div>
    </div>

    <div id="unlockBox" class="unlock-box" style="display:none;">
      <strong>Bu kapsül AES-GCM-256 ile şifrelenmiştir.</strong>
      <div class="muted">İçeriği görüntülemek için göndericinin ilettiği parolayı girin.</div>
      <div class="unlock-row">
        <input id="pwdInput" type="password" placeholder="Kapsül parolası..." />
        <button id="unlockBtn" type="button">Kapsülü Aç</button>
      </div>
      <div id="unlockErr" class="err"></div>
    </div>

    <div id="contentRoot"></div>

    <div class="footer">
      Tertip · %100 Yerel, Sunucusuz Salt Okunur Denetçi Kapsülü · Dış ağ bağlantısı kullanmaz.
    </div>
  </div>

  <script id="tertip-capsule-meta" type="application/json">${safeJsonForScript(meta)}</script>
  <script id="tertip-capsule-payload" type="text/plain">${storedPayloadText}</script>

  <script>
    (function() {
      var metaEl = document.getElementById('tertip-capsule-meta');
      var payloadEl = document.getElementById('tertip-capsule-payload');
      var sealBox = document.getElementById('sealBox');
      var sealTitle = document.getElementById('sealTitle');
      var unlockBox = document.getElementById('unlockBox');
      var contentRoot = document.getElementById('contentRoot');

      function toHex(buf) {
        var bytes = new Uint8Array(buf);
        var out = '';
        for (var i = 0; i < bytes.length; i++) {
          out += bytes[i].toString(16).padStart(2, '0');
        }
        return out.toUpperCase();
      }

      function b64ToBytes(b64) {
        var bin = atob(b64);
        var arr = new Uint8Array(bin.length);
        for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
        return arr;
      }

      function el(tag, text, cls) {
        var node = document.createElement(tag);
        if (cls) node.className = cls;
        if (text !== undefined && text !== null) node.textContent = String(text);
        return node;
      }

      function fmtNum(v) {
        return typeof v === 'number' ? new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 1 }).format(v) : String(v || '-');
      }

      function renderPayload(data) {
        contentRoot.textContent = '';

        if (data.kpis) {
          var sec = el('div', null, 'sec');
          sec.appendChild(el('h2', 'Özet Göstergeler (KPI)'));
          var grid = el('div', null, 'kpis');
          var items = [
            ['Toplam Gelir', fmtNum(data.kpis.totalRevenue) + ' TL'],
            ['Toplam Gider', fmtNum(data.kpis.totalCost) + ' TL'],
            ['Net Kâr', fmtNum(data.kpis.totalProfit) + ' TL'],
            ['Ortalama Marj', '%' + fmtNum(data.kpis.avgMargin)]
          ];
          items.forEach(function(it) {
            var k = el('div', null, 'kpi');
            k.appendChild(el('div', it[0], 'kpi-l'));
            k.appendChild(el('div', it[1], 'kpi-v'));
            grid.appendChild(k);
          });
          sec.appendChild(grid);
          contentRoot.appendChild(sec);
        }

        if (data.delta && !data.delta.insufficientData) {
          var dSec = el('div', null, 'sec');
          dSec.appendChild(el('h2', 'Dönem Fark Hikâyesi (' + data.delta.previousPeriod + ' → ' + data.delta.currentPeriod + ')'));
          (data.delta.story || []).forEach(function(line) {
            dSec.appendChild(el('p', line));
          });
          contentRoot.appendChild(dSec);
        }

        if (Array.isArray(data.chartSeries) && data.chartSeries.length > 0) {
          var cSec = el('div', null, 'sec');
          cSec.appendChild(el('h2', 'Dönemsel Seri (' + data.chartSeries.length + ' Dönem)'));
          var tbl = el('table');
          var thead = el('thead');
          var hr = el('tr');
          ['Dönem', 'Hacim', 'Gelir (TL)', 'Gider (TL)', 'Net Kâr (TL)', 'Marj (%)'].forEach(function(h) { hr.appendChild(el('th', h)); });
          thead.appendChild(hr);
          tbl.appendChild(thead);
          var tbody = el('tbody');
          data.chartSeries.forEach(function(pt) {
            var tr = el('tr');
            [pt.period, fmtNum(pt.patients), fmtNum(pt.revenue), fmtNum(pt.cost), fmtNum(pt.profit), '%' + fmtNum(pt.margin)].forEach(function(c) {
              tr.appendChild(el('td', c));
            });
            tbody.appendChild(tr);
          });
          tbl.appendChild(tbody);
          cSec.appendChild(tbl);
          contentRoot.appendChild(cSec);
        }

        if (Array.isArray(data.reminders) && data.reminders.length > 0) {
          var rSec = el('div', null, 'sec');
          rSec.appendChild(el('h2', 'Hatırlatıcılar ve Süreçler (' + data.reminders.length + ')'));
          var rtbl = el('table');
          var rtbody = el('tbody');
          data.reminders.forEach(function(r) {
            var tr = el('tr');
            tr.appendChild(el('td', r.title));
            tr.appendChild(el('td', r.dueDate));
            tr.appendChild(el('td', r.completed ? 'Tamamlandı' : 'Açık'));
            rtbody.appendChild(tr);
          });
          rtbl.appendChild(rtbody);
          rSec.appendChild(rtbl);
          contentRoot.appendChild(rSec);
        }

        if (Array.isArray(data.assets) && data.assets.length > 0) {
          var aSec = el('div', null, 'sec');
          aSec.appendChild(el('h2', 'Varlıklar ve Tesisler (' + data.assets.length + ')'));
          var atbl = el('table');
          var atbody = el('tbody');
          data.assets.forEach(function(a) {
            var tr = el('tr');
            tr.appendChild(el('td', a.name));
            tr.appendChild(el('td', a.department));
            tr.appendChild(el('td', a.status));
            tr.appendChild(el('td', a.nextMaintenanceDate || '-'));
            atbody.appendChild(tr);
          });
          atbl.appendChild(atbody);
          aSec.appendChild(atbl);
          contentRoot.appendChild(aSec);
        }

        if (Array.isArray(data.documents) && data.documents.length > 0) {
          var docSec = el('div', null, 'sec');
          docSec.appendChild(el('h2', 'Belgeler (' + data.documents.length + ')'));
          data.documents.forEach(function(d) {
            var box = el('div', null, 'kpi');
            box.style.marginBottom = '10px';
            box.appendChild(el('strong', d.name + ' (' + d.category + ')'));
            box.appendChild(el('div', d.summary, 'muted'));
            docSec.appendChild(box);
          });
          contentRoot.appendChild(docSec);
        }

        if (data.audit) {
          var auSec = el('div', null, 'sec');
          auSec.appendChild(el('h2', 'Denetim Hazırlığı ve Çapraz Kontrol'));
          auSec.appendChild(el('p', 'Denetime Hazırlık Skoru: %' + (data.audit.readiness ? data.audit.readiness.score : 0) + ' · Bulgu Sayısı: ' + (data.audit.crossDoc && data.audit.crossDoc.findings ? data.audit.crossDoc.findings.length : 0)));
          contentRoot.appendChild(auSec);
        }
      }

      async function verifyAndInit() {
        try {
          var meta = JSON.parse(metaEl.textContent || '{}');
          var rawPayload = payloadEl.textContent || '';
          var digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(rawPayload));
          var computedHex = toHex(digest);

          if (computedHex === meta.sha256) {
            sealBox.classList.add('ok');
            sealTitle.textContent = 'Mühür geçerli — İçerik bütünlüğü doğrulandı';
          } else {
            sealBox.classList.add('bad');
            sealTitle.textContent = 'Mühür bozuk: içerik değiştirilmiş!';
          }

          if (meta.encrypted) {
            unlockBox.style.display = 'block';
            document.getElementById('unlockBtn').addEventListener('click', async function() {
              var pwd = document.getElementById('pwdInput').value;
              var errEl = document.getElementById('unlockErr');
              errEl.textContent = '';
              try {
                var km = await crypto.subtle.importKey('raw', new TextEncoder().encode(pwd), { name: 'PBKDF2' }, false, ['deriveKey']);
                var key = await crypto.subtle.deriveKey(
                  { name: 'PBKDF2', salt: b64ToBytes(meta.salt), iterations: meta.iterations || 250000, hash: 'SHA-256' },
                  km,
                  { name: 'AES-GCM', length: 256 },
                  false,
                  ['decrypt']
                );
                var dec = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64ToBytes(meta.iv) }, key, b64ToBytes(rawPayload));
                var parsed = JSON.parse(new TextDecoder().decode(dec));
                unlockBox.style.display = 'none';
                renderPayload(parsed);
              } catch (e) {
                errEl.textContent = 'Parola hatalı veya şifreli veri bozulmuş.';
              }
            });
          } else {
            var parsed = JSON.parse(rawPayload);
            renderPayload(parsed);
          }
        } catch (err) {
          sealBox.classList.add('bad');
          sealTitle.textContent = 'Mühür bozuk: kapsül yapısı okunamadı';
        }
      }

      verifyAndInit();
    })();
  </script>
</body>
</html>`;

  return {
    html,
    fingerprint,
    rawHashHex,
    createdAt,
    sections: [...opts.sections],
    encrypted: hasPassword,
  };
}

export function downloadAuditorCapsule(
  capsule: AuditorCapsuleResult,
  workspaceName?: string
): void {
  const blob = new Blob([capsule.html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const slug = (workspaceName ?? 'tertip')
    .toLocaleLowerCase('tr-TR')
    .replace(/[^a-z0-9ğüşıöç]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32);
  const stamp = capsule.createdAt.slice(0, 10);

  try {
    const a = document.createElement('a');
    a.href = url;
    a.download = `tertip-denetci-kapsulu-${slug || 'rapor'}-${stamp}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

function extractScriptTagContent(html: string, id: string): string | null {
  const regex = new RegExp(
    `<script[^>]*id=["']${id}["'][^>]*>([\\s\\S]*?)<\\/script>`,
    'i'
  );
  const match = regex.exec(html);
  return match ? match[1] : null;
}

export async function verifyAuditorCapsule(
  file: File,
  expectedFingerprint?: string
): Promise<CapsuleVerificationResult> {
  try {
    const html = await file.text();
    const metaRaw = extractScriptTagContent(html, 'tertip-capsule-meta');
    const payloadRaw = extractScriptTagContent(html, 'tertip-capsule-payload');

    if (!metaRaw || payloadRaw === null) {
      return {
        valid: false,
        fingerprint: '',
        sections: [],
        encrypted: false,
        error: 'Dosya geçerli bir Tertip Denetçi Kapsülü değil.',
      };
    }

    const meta = JSON.parse(metaRaw) as Partial<CapsuleMeta>;
    if (meta.format !== 'tertip-capsule' || meta.version !== 1 || typeof meta.sha256 !== 'string') {
      return {
        valid: false,
        fingerprint: '',
        sections: [],
        encrypted: false,
        error: 'Kapsül üst verisi geçersiz veya desteklenmeyen sürüm.',
      };
    }

    const computedHex = await sha256Hex(payloadRaw);
    const computedFingerprint = formatCapsuleFingerprint(computedHex);
    const sealMatches = computedHex === meta.sha256;

    let matchesExpected: boolean | undefined;
    if (expectedFingerprint && expectedFingerprint.trim().length > 0) {
      const normExpected = expectedFingerprint.replace(/[^0-9A-Fa-f]/g, '').toUpperCase();
      const normComputedFull = computedHex.toUpperCase();
      const normComputedShort = computedFingerprint.replace(/[^0-9A-Fa-f]/g, '').toUpperCase();
      matchesExpected =
        normExpected.length >= 8 &&
        (normComputedFull.startsWith(normExpected) || normComputedShort === normExpected);
    }

    const valid = sealMatches && (matchesExpected === undefined ? true : matchesExpected);

    return {
      valid,
      fingerprint: computedFingerprint,
      matchesExpected,
      createdAt: meta.createdAt,
      sections: Array.isArray(meta.sections) ? meta.sections : [],
      encrypted: Boolean(meta.encrypted),
      error: !sealMatches
        ? 'Mühür bozuk: kapsül içeriği değiştirilmiş.'
        : matchesExpected === false
          ? 'Hesaplanan parmak izi beklenen parmak iziyle eşleşmiyor.'
          : undefined,
    };
  } catch (err) {
    return {
      valid: false,
      fingerprint: '',
      sections: [],
      encrypted: false,
      error: err instanceof Error ? err.message : 'Kapsül doğrulanırken hata oluştu.',
    };
  }
}
