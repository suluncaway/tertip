import type { ParsedTable, WorkspaceState } from '../../types';

export type PiiKind = 'tckn' | 'vkn' | 'iban' | 'phone' | 'email' | 'name';

export interface PiiFinding {
  kind: PiiKind;
  label: string;
  maskedSample: string;
  count: number;
  locations: string[];
}

export interface KvkkScanResult {
  totalMatches: number;
  findings: PiiFinding[];
  isClean: boolean;
}

function isValidTckn(digits: string): boolean {
  if (!/^[1-9]\d{10}$/.test(digits)) return false;
  const d = digits.split('').map(Number);
  const oddSum = d[0] + d[2] + d[4] + d[6] + d[8];
  const evenSum = d[1] + d[3] + d[5] + d[7];
  const digit10 = (((oddSum * 7 - evenSum) % 10) + 10) % 10;
  const digit11 = d.slice(0, 10).reduce((a, b) => a + b, 0) % 10;
  return d[9] === digit10 && d[10] === digit11;
}

function maskTckn(val: string): string {
  return `${val.slice(0, 3)}****${val.slice(-4)}`;
}

function maskVkn(val: string): string {
  return `${val.slice(0, 3)}***${val.slice(-4)}`;
}

function maskIban(raw: string): string {
  const compact = raw.replace(/\s+/g, '').toUpperCase();
  return `TR** **** **** **** **** ${compact.slice(-4)}`;
}

function maskPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  const last2 = digits.slice(-2);
  return `05** *** ** ${last2}`;
}

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return '***@***';
  const prefix = local.slice(0, 1) || '*';
  return `${prefix}***@${domain}`;
}

