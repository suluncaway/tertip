import type { TertipDocument } from '../../types';

export interface SemanticSearchHit {
  docId: string;
  docName: string;
  category: string;
  score: number;
  snippet: string;
  location: string;
}

interface DocumentPassage {
  docId: string;
  docName: string;
  category: string;
  location: string;
  text: string;
  tokens: string[];
  ngrams: Map<string, number>;
}

const SYNONYM_GROUPS: string[][] = [
  ['hasta', 'poliklinik', 'muayene', 'taburcu', 'klinik', 'yatak', 'servis', 'basvuru'],
  ['kar', 'gelir', 'marj', 'ciro', 'maliyet', 'gider', 'finans', 'butce', 'hasilat', 'mali'],
  ['bakim', 'kalibrasyon', 'ariza', 'cihaz', 'teknik', 'biyomedikal', 'hepa', 'jenerator', 'kontrol'],
  ['sut', 'sgk', 'medula', 'mevzuat', 'paket', 'icmal', 'uts', 'barkod'],
  ['fatura', 'kdv', 'vkn', 'tckn', 'matrah', 'odeme', 'tahsilat', 'tahakkuk'],
  ['wc', 'hijyen', 'temizlik', 'tesis', 'ameliyathane', 'havalandirma', 'musluk'],
  ['stok', 'tedarik', 'fire', 'menu', 'mutfak', 'siparis', 'restoran', 'sube'],
  ['santiye', 'hakedis', 'isg', 'beton', 'taseron', 'vinc', 'insaat', 'metraj'],
  ['eticaret', 'kargo', 'iade', 'roas', 'reklam', 'sepet', 'pazaryeri', 'depo'],
  ['toplanti', 'kurul', 'sunum', 'rapor', 'son tarih', 'teslim', 'denetim'],
];

const STOP_WORDS = new Set([
  've',
  'veya',
  'ile',
  'icin',
  'bir',
  'bu',
  'su',
  'o',
  'da',
  'de',
  'mi',
  'mu',
  'mi',
  'ne',
  'kadar',
  'nasil',
  'nedir',
  'hangi',
  'olan',
  'olarak',
  'en',
  'cok',
  'az',
  'var',
  'yok',
  'the',
  'and',
  'for',
  'with',
]);

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
    .replace(/â/g, 'a')
    .replace(/î/g, 'i')
    .replace(/û/g, 'u');
}

function tokenize(text: string): string[] {
  return normalizeTr(text)
    .split(/[^a-z0-9]+/)
    .filter((tok) => tok.length >= 2 && !STOP_WORDS.has(tok));
}

function buildCharNgrams(text: string, n = 3): Map<string, number> {
  const clean = normalizeTr(text).replace(/[^a-z0-9\s]+/g, ' ').replace(/\s+/g, ' ').trim();
  const freq = new Map<string, number>();
  if (clean.length < n) {
    if (clean.length > 0) freq.set(clean, 1);
    return freq;
  }
  for (let i = 0; i <= clean.length - n; i += 1) {
    const gram = clean.slice(i, i + n);
    freq.set(gram, (freq.get(gram) ?? 0) + 1);
  }
  return freq;
}

