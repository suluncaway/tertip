import type {
  AssetItem,
  ChartSeriesPoint,
  ExtractedMetric,
  ParsedTable,
  ReminderItem,
  TertipDocument,
} from '../../types';
import { extractIntelligenceFromDocument } from '../parsers/extractor';

export type FormFieldType = 'text' | 'number' | 'date' | 'select' | 'textarea' | 'checkbox';

export interface FormField {
  key: string;
  label: string;
  type: FormFieldType;
  required?: boolean;
  options?: string[];
  placeholder?: string;
}

export interface FormTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  fields: FormField[];
}

export interface CollectionFormOptions {
  workspaceName: string;
  branchHint?: string;
}

export interface CollectionFormResponsePayload {
  format: 'tertip-form';
  version: 1;
  templateId: string;
  templateName?: string;
  submittedAt: string;
  branch: string;
  values: Record<string, string | number | boolean | null>;
}

export interface CollectionImportResult {
  document: TertipDocument | null;
  acceptedCount: number;
  errors: string[];
  metrics: ExtractedMetric[];
  chartSeries: ChartSeriesPoint[];
  assets: AssetItem[];
  reminders: ReminderItem[];
}

export const FORM_TEMPLATES: FormTemplate[] = [
  {
    id: 'aylik-sube-raporu',
    name: 'Aylık Şube / Birim Performans Raporu',
    category: 'Finans & Mali Analiz',
    description:
      'Şube veya birimlerden aylık işlem/hasta hacmi, gelir, gider ve operasyonel özet toplar.',
    fields: [
      { key: 'donem', label: 'Dönem', type: 'text', required: true, placeholder: 'Örn. Tem 2026' },
      { key: 'hasta', label: 'Hasta / İşlem Hacmi', type: 'number', required: true, placeholder: 'Örn. 1450' },
      { key: 'taburcu', label: 'Tamamlanan / Taburcu', type: 'number', placeholder: 'Örn. 1390' },
      { key: 'gelir', label: 'Toplam Gelir (TL)', type: 'number', required: true, placeholder: 'Örn. 4850000' },
      { key: 'gider', label: 'Toplam Gider (TL)', type: 'number', required: true, placeholder: 'Örn. 3620000' },
      { key: 'notlar', label: 'Dönem Özeti & Riskler', type: 'textarea', placeholder: 'Öne çıkan gelişmeleri yazın...' },
    ],
  },
  {
    id: 'cihaz-bakim-bildirimi',
    name: 'Cihaz Bakım & Kalibrasyon Bildirimi',
    category: 'Cihaz & Envanter',
    description:
      'Teknik ekiplerden tıbbi/endüstriyel cihaz durumu, kalibrasyon ve sonraki bakım tarihlerini toplar.',
    fields: [
      { key: 'cihaz', label: 'Cihaz / Ekipman Adı', type: 'text', required: true, placeholder: 'Örn. Siemens 1.5T MR' },
      { key: 'kod', label: 'Envanter / Seri Kodu', type: 'text', placeholder: 'Örn. BM-2026-014' },
      { key: 'bolum', label: 'Bölüm / Birim', type: 'text', required: true, placeholder: 'Örn. Radyoloji' },
      {
        key: 'durum',
        label: 'Cihaz Durumu',
        type: 'select',
        required: true,
        options: ['Aktif', 'Bakımda', 'Dikkat'],
      },
      { key: 'sonraki_bakim', label: 'Sonraki Bakım Tarihi', type: 'date', required: true },
      { key: 'kalibrasyon_tamam', label: 'Kalibrasyon sertifikası doğrulandı', type: 'checkbox' },
      { key: 'notlar', label: 'Teknik Servis Notu', type: 'textarea', placeholder: 'Yapılan işlem veya parça değişimi...' },
    ],
  },
  {
    id: 'alan-tesis-kontrol',
    name: 'Alan / Tesis Hijyen & Güvenlik Kontrol Listesi',
    category: 'Tesis & Bakım',
    description:
      'Ameliyathane, poliklinik, mutfak, WC veya şantiye alanları için standart saha kontrol formu.',
    fields: [
      { key: 'alan', label: 'Alan / Oda Adı', type: 'text', required: true, placeholder: 'Örn. Ameliyathane 2' },
      { key: 'bolum', label: 'Birim / Kat', type: 'text', required: true, placeholder: 'Örn. B Blok 2. Kat' },
      {
        key: 'durum',
        label: 'Genel Durum',
        type: 'select',
        required: true,
        options: ['Aktif', 'Bakımda', 'Dikkat'],
      },
      { key: 'sonraki_bakim', label: 'Sonraki Kontrol / Bakım Tarihi', type: 'date', required: true },
      { key: 'hijyen_uygun', label: 'Hijyen ve İSG standartlarına tam uygun', type: 'checkbox' },
      { key: 'notlar', label: 'Tespit Edilen Eksikler / Aksiyonlar', type: 'textarea', placeholder: 'Filtre, havalandırma, batarya vb.' },
    ],
  },
  {
    id: 'gelir-gider-girisi',
    name: 'Hızlı Gelir-Gider & Fatura Girişi',
    category: 'Finans & Mali Analiz',
    description:
      'Muhasebe veya şube sorumlularından dönemsel fatura, gelir ve maliyet kalemlerini toplar.',
    fields: [
      { key: 'donem', label: 'Dönem', type: 'text', required: true, placeholder: 'Örn. Tem 2026' },
      { key: 'gelir', label: 'Gelir Tutarı (TL)', type: 'number', required: true },
      { key: 'gider', label: 'Gider Tutarı (TL)', type: 'number', required: true },
      { key: 'son_odeme', label: 'Fatura / Ödeme Son Tarihi', type: 'date' },
      { key: 'belge_no', label: 'Fatura / Belge No', type: 'text', placeholder: 'Örn. GIB20260001234' },
      { key: 'aciklama', label: 'Kalem Açıklaması', type: 'textarea', placeholder: 'Gelir veya gider kaleminin detayı...' },
    ],
  },
];

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

