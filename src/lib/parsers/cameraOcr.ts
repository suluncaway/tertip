import { parseLocalizedNumber } from './extractor';

export interface TurkishInvoiceSutFields {
  vknList: string[];
  tcknList: string[];
  kdvRates: string[];
  kdvAmounts: number[];
  matrah: number | null;
  totalAmount: number | null;
  sutCodes: string[];
  invoiceNo: string | null;
  invoiceDate: string | null;
  hasStructuredData: boolean;
}

function isValidTckn(digits: string): boolean {
  if (!/^[1-9]\d{10}$/.test(digits)) return false;
  const d = digits.split('').map(Number);
  const oddSum = d[0] + d[2] + d[4] + d[6] + d[8];
  const evenSum = d[1] + d[3] + d[5] + d[7];
  const digit10 = ((oddSum * 7 - evenSum) % 10 + 10) % 10;
  const digit11 = (d.slice(0, 10).reduce((a, b) => a + b, 0)) % 10;
  return d[9] === digit10 && d[10] === digit11;
}

function loadImageElement(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Görsel yüklenemedi.'));
    };
    img.src = url;
  });
}

/**
 * Enhances a mobile camera photo for cleaner OCR:
 * 1) Caps oversized dimensions to max 2200px width
 * 2) Converts to luminance grayscale
 * 3) Applies adaptive 5th-95th percentile contrast stretch
 * 4) Applies a 3x3 sharpening convolution kernel
 */
export async function enhanceDocumentImage(file: File): Promise<File> {
  if (typeof document === 'undefined') return file;

  try {
    const img = await loadImageElement(file);
    const maxDim = 2200;
    const scale = Math.min(1, maxDim / Math.max(img.naturalWidth || 1, img.naturalHeight || 1));
    const width = Math.max(1, Math.round(img.naturalWidth * scale));
    const height = Math.max(1, Math.round(img.naturalHeight * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return file;

    ctx.drawImage(img, 0, 0, width, height);
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    const pixelCount = width * height;
    const gray = new Uint8ClampedArray(pixelCount);
    const histogram = new Uint32Array(256);

    // 1. Grayscale + histogram
    for (let i = 0; i < pixelCount; i += 1) {
      const idx = i * 4;
      const lum = Math.round(
        0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2]
      );
      gray[i] = lum;
      histogram[lum] += 1;
    }

    // 2. Adaptive 5th-95th percentile contrast stretch
    const lowTarget = Math.floor(pixelCount * 0.04);
    const highTarget = Math.floor(pixelCount * 0.96);
    let acc = 0;
    let minVal = 0;
    let maxVal = 255;
    for (let v = 0; v < 256; v += 1) {
      acc += histogram[v];
      if (acc >= lowTarget) {
        minVal = v;
        break;
      }
    }
    acc = 0;
    for (let v = 0; v < 256; v += 1) {
      acc += histogram[v];
      if (acc >= highTarget) {
        maxVal = v;
        break;
      }
    }

    const range = Math.max(1, maxVal - minVal);
    const stretched = new Uint8ClampedArray(pixelCount);
    for (let i = 0; i < pixelCount; i += 1) {
      const norm = ((gray[i] - minVal) * 255) / range;
      stretched[i] = norm < 0 ? 0 : norm > 255 ? 255 : Math.round(norm);
    }

    // 3. Mild 3x3 sharpening kernel: [0, -1, 0, -1, 5, -1, 0, -1, 0]
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const i = y * width + x;
        let val = stretched[i];
        if (x > 0 && x < width - 1 && y > 0 && y < height - 1) {
          val =
            stretched[i] * 5 -
            stretched[i - 1] -
            stretched[i + 1] -
            stretched[i - width] -
            stretched[i + width];
          if (val < 0) val = 0;
          if (val > 255) val = 255;
        }
        const px = i * 4;
        data[px] = val;
        data[px + 1] = val;
        data[px + 2] = val;
        data[px + 3] = 255;
      }
    }

    ctx.putImageData(imageData, 0, 0);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), 'image/png', 0.95)
    );
    if (!blob) return file;

    const baseName = file.name.replace(/\.[^.]+$/, '');
    return new File([blob], `${baseName}_ocr.png`, { type: 'image/png' });
  } catch {
    return file;
  }
}