function cosineSimilarity(a: Map<string, number>, b: Map<string, number>): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (const [k, v] of a) {
    normA += v * v;
    const bv = b.get(k);
    if (bv !== undefined) dot += v * bv;
  }
  for (const v of b.values()) {
    normB += v * v;
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

function expandQueryTokens(tokens: string[]): { term: string; weight: number }[] {
  const weighted = new Map<string, number>();
  for (const tok of tokens) {
    weighted.set(tok, 1.0);
    for (const group of SYNONYM_GROUPS) {
      if (group.some((g) => tok.startsWith(g) || g.startsWith(tok))) {
        for (const syn of group) {
          if (!weighted.has(syn)) {
            weighted.set(syn, 0.45);
          }
        }
      }
    }
  }
  return Array.from(weighted.entries()).map(([term, weight]) => ({ term, weight }));
}

function splitDocumentIntoPassages(doc: TertipDocument): DocumentPassage[] {
  const passages: DocumentPassage[] = [];

  if (doc.rawText.trim().length > 0) {
    const sectionBlocks = doc.rawText.split(/(?=---\s*(?:Sayfa|Slayt)\s+\d+\s*---)/i);

    sectionBlocks.forEach((block, blockIdx) => {
      const trimmed = block.trim();
      if (!trimmed) return;

      const headerMatch = /^---\s*((?:Sayfa|Slayt)\s+\d+)\s*---/i.exec(trimmed);
      const location = headerMatch ? headerMatch[1] : `Bölüm ${blockIdx + 1}`;
      const cleanBody = trimmed.replace(/^---\s*(?:Sayfa|Slayt)\s+\d+\s*---\s*/i, '').trim();
      if (!cleanBody) return;

      // Chunk long blocks into ~360 char overlapping passages
      if (cleanBody.length <= 420) {
        const fullText = `${doc.name} ${doc.category} ${cleanBody}`;
        passages.push({
          docId: doc.id,
          docName: doc.name,
          category: doc.category,
          location,
          text: cleanBody,
          tokens: tokenize(fullText),
          ngrams: buildCharNgrams(fullText),
        });
      } else {
        const lines = cleanBody.split(/\r?\n/).filter((l) => l.trim().length > 0);
        let chunk = '';
        let subIdx = 1;
        for (const line of lines) {
          if ((chunk + '\n' + line).length > 360 && chunk.length > 0) {
            const fullText = `${doc.name} ${doc.category} ${chunk}`;
            passages.push({
              docId: doc.id,
              docName: doc.name,
              category: doc.category,
              location: `${location} · Parça ${subIdx++}`,
              text: chunk.trim(),
              tokens: tokenize(fullText),
              ngrams: buildCharNgrams(fullText),
            });
            chunk = line;
          } else {
            chunk = chunk ? `${chunk}\n${line}` : line;
          }
        }
        if (chunk.trim().length > 0) {
          const fullText = `${doc.name} ${doc.category} ${chunk}`;
          passages.push({
            docId: doc.id,
            docName: doc.name,
            category: doc.category,
            location: subIdx > 1 ? `${location} · Parça ${subIdx}` : location,
            text: chunk.trim(),
            tokens: tokenize(fullText),
            ngrams: buildCharNgrams(fullText),
          });
        }
      }
    });
  }

  for (const table of doc.tables) {
    const previewRows = table.rows
      .slice(0, 12)
      .map((r) => table.headers.map((h) => `${h}: ${r[h] ?? '-'}`).join(' | '))
      .join('\n');
    const text = `Tablo ${table.name} (${table.rows.length} satır)\n${previewRows}`;
    const fullText = `${doc.name} ${doc.category} ${text}`;
    passages.push({
      docId: doc.id,
      docName: doc.name,
      category: doc.category,
      location: `Tablo: ${table.name}`,
      text,
      tokens: tokenize(fullText),
      ngrams: buildCharNgrams(fullText),
    });
  }

  return passages;
}

export function semanticSearchDocuments(
  docs: TertipDocument[],
  query: string,
  topK = 6
): SemanticSearchHit[] {
  const queryTokens = tokenize(query);
  if (queryTokens.length === 0 || docs.length === 0) return [];

  const passages = docs.flatMap(splitDocumentIntoPassages);
  if (passages.length === 0) return [];

  const expandedTerms = expandQueryTokens(queryTokens);
  const queryNgrams = buildCharNgrams(
    `${query} ${expandedTerms.map((t) => t.term).join(' ')}`
  );

  // Compute document frequency & avg length for BM25
  const totalDocs = passages.length;
  const avgLen =
    passages.reduce((sum, p) => sum + p.tokens.length, 0) / Math.max(1, totalDocs);
  const k1 = 1.5;
  const b = 0.75;

  const df = new Map<string, number>();
  for (const { term } of expandedTerms) {
    let count = 0;
    for (const p of passages) {
      if (p.tokens.some((t) => t.startsWith(term) || term.startsWith(t))) {
        count += 1;
      }
    }
    df.set(term, count);
  }

  const scored: { passage: DocumentPassage; rawScore: number }[] = [];
  let maxBm25 = 0;

  const bm25Scores = passages.map((p) => {
    let score = 0;
    const dl = Math.max(1, p.tokens.length);

    for (const { term, weight } of expandedTerms) {
      let tf = 0;
      for (const tok of p.tokens) {
        if (tok === term) {
          tf += 1;
        } else if (tok.length >= 4 && term.length >= 4 && (tok.startsWith(term) || term.startsWith(tok))) {
          tf += 0.75;
        }
      }
      if (tf === 0) continue;
      const docFreq = df.get(term) ?? 0;
      const idf = Math.log(1 + (totalDocs - docFreq + 0.5) / (docFreq + 0.5));
      const num = tf * (k1 + 1);
      const den = tf + k1 * (1 - b + b * (dl / avgLen));
      score += weight * idf * (num / den);
    }

    if (score > maxBm25) maxBm25 = score;
    return score;
  });

  passages.forEach((p, i) => {
    const normBm25 = maxBm25 > 0 ? bm25Scores[i] / maxBm25 : 0;
    const vecSim = cosineSimilarity(queryNgrams, p.ngrams);
    const hybrid = normBm25 * 0.68 + vecSim * 0.32;
    if (hybrid > 0.08) {
      scored.push({ passage: p, rawScore: hybrid });
    }
  });

  scored.sort((a, b) => b.rawScore - a.rawScore);

  const topRaw = scored[0]?.rawScore ?? 1;
  return scored.slice(0, topK).map(({ passage, rawScore }) => {
    // Scale cleanly into an intuitive 35..99% relevance score
    const relative = topRaw > 0 ? rawScore / topRaw : 0;
    const absoluteBoost = Math.min(1, rawScore * 1.15);
    const pct = Math.min(99, Math.max(25, Math.round((relative * 0.55 + absoluteBoost * 0.45) * 98)));

    const snippet =
      passage.text.length > 260
        ? `${passage.text.slice(0, 257).trim()}...`
        : passage.text;

    return {
      docId: passage.docId,
      docName: passage.docName,
      category: passage.category,
      score: pct,
      snippet,
      location: passage.location,
    };
  });
}