function renderFieldHtml(field: FormField): string {
  const reqAttr = field.required ? 'required' : '';
  const reqMark = field.required ? '<span class="req">*</span>' : '';
  const id = `f_${escapeHtml(field.key)}`;
  const name = escapeHtml(field.key);
  const label = escapeHtml(field.label);
  const ph = field.placeholder ? `placeholder="${escapeHtml(field.placeholder)}"` : '';

  if (field.type === 'checkbox') {
    return `
      <label class="check-row" for="${id}">
        <input id="${id}" name="${name}" type="checkbox" />
        <span>${label}</span>
      </label>`;
  }

  if (field.type === 'select') {
    const opts = (field.options ?? [])
      .map((o) => `<option value="${escapeHtml(o)}">${escapeHtml(o)}</option>`)
      .join('');
    return `
      <div class="field">
        <label for="${id}">${label}${reqMark}</label>
        <select id="${id}" name="${name}" ${reqAttr}>${opts}</select>
      </div>`;
  }

  if (field.type === 'textarea') {
    return `
      <div class="field">
        <label for="${id}">${label}${reqMark}</label>
        <textarea id="${id}" name="${name}" rows="3" ${ph} ${reqAttr}></textarea>
      </div>`;
  }

  const inputType = field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text';
  const stepAttr = field.type === 'number' ? 'step="any"' : '';
  return `
    <div class="field">
      <label for="${id}">${label}${reqMark}</label>
      <input id="${id}" name="${name}" type="${inputType}" ${stepAttr} ${ph} ${reqAttr} />
    </div>`;
}