const IBAN_REGEX = /\bTR\d{2}(?:\s?\d{4}){5}\s?\d{2}\b/gi;
const PHONE_REGEX = /(?:\+90|0)\s*5\d{2}[\s.-]?\d{3}[\s.-]?\d{2}[\s.-]?\d{2}\b/g;
const EMAIL_REGEX = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
const VKN_LABELED_REGEX = /(\b(?:VKN|V\.K\.N\.?|Vergi\s*(?:Kimlik\s*)?No)\s*[:.#-]?\s*)(\d{10})\b/gi;
const TCKN_CANDIDATE_REGEX = /\b[1-9]\d{10}\b/g;
const NAMED_PERSON_REGEX =
  /((?:Hasta|Ad\s*Soyad|Adı\s*Soyadı|Yetkili|Sorumlu|İlgili\s*Kişi)\s*[:\-]\s*)([A-ZÇĞİÖŞÜ][a-zçğıöşü]+(?:\s+[A-ZÇĞİÖŞÜ][a-zçğıöşü]+){1,2})/g;

export function anonymizeText(text: string, personCounter?: { value: number }): string {
  if (!text) return text;
  const counter = personCounter ?? { value: 0 };
  let out = text;

  // 1. TR IBAN
  out = out.replace(IBAN_REGEX, (match) => maskIban(match));

  // 2. Valid Mod-11 TCKN
  out = out.replace(TCKN_CANDIDATE_REGEX, (match) =>
    isValidTckn(match) ? maskTckn(match) : match
  );

  // 3. Labeled VKN
  out = out.replace(VKN_LABELED_REGEX, (_full, prefix: string, digits: string) => {
    return `${prefix}${maskVkn(digits)}`;
  });

  // 4. TR Mobile Phone
  out = out.replace(PHONE_REGEX, (match) => maskPhone(match));

  // 5. Email
  out = out.replace(EMAIL_REGEX, (match) => maskEmail(match));

  // 6. Labeled Person Names (Hasta:, Ad Soyad:, Yetkili:)
  out = out.replace(NAMED_PERSON_REGEX, (_full, prefix: string) => {
    counter.value += 1;
    const tag = String(counter.value).padStart(2, '0');
    return `${prefix}Kişi #${tag}`;
  });

  return out;
}

export function scanWorkspacePii(state: WorkspaceState): KvkkScanResult {
  const buckets = new Map<
    PiiKind,
    { label: string; count: number; maskedSample: string; locations: Set<string> }
  >();

  const record = (kind: PiiKind, label: string, maskedSample: string, location: string) => {
    const existing = buckets.get(kind);
    if (existing) {
      existing.count += 1;
      existing.locations.add(location);
    } else {
      buckets.set(kind, {
        label,
        count: 1,
        maskedSample,
        locations: new Set([location]),
      });
    }
  };

  const scanString = (text: string, location: string) => {
    if (!text) return;

    const ibans = text.match(IBAN_REGEX) ?? [];
    for (const ib of ibans) record('iban', 'TR IBAN', maskIban(ib), location);

    const tckns = text.match(TCKN_CANDIDATE_REGEX) ?? [];
    for (const tc of tckns) {
      if (isValidTckn(tc)) record('tckn', 'T.C. Kimlik No (Mod-11)', maskTckn(tc), location);
    }

    let m: RegExpExecArray | null;
    const vknRe = new RegExp(VKN_LABELED_REGEX.source, 'gi');
    while ((m = vknRe.exec(text)) !== null) {
      record('vkn', 'Vergi Kimlik No (VKN)', maskVkn(m[2]), location);
    }

    const phones = text.match(PHONE_REGEX) ?? [];
    for (const ph of phones) record('phone', 'Telefon Numarası', maskPhone(ph), location);

    const emails = text.match(EMAIL_REGEX) ?? [];
    for (const em of emails) record('email', 'E-posta Adresi', maskEmail(em), location);

    const nameRe = new RegExp(NAMED_PERSON_REGEX.source, 'g');
    let nameIdx = 0;
    while (nameRe.exec(text) !== null) {
      nameIdx += 1;
      record('name', 'Kişi / Hasta Adı', `Kişi #${String(nameIdx).padStart(2, '0')}`, location);
    }
  };

  for (const doc of state.documents) {
    scanString(doc.rawText, doc.name);
    scanString(doc.summary, doc.name);
    for (const table of doc.tables) {
      for (const row of table.rows) {
        for (const val of Object.values(row)) {
          if (typeof val === 'string') {
            scanString(val, `${doc.name} (${table.name})`);
          }
        }
      }
    }
  }

  for (const asset of state.assets) {
    if (asset.notes) scanString(asset.notes, `Varlık: ${asset.name}`);
  }
  for (const rem of state.reminders) {
    scanString(rem.title, `Hatırlatıcı`);
    if (rem.notes) scanString(rem.notes, `Hatırlatıcı`);
  }

  const findings: PiiFinding[] = Array.from(buckets.entries()).map(([kind, data]) => ({
    kind,
    label: data.label,
    maskedSample: data.maskedSample,
    count: data.count,
    locations: Array.from(data.locations).slice(0, 5),
  }));

  const totalMatches = findings.reduce((sum, f) => sum + f.count, 0);

  return {
    totalMatches,
    findings,
    isClean: totalMatches === 0,
  };
}

function anonymizeTable(table: ParsedTable, counter: { value: number }): ParsedTable {
  return {
    name: table.name,
    headers: [...table.headers],
    rows: table.rows.map((row) => {
      const next: Record<string, string | number | null> = {};
      for (const [k, v] of Object.entries(row)) {
        next[k] = typeof v === 'string' ? anonymizeText(v, counter) : v;
      }
      return next;
    }),
  };
}

export function anonymizeWorkspace(state: WorkspaceState): WorkspaceState {
  const counter = { value: 0 };

  return {
    workspaceName: state.workspaceName,
    sector: state.sector,
    chartSeries: state.chartSeries.map((pt) => ({ ...pt })),
    metrics: state.metrics.map((m) => ({ ...m })),
    documents: state.documents.map((doc) => ({
      ...doc,
      rawText: anonymizeText(doc.rawText, counter),
      summary: anonymizeText(doc.summary, counter),
      tables: doc.tables.map((t) => anonymizeTable(t, counter)),
    })),
    assets: state.assets.map((a) => ({
      ...a,
      notes: a.notes ? anonymizeText(a.notes, counter) : undefined,
      linkedDocIds: [...a.linkedDocIds],
    })),
    reminders: state.reminders.map((r) => ({
      ...r,
      title: anonymizeText(r.title, counter),
      notes: r.notes ? anonymizeText(r.notes, counter) : undefined,
    })),
  };
}
