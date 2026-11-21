export interface OcrParseResult {
  rawText: string;
  confidence: number;
  summary: string;
}

export type OcrProgressCallback = (progress: number, status: string) => void;

const STATUS_TR_MAP: Record<string, string> = {
  'loading tesseract core': 'OCR motoru yükleniyor...',
  'initializing tesseract': 'OCR hazırlanıyor...',
  'loading language traineddata': 'Türkçe/İngilizce dil modeli yükleniyor...',
  'initializing api': 'OCR başlatılıyor...',
  'recognizing text': 'Görseldeki metin okunuyor...',
};

function translateOcrStatus(status: string): string {
  const lower = status.toLowerCase();
  return STATUS_TR_MAP[lower] ?? 'Görsel işleniyor...';
}

export async function parseImageWithOcr(
  file: File,
  onProgress?: OcrProgressCallback
): Promise<OcrParseResult> {
  onProgress?.(5, 'OCR motoru başlatılıyor...');

  let worker: Awaited<ReturnType<(typeof import('tesseract.js'))['createWorker']>> | null =
    null;

  try {
    const { createWorker } = await import('tesseract.js');

    worker = await createWorker('tur+eng', 1, {
      logger: (message) => {
        const pct = Math.min(99, Math.max(5, Math.round((message.progress ?? 0) * 100)));
        onProgress?.(pct, translateOcrStatus(message.status ?? ''));
      },
    });

    const result = await worker.recognize(file);
    const rawText = (result.data.text ?? '').trim();
    const confidence = Math.round(result.data.confidence ?? 0);

    onProgress?.(100, 'OCR tamamlandı.');

    const lineCount = rawText
      .split(/\r?\n/)
      .filter((line) => line.trim().length > 0).length;

    const summary =
      rawText.length === 0
        ? 'Görselde okunabilir metin tespit edilemedi.'
        : `Görselden OCR ile ${lineCount} satır metin çıkarıldı (güven: %${confidence}).`;

    return {
      rawText,
      confidence,
      summary,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Bilinmeyen OCR hatası';
    throw new Error(
      `Görsel OCR işlemi başarısız oldu (${file.name}): ${msg}. Dil modeli ilk kullanımda indirilirken ağ erişimi gerekebilir.`
    );
  } finally {
    if (worker) {
      try {
        await worker.terminate();
      } catch {
        // Ignore cleanup errors
      }
    }
  }
}