export function buildCollectionFormHtml(
  template: FormTemplate,
  opts: CollectionFormOptions
): string {
  const config = {
    templateId: template.id,
    templateName: template.name,
    workspaceName: opts.workspaceName,
    fields: template.fields.map((f) => ({ key: f.key, type: f.type })),
  };

  const fieldsHtml = template.fields.map(renderFieldHtml).join('\n');
  const branchVal = escapeHtml(opts.branchHint ?? '');

  return `<!doctype html>
<html lang="tr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline';" />
  <title>Tertip Veri Formu — ${escapeHtml(template.name)}</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; padding: 24px 14px; background: #F5EFE3; color: #1F2414; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.5; }
    .card { max-width: 620px; margin: 0 auto; background: #FCF9F2; border: 1px solid #D8C9A8; border-radius: 18px; padding: 28px 24px; box-shadow: 0 12px 32px rgba(31,36,20,0.07); }
    .eyebrow { font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase; color: #4F5B2A; font-weight: 700; }
    h1 { margin: 6px 0 6px; font-size: 22px; color: #1F2414; }
    .desc { margin: 0 0 18px; font-size: 13.5px; color: #62694F; }
    .pill { display: inline-block; padding: 4px 10px; border-radius: 999px; background: #EDE4D2; color: #4F5B2A; font-size: 11.5px; font-weight: 700; margin-bottom: 16px; }
    .field { margin-bottom: 14px; }
    label { display: block; font-size: 13px; font-weight: 600; color: #1F2414; margin-bottom: 5px; }
    .req { color: #A94438; margin-left: 3px; }
    input[type="text"], input[type="number"], input[type="date"], select, textarea {
      width: 100%; padding: 10px 12px; border-radius: 10px; border: 1px solid #D8C9A8;
      background: #FFFFFF; color: #1F2414; font-size: 14px; font-family: inherit;
    }
    input:focus, select:focus, textarea:focus { outline: 2px solid #4F5B2A; outline-offset: 1px; border-color: #4F5B2A; }
    .check-row { display: flex; align-items: center; gap: 10px; padding: 10px 12px; background: #F8F3E8; border: 1px solid #D8C9A8; border-radius: 10px; margin-bottom: 14px; cursor: pointer; font-weight: 600; font-size: 13.5px; }
    .check-row input { width: 18px; height: 18px; accent-color: #4F5B2A; }
    .btn { width: 100%; margin-top: 8px; padding: 13px 18px; border: none; border-radius: 12px; background: #4F5B2A; color: #FCF9F2; font-size: 15px; font-weight: 700; cursor: pointer; }
    .btn:hover { background: #3F4921; }
    .status { display: none; margin-top: 16px; padding: 14px; border-radius: 12px; background: #EEF3E2; border: 1px solid #4F5B2A; color: #1F2414; font-size: 13.5px; }
    .status strong { color: #4F5B2A; }
    .footer { margin-top: 20px; padding-top: 14px; border-top: 1px solid #EDE4D2; font-size: 12px; color: #62694F; }
  </style>
</head>
<body>
  <div class="card">
    <div class="eyebrow">TERTİP · %100 ÇEVRİMDIŞI VERİ TOPLAMA FORMU</div>
    <h1>${escapeHtml(template.name)}</h1>
    <p class="desc">${escapeHtml(template.description)}</p>
    <div class="pill">Çalışma Alanı: ${escapeHtml(opts.workspaceName)}</div>

    <form id="tertipForm">
      <div class="field">
        <label for="f_branch">Şube / Birim / Gönderen<span class="req">*</span></label>
        <input id="f_branch" name="__branch" type="text" value="${branchVal}" placeholder="Örn. Kadıköy Şube veya Biyomedikal Birimi" required />
      </div>
      ${fieldsHtml}
      <button type="submit" class="btn">Yanıt Dosyasını Oluştur ve İndir (.tertip-form.json)</button>
    </form>

    <div id="statusBox" class="status" role="status"></div>

    <div class="footer">
      Bu form hiçbir sunucuya bağlanmaz. Gönder'e bastığınızda yanıtlarınız yalnızca cihazınıza <strong>.tertip-form.json</strong> dosyası olarak iner; bu dosyayı yöneticinize iletebilirsiniz.
    </div>
  </div>

  <script>
    (function() {
      var CFG = ${safeJsonForScript(config)};
      var form = document.getElementById('tertipForm');
      var statusBox = document.getElementById('statusBox');

      function slugify(str) {
        return String(str || 'genel')
          .toLowerCase()
          .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
          .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
          .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'genel';
      }

      form.addEventListener('submit', function(e) {
        e.preventDefault();
        var branch = (document.getElementById('f_branch').value || '').trim();
        if (!branch) return;

        var values = {};
        for (var i = 0; i < CFG.fields.length; i++) {
          var f = CFG.fields[i];
          var el = form.elements.namedItem(f.key);
          if (!el) continue;
          if (f.type === 'checkbox') {
            values[f.key] = Boolean(el.checked);
          } else if (f.type === 'number') {
            var raw = String(el.value || '').trim();
            values[f.key] = raw === '' ? null : Number(raw);
          } else {
            values[f.key] = String(el.value || '').trim();
          }
        }

        var now = new Date();
        var dateStamp = now.toISOString().slice(0, 10);
        var payload = {
          format: 'tertip-form',
          version: 1,
          templateId: CFG.templateId,
          templateName: CFG.templateName,
          submittedAt: now.toISOString(),
          branch: branch,
          values: values
        };

        var fileName = CFG.templateId + '-' + slugify(branch) + '-' + dateStamp + '.tertip-form.json';
        var blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(function() { URL.revokeObjectURL(url); }, 1000);

        statusBox.style.display = 'block';
        statusBox.textContent = 'Yanıt dosyanız indirildi: ' + fileName + ' — Bu dosyayı Tertip uygulamasındaki "Belgeler → Gelen Yanıtları İçe Aktar" alanına yükleyebilirsiniz.';
      });
    })();
  </script>
</body>
</html>`;
}