export function extractTurkishInvoiceSutFields(rawText: string): TurkishInvoiceSutFields {
  const vknSet = new Set<string>();
  const tcknSet = new Set<string>();
  const kdvRateSet = new Set<string>();
  const kdvAmounts: number[] = [];
  const sutCodeSet = new Set<string>();

  // VKN (10 digits near VKN / Vergi No / V.D.)
  const vknLabeled = /(?:VKN|V\.K\.N\.?|Vergi\s*(?:Kimlik\s*)?No(?:\s*[:.#-])?)\s*[:.#-]?\s*(\d{10})\b/gi;
  let m: RegExpExecArray | null;
  while ((m = vknLabeled.exec(rawText)) !== null) {
    vknSet.add(m[1]);
  }

  // TCKN (11 valid Mod-11 digits)
  const tcknMatches = rawText.match(/\b[1-9]\d{10}\b/g) ?? [];
  for (const candidate of tcknMatches) {
    if (isValidTckn(candidate)) {
      tcknSet.add(candidate);
    }
  }

  // KDV rates (%1, %8, %10, %18, %20)
  const kdvRateRegex = /(?:KDV\s*(?:Oran[ıi])?\s*[:%]?\s*%?\s*(1|8|10|18|20)\b|%\s*(1|8|10|18|20)\s*KDV)/gi;
  while ((m = kdvRateRegex.exec(rawText)) !== null) {
    const rate = m[1] ?? m[2];
    if (rate) kdvRateSet.add(`%${rate}`);
  }

  // KDV amounts
  const kdvAmtRegex = /(?:Hesaplanan\s+)?KDV(?:\s+Tutar[ıi])?(?:\s*\(%\d+\))?\s*[:=]?\s*([0-9.,]+)\s*(?:TL|₺|TRY)?/gi;
  while ((m = kdvAmtRegex.exec(rawText)) !== null) {
    const num = parseLocalizedNumber(m[1]);
    if (num !== null && num > 0) {
      kdvAmounts.push(num);
    }
  }

  // Matrah / Ara Toplam
  let matrah: number | null = null;
  const matrahMatch =
    /(?:KDV\s*Matrah[ıi]|Matrah|Mal\s*Hizmet\s*Toplam\s*Tutar[ıi]|Ara\s*Toplam)\s*[:=]?\s*([0-9.,]+)\s*(?:TL|₺|TRY)?/i.exec(
      rawText
    );
  if (matrahMatch) {
    matrah = parseLocalizedNumber(matrahMatch[1]);
  }

  // Genel Toplam / Ödenecek Tutar
  let totalAmount: number | null = null;
  const totalMatch =
    /(?:Ödenecek\s*Tutar|Odenecek\s*Tutar|Genel\s*Toplam|Vergiler\s*Dahil\s*Toplam\s*Tutar|Toplam\s*Tutar)\s*[:=]?\s*([0-9.,]+)\s*(?:TL|₺|TRY)?/i.exec(
      rawText
    );
  if (totalMatch) {
    totalAmount = parseLocalizedNumber(totalMatch[1]);
  }

  // 6-digit SUT procedure codes (e.g. 510.010, 520030, P612340, SUT 552003)
  const sutRegex =
    /(?:SUT(?:\s*Kodu)?\s*[:#-]?\s*([P]?\d{3}\.?\d{3})|\b([P]?[5-9]\d{2}\.\d{3})\b|\b(P[5-9]\d{5})\b)/gi;
  while ((m = sutRegex.exec(rawText)) !== null) {
    const code = (m[1] ?? m[2] ?? m[3] ?? '').replace('.', '').toUpperCase();
    if (code.length >= 6) {
      sutCodeSet.add(code);
    }
  }

  // Invoice number (e.g., GIB2026000012345 or Fatura No: ABC2026...)
  let invoiceNo: string | null = null;
  const invMatch =
    /(?:Fatura\s*No|Belge\s*No|ETTN)\s*[:#-]?\s*([A-Z0-9-]{6,24})/i.exec(rawText);
  if (invMatch) {
    invoiceNo = invMatch[1].trim();
  }

  // Invoice date
  let invoiceDate: string | null = null;
  const dateMatch =
    /(?:Fatura\s*Tarihi|Tarih)\s*[:#-]?\s*(\d{1,2}[./-]\d{1,2}[./-]20\d{2}|20\d{2}[./-]\d{1,2}[./-]\d{1,2})/i.exec(
      rawText
    );
  if (dateMatch) {
    invoiceDate = dateMatch[1].trim();
  }

  const vknList = Array.from(vknSet);
  const tcknList = Array.from(tcknSet);
  const kdvRates = Array.from(kdvRateSet);
  const sutCodes = Array.from(sutCodeSet);

  const hasStructuredData = Boolean(
    vknList.length > 0 ||
      tcknList.length > 0 ||
      kdvRates.length > 0 ||
      kdvAmounts.length > 0 ||
      matrah !== null ||
      totalAmount !== null ||
      sutCodes.length > 0 ||
      invoiceNo !== null
  );

  return {
    vknList,
    tcknList,
    kdvRates,
    kdvAmounts,
    matrah,
    totalAmount,
    sutCodes,
    invoiceNo,
    invoiceDate,
    hasStructuredData,
  };
}
