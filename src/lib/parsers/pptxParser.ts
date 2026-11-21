import JSZip from 'jszip';
import type { ParsedTable } from '../../types';

export interface PptxSlideContent {
  slideNumber: number;
  text: string;
}

export interface PptxParseResult {
  slides: PptxSlideContent[];
  tables: ParsedTable[];
  rawText: string;
  summary: string;
  slideCount: number;
}

function getElementsByLocalName(root: Document | Element, localName: string): Element[] {
  const all = root.getElementsByTagName('*');
  const matches: Element[] = [];
  for (let i = 0; i < all.length; i += 1) {
    const el = all[i];
    if (el.localName === localName) {
      matches.push(el);
    }
  }
  return matches;
}

function extractParagraphText(el: Element): string {
  const textNodes = getElementsByLocalName(el, 't');
  return textNodes
    .map((node) => node.textContent ?? '')
    .join('')
    .trim();
}

function extractSlideContent(
  xmlString: string,
  slideNumber: number
): { text: string; tables: ParsedTable[] } {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlString, 'application/xml');

  const paragraphs = getElementsByLocalName(doc, 'p');
  const lines: string[] = [];
  for (const p of paragraphs) {
    const text = extractParagraphText(p);
    if (text.length > 0) {
      lines.push(text);
    }
  }

  const tables: ParsedTable[] = [];
  const tblNodes = getElementsByLocalName(doc, 'tbl');

  tblNodes.forEach((tbl, tblIdx) => {
    const trNodes = getElementsByLocalName(tbl, 'tr');
    const matrix: string[][] = [];

    for (const tr of trNodes) {
      const tcNodes = getElementsByLocalName(tr, 'tc');
      const rowCells = tcNodes.map((tc) => {
        const cellPs = getElementsByLocalName(tc, 'p');
        return cellPs
          .map((p) => extractParagraphText(p))
          .filter(Boolean)
          .join(' ')
          .trim();
      });
      if (rowCells.some((c) => c.length > 0)) {
        matrix.push(rowCells);
      }
    }

    if (matrix.length >= 2) {
      const headers = matrix[0].map((h, i) => (h.length > 0 ? h : `Sütun ${i + 1}`));
      const rows: Record<string, string | number | null>[] = matrix
        .slice(1)
        .map((cells) => {
          const rec: Record<string, string | number | null> = {};
          headers.forEach((h, i) => {
            const val = cells[i] ?? '';
            rec[h] = val.length > 0 ? val : null;
          });
          return rec;
        });

      tables.push({
        name: `Slayt ${slideNumber} Tablo ${tblIdx + 1}`,
        headers,
        rows,
      });
    }
  });

  return {
    text: lines.join('\n'),
    tables,
  };
}

export async function parsePptxFile(file: File): Promise<PptxParseResult> {
  let zip: JSZip;
  try {
    const buffer = await file.arrayBuffer();
    zip = await JSZip.loadAsync(buffer);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Geçersiz PPTX arşivi';
    throw new Error(`Sunum dosyası açılamadı (${file.name}): ${msg}`);
  }

  const slideEntries: { slideNumber: number; path: string }[] = [];
  const slideRegex = /^ppt\/slides\/slide(\d+)\.xml$/i;

  zip.forEach((relativePath) => {
    const match = slideRegex.exec(relativePath);
    if (match) {
      slideEntries.push({
        slideNumber: Number.parseInt(match[1], 10),
        path: relativePath,
      });
    }
  });

  slideEntries.sort((a, b) => a.slideNumber - b.slideNumber);

  const slides: PptxSlideContent[] = [];
  const allTables: ParsedTable[] = [];

  for (const entry of slideEntries) {
    const zipObj = zip.file(entry.path);
    if (!zipObj) continue;
    const xml = await zipObj.async('string');
    const { text, tables } = extractSlideContent(xml, entry.slideNumber);

    // Optional speaker notes
    const notesPath = `ppt/notesSlides/notesSlide${entry.slideNumber}.xml`;
    const notesObj = zip.file(notesPath);
    let combinedText = text;
    if (notesObj) {
      const notesXml = await notesObj.async('string');
      const notesContent = extractSlideContent(notesXml, entry.slideNumber);
      if (notesContent.text.trim().length > 0) {
        combinedText = `${text}\n[Notlar] ${notesContent.text}`.trim();
      }
    }

    slides.push({
      slideNumber: entry.slideNumber,
      text: combinedText,
    });
    allTables.push(...tables);
  }

  const rawText = slides
    .map((s) => `--- Slayt ${s.slideNumber} ---\n${s.text}`)
    .join('\n\n')
    .trim();

  const slideCount = slides.length;
  const summary =
    slideCount === 0
      ? 'Sunumda okunabilir slayt içeriği bulunamadı.'
      : `${slideCount} slayt çözümlendi${
          allTables.length > 0 ? `, ${allTables.length} tablo çıkarıldı` : ''
        }.`;

  return {
    slides,
    tables: allTables,
    rawText,
    summary,
    slideCount,
  };
}