export function downloadCollectionForm(
  template: FormTemplate,
  opts: CollectionFormOptions
): void {
  const html = buildCollectionFormHtml(template, opts);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const branchSlug = opts.branchHint
    ? `-${opts.branchHint
        .toLocaleLowerCase('tr-TR')
        .replace(/[^a-z0-9ğüşıöç]+/gi, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 24)}`
    : '';
  const fileName = `tertip-form-${template.id}${branchSlug}.html`;

  try {
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

function isValidFormResponse(data: unknown): data is CollectionFormResponsePayload {
  if (typeof data !== 'object' || data === null) return false;
  const obj = data as Record<string, unknown>;
  return (
    obj.format === 'tertip-form' &&
    obj.version === 1 &&
    typeof obj.templateId === 'string' &&
    obj.templateId.trim().length > 0 &&
    typeof obj.submittedAt === 'string' &&
    typeof obj.branch === 'string' &&
    typeof obj.values === 'object' &&
    obj.values !== null &&
    !Array.isArray(obj.values)
  );
}

export async function importCollectionResponses(
  files: File[]
): Promise<CollectionImportResult> {
  const validResponses: CollectionFormResponsePayload[] = [];
  const errors: string[] = [];

  for (const file of files) {
    try {
      const text = await file.text();
      const parsed: unknown = JSON.parse(text);
      if (!isValidFormResponse(parsed)) {
        errors.push(`${file.name}: Geçerli bir Tertip form yanıt dosyası (.tertip-form.json) değil.`);
        continue;
      }
      validResponses.push(parsed);
    } catch {
      errors.push(`${file.name}: JSON okunamadı veya dosya bozuk.`);
    }
  }

  if (validResponses.length === 0) {
    return {
      document: null,
      acceptedCount: 0,
      errors,
      metrics: [],
      chartSeries: [],
      assets: [],
      reminders: [],
    };
  }

  // Resolve human-readable column headers from templates
  const keyToLabel = new Map<string, string>();
  for (const tpl of FORM_TEMPLATES) {
    for (const f of tpl.fields) {
      if (!keyToLabel.has(f.key)) {
        keyToLabel.set(f.key, f.label);
      }
    }
  }

  const orderedKeys: string[] = [];
  const seenKeySet = new Set<string>();
  for (const resp of validResponses) {
    for (const key of Object.keys(resp.values)) {
      if (!seenKeySet.has(key)) {
        seenKeySet.add(key);
        orderedKeys.push(key);
      }
    }
  }

  const headers = [
    'Şube / Birim',
    'Gönderim Tarihi',
    ...orderedKeys.map((k) => keyToLabel.get(k) ?? k),
  ];

  const rows: Record<string, string | number | null>[] = validResponses.map((resp) => {
    const row: Record<string, string | number | null> = {
      'Şube / Birim': resp.branch,
      'Gönderim Tarihi': resp.submittedAt.slice(0, 10),
    };
    for (const key of orderedKeys) {
      const label = keyToLabel.get(key) ?? key;
      const raw = resp.values[key];
      if (typeof raw === 'boolean') {
        row[label] = raw ? 'Evet' : 'Hayır';
      } else if (typeof raw === 'number' && Number.isFinite(raw)) {
        row[label] = raw;
      } else if (typeof raw === 'string' && raw.trim().length > 0) {
        row[label] = raw.trim();
      } else {
        row[label] = null;
      }
    }
    return row;
  });

  const firstTpl = FORM_TEMPLATES.find((t) => t.id === validResponses[0].templateId);
  const tableName = firstTpl ? firstTpl.name : 'Ekip Form Yanıtları';
  const table: ParsedTable = {
    name: tableName,
    headers,
    rows,
  };

  const rawTextLines = rows.map((r) =>
    headers
      .map((h) => (r[h] !== null && r[h] !== undefined ? `${h}: ${r[h]}` : null))
      .filter(Boolean)
      .join(' | ')
  );

  const docId =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? `doc_form_${crypto.randomUUID().slice(0, 8)}`
      : `doc_form_${Date.now().toString(36)}`;

  const doc: TertipDocument = {
    id: docId,
    name: `${tableName} (${validResponses.length} Yanıt).tertip-form.json`,
    kind: 'text',
    size: files.reduce((s, f) => s + f.size, 0),
    uploadedAt: new Date().toISOString(),
    category: firstTpl?.category ?? 'Genel Operasyon',
    rawText: rawTextLines.join('\n'),
    tables: [table],
    summary: `${validResponses.length} şube/ekip form yanıtı tek tabloda birleştirildi.`,
    status: 'ready',
  };

  const extracted = extractIntelligenceFromDocument(doc);
  doc.category = firstTpl?.category ?? extracted.inferredCategory;

  return {
    document: doc,
    acceptedCount: validResponses.length,
    errors,
    metrics: extracted.metrics,
    chartSeries: extracted.chartSeries,
    assets: extracted.assets,
    reminders: extracted.reminders,
  };
}
