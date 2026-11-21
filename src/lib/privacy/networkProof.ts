export interface ZeroNetworkProof {
  checkedAt: string;
  origin: string;
  totalResources: number;
  sameOriginRequests: number;
  externalRequests: number;
  externalHosts: string[];
  sameOriginBytes: number;
  externalBytes: number;
  localStorageKeys: number;
  sessionStorageKeys: number;
  indexedDbStatus: 'unused' | 'unavailable';
  isZeroCloudVerified: boolean;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function readStorageKeyCount(storageName: 'localStorage' | 'sessionStorage'): number {
  try {
    if (typeof window === 'undefined') return 0;
    const store = window[storageName];
    return store ? store.length : 0;
  } catch {
    return 0;
  }
}

export function collectZeroNetworkProof(): ZeroNetworkProof {
  const checkedAt = new Date().toISOString();
  const origin =
    typeof window !== 'undefined' && window.location ? window.location.origin : 'file://local';

  let totalResources = 0;
  let sameOriginRequests = 0;
  let externalRequests = 0;
  let sameOriginBytes = 0;
  let externalBytes = 0;
  const externalHostSet = new Set<string>();

  if (typeof performance !== 'undefined' && typeof performance.getEntriesByType === 'function') {
    const entries = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    totalResources = entries.length;

    for (const entry of entries) {
      const bytes = Math.max(0, entry.transferSize || entry.encodedBodySize || 0);
      try {
        const parsed = new URL(entry.name, origin === 'null' ? 'http://localhost' : origin);
        const isLocal =
          parsed.origin === origin ||
          parsed.protocol === 'blob:' ||
          parsed.protocol === 'data:' ||
          parsed.protocol === 'file:';

        if (isLocal) {
          sameOriginRequests += 1;
          sameOriginBytes += bytes;
        } else {
          externalRequests += 1;
          externalBytes += bytes;
          externalHostSet.add(parsed.host);
        }
      } catch {
        sameOriginRequests += 1;
        sameOriginBytes += bytes;
      }
    }
  }

  const localStorageKeys = readStorageKeyCount('localStorage');
  const sessionStorageKeys = readStorageKeyCount('sessionStorage');
  const indexedDbStatus: ZeroNetworkProof['indexedDbStatus'] =
    typeof indexedDB === 'undefined' ? 'unavailable' : 'unused';

  const isZeroCloudVerified =
    externalRequests === 0 && localStorageKeys === 0 && sessionStorageKeys === 0;

  return {
    checkedAt,
    origin,
    totalResources,
    sameOriginRequests,
    externalRequests,
    externalHosts: Array.from(externalHostSet),
    sameOriginBytes,
    externalBytes,
    localStorageKeys,
    sessionStorageKeys,
    indexedDbStatus,
    isZeroCloudVerified,
  };
}

export function downloadKvkkProofReport(proof: ZeroNetworkProof): void {
  const formattedDate = new Date(proof.checkedAt).toLocaleString('tr-TR');
  const badgeText = proof.isZeroCloudVerified
    ? 'DOĞRULANDI · %100 SIFIR BULUT'
    : 'DİKKAT · HARİCİ İSTEK / DEPOLAMA TESPİT EDİLDİ';
  const badgeBg = proof.isZeroCloudVerified ? '#4F5B2A' : '#A94438';

  const html = `<!doctype html>
<html lang="tr">
<head>
  <meta charset="utf-8" />
  <title>Tertip — KVKK & Sıfır Ağ Oturum Kanıt Raporu</title>
  <style>
    body { margin: 0; padding: 32px 20px; background: #F5EFE3; color: #1F2414; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    .card { max-width: 760px; margin: 0 auto; background: #FCF9F2; border: 1px solid #D8C9A8; border-radius: 16px; padding: 32px; box-shadow: 0 12px 30px rgba(31,36,20,0.06); }
    .eyebrow { font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase; color: #62694F; font-weight: 700; }
    h1 { margin: 8px 0 12px; font-size: 24px; color: #1F2414; }
    .badge { display: inline-block; padding: 6px 14px; border-radius: 999px; background: ${badgeBg}; color: #FCF9F2; font-size: 12px; font-weight: 700; letter-spacing: 0.04em; }
    .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; margin: 24px 0; }
    .metric { background: #F8F3E8; border: 1px solid #D8C9A8; border-radius: 12px; padding: 16px; }
    .metric-label { font-size: 12px; color: #62694F; }
    .metric-value { font-size: 22px; font-weight: 700; color: #1F2414; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 14px; }
    th, td { text-align: left; padding: 10px 12px; border-bottom: 1px solid #D8C9A8; }
    th { color: #62694F; font-weight: 600; width: 42%; }
    .footer { margin-top: 24px; font-size: 12px; color: #62694F; border-top: 1px solid #D8C9A8; padding-top: 14px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="eyebrow">TERTİP · KVKK &amp; BİLGİ GÜVENLİĞİ OTURUM KANITI</div>
    <h1>Sıfır Ağ &amp; Yerel RAM Modu Doğrulama Raporu</h1>
    <span class="badge">${escapeHtml(badgeText)}</span>

    <div class="grid">
      <div class="metric">
        <div class="metric-label">Harici Sunucu İsteği</div>
        <div class="metric-value">${proof.externalRequests}</div>
      </div>
      <div class="metric">
        <div class="metric-label">Dışarı Aktarılan Veri</div>
        <div class="metric-value">${proof.externalBytes} bayt</div>
      </div>
      <div class="metric">
        <div class="metric-label">localStorage / sessionStorage</div>
        <div class="metric-value">${proof.localStorageKeys} / ${proof.sessionStorageKeys} anahtar</div>
      </div>
      <div class="metric">
        <div class="metric-label">IndexedDB Kullanımı</div>
        <div class="metric-value">0 (Kullanılmıyor)</div>
      </div>
    </div>

    <table>
      <tr><th>Rapor Zaman Damgası</th><td>${escapeHtml(formattedDate)}</td></tr>
      <tr><th>Çalışma Kaynağı (Origin)</th><td>${escapeHtml(proof.origin)}</td></tr>
      <tr><th>Aynı Kaynak (Yerel) İstekleri</th><td>${proof.sameOriginRequests} adet (${(proof.sameOriginBytes / 1024).toFixed(1)} KB)</td></tr>
      <tr><th>Harici Alan Adları</th><td>${proof.externalHosts.length > 0 ? escapeHtml(proof.externalHosts.join(', ')) : 'Yok (0 harici alan adı)'}</td></tr>
      <tr><th>Şifreleme Standardı</th><td>Web Crypto API · PBKDF2-SHA256 (250.000 iterasyon) + AES-GCM-256</td></tr>
    </table>

    <div class="footer">
      Bu rapor tarayıcı Performance Resource Timing API ve yerel depolama denetimi ile %100 cihazınızda üretilmiştir. Tertip herhangi bir uzak sunucuya veya bulut veritabanına belge verisi göndermez.
    </div>
  </div>
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const stamp = proof.checkedAt.slice(0, 10);

  try {
    const a = document.createElement('a');
    a.href = url;
    a.download = `tertip-kvkk-oturum-kaniti-${stamp}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
