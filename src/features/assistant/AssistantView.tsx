import React, { useMemo, useState } from 'react';
import {
  Bot,
  ChevronDown,
  ChevronUp,
  Cpu,
  Database,
  FileText,
  Lock,
  Send,
  Settings2,
  Sparkles,
  WifiOff,
} from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  SectionHeader,
} from '../../components/ui';
import type { AiConfig, WorkspaceState } from '../../types';

export interface AssistantViewProps {
  workspace: WorkspaceState;
  onLoadDemo: () => void;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  citations?: string[];
  modeLabel?: string;
  timestamp: string;
}

const SUGGESTED_QUESTIONS = [
  'Bu ay kaç hasta geldi?',
  'Kâr marjı nedir?',
  'Yaklaşan bakımlar neler?',
  'SUT raporları ne durumda?',
  'Dikkat gerektiren cihaz ve alanlar hangileri?',
  'Yüklenen belgelerin kısa özeti nedir?',
];

function normalizeTr(text: string): string {
  return text
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c');
}

function formatTl(n: number): string {
  return `₺${Math.round(n).toLocaleString('tr-TR')}`;
}

function renderRichText(text: string): React.ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((segment, index) => {
    if (segment.startsWith('**') && segment.endsWith('**') && segment.length > 4) {
      return (
        <strong key={index} className="font-semibold">
          {segment.slice(2, -2)}
        </strong>
      );
    }
    return <React.Fragment key={index}>{segment}</React.Fragment>;
  });
}

function buildLocalAnswer(
  question: string,
  workspace: WorkspaceState
): { text: string; citations: string[] } {
  const q = normalizeTr(question);
  const citations = new Set<string>();
  const sections: string[] = [];

  const isEmpty =
    workspace.documents.length === 0 &&
    workspace.chartSeries.length === 0 &&
    workspace.reminders.length === 0 &&
    workspace.assets.length === 0;

  if (isEmpty) {
    return {
      text: 'Bellekte henüz yüklü belge veya veri bulunmuyor. Excel, PDF, sunum veya görsel yükleyebilir ya da örnek hastane verisini aktif ederek analiz başlatabilirsiniz.',
      citations: [],
    };
  }

  // 1. Hasta / Hacim sorgusu
  if (
    q.includes('hasta') ||
    q.includes('taburcu') ||
    q.includes('hacim') ||
    q.includes('poliklinik')
  ) {
    const series = workspace.chartSeries.filter(
      (s) => (s.patients ?? 0) > 0 || (s.discharged ?? 0) > 0
    );
    if (series.length > 0) {
      const latest = series[series.length - 1];
      const totalPatients = series.reduce((a, b) => a + (b.patients ?? 0), 0);
      const totalDischarged = series.reduce(
        (a, b) => a + (b.discharged ?? 0),
        0
      );
      const dischargeRate =
        totalPatients > 0 ? ((totalDischarged / totalPatients) * 100).toFixed(1) : '0';
      sections.push(
        `Son dönem (${latest.period}) gelen hasta sayısı **${(latest.patients ?? 0).toLocaleString('tr-TR')}**, taburcu sayısı **${(latest.discharged ?? 0).toLocaleString('tr-TR')}**. ${series.length} aylık toplamda **${totalPatients.toLocaleString('tr-TR')}** hasta kaydı ve **%${dischargeRate}** taburcu oranı görünüyor.`
      );
      const finDoc = workspace.documents.find((d) => d.tables.length > 0);
      if (finDoc) citations.add(finDoc.name);
      citations.add('Dönemsel Performans Serisi');
    }
  }

  // 2. Gelir / Maliyet / Kâr / Marj sorgusu
  if (
    q.includes('kar') ||
    q.includes('marj') ||
    q.includes('gelir') ||
    q.includes('gider') ||
    q.includes('maliyet') ||
    q.includes('ciro') ||
    q.includes('finans')
  ) {
    const series = workspace.chartSeries.filter(
      (s) => (s.revenue ?? 0) > 0 || (s.profit ?? 0) > 0
    );
    if (series.length > 0) {
      const latest = series[series.length - 1];
      const totalRev = series.reduce((a, b) => a + (b.revenue ?? 0), 0);
      const totalCost = series.reduce((a, b) => a + (b.cost ?? 0), 0);
      const totalProfit =
        series.reduce((a, b) => a + (b.profit ?? 0), 0) ||
        Math.max(0, totalRev - totalCost);
      const avgMargin = totalRev > 0 ? (totalProfit / totalRev) * 100 : 0;

      sections.push(
        `Son dönem (${latest.period}) geliri **${formatTl(latest.revenue ?? 0)}**, maliyeti **${formatTl(latest.cost ?? 0)}**, net kârı **${formatTl(latest.profit ?? 0)}** ve kâr marjı **%${(latest.margin ?? avgMargin).toFixed(1)}**.\n${series.length} dönem kümülatif toplamda gelir **${formatTl(totalRev)}**, net kâr **${formatTl(totalProfit)}** (ortalama marj **%${avgMargin.toFixed(1)}**).`
      );
      const finDoc = workspace.documents.find(
        (d) =>
          normalizeTr(d.name).includes('mali') ||
          normalizeTr(d.name).includes('finans') ||
          d.tables.length > 0
      );
      if (finDoc) citations.add(finDoc.name);
      citations.add('Finansal Seri');
    }
  }

  // 3. SUT / Medula / Mevzuat sorgusu
  if (q.includes('sut') || q.includes('medula') || q.includes('fatura')) {
    const sutReminders = workspace.reminders.filter(
      (r) =>
        r.category === 'sut' ||
        normalizeTr(r.title).includes('sut') ||
        normalizeTr(r.title).includes('medula')
    );
    if (sutReminders.length > 0) {
      const lines = sutReminders.map(
        (r) =>
          `• [${r.completed ? 'Tamamlandı' : r.priority === 'high' ? 'Acil' : 'Açık'}] ${r.title} (Son tarih: ${r.dueDate})`
      );
      sections.push(
        `Kayıtlı **${sutReminders.length}** SUT / Medula takip kalemi bulundu:\n${lines.join('\n')}`
      );
      citations.add('Operasyon & Hatırlatıcılar');
    }
  }

  // 4. Bakım / Cihaz / Varlık / Alan sorgusu
  if (
    q.includes('bakim') ||
    q.includes('cihaz') ||
    q.includes('varlik') ||
    q.includes('dikkat') ||
    q.includes('alan') ||
    q.includes('kalibrasyon') ||
    q.includes('wc') ||
    q.includes('ameliyathane')
  ) {
    const openMaint = workspace.reminders.filter(
      (r) => !r.completed && r.category === 'maintenance'
    );
    if (openMaint.length > 0) {
      const lines = openMaint
        .slice(0, 5)
        .map((r) => `• ${r.title} (${r.dueDate})`);
      sections.push(
        `Yaklaşan **${openMaint.length}** açık bakım/kalibrasyon hatırlatıcısı var:\n${lines.join('\n')}`
      );
      citations.add('Bakım Takvimi');
    }

    const flaggedAssets = workspace.assets.filter((a) => a.status !== 'active');
    if (flaggedAssets.length > 0) {
      const lines = flaggedAssets.map(
        (a) =>
          `• ${a.name} (${a.department}) — Durum: ${a.status === 'attention' ? 'Dikkat Gerekiyor' : 'Bakımda'}${a.nextMaintenanceDate ? `, Sonraki bakım: ${a.nextMaintenanceDate}` : ''}`
      );
      sections.push(
        `Özel dikkat veya bakım gerektiren **${flaggedAssets.length}** varlık/alan:\n${lines.join('\n')}`
      );
      citations.add('Varlık & Alan Envanteri');
    } else if (workspace.assets.length > 0) {
      sections.push(
        `Toplam **${workspace.assets.length}** kayıtlı varlık/alan aktif durumda.`
      );
      citations.add('Varlık & Alan Envanteri');
    }
  }

  // 5. Belge özeti sorgusu
  if (q.includes('ozet') || q.includes('belge') || q.includes('dosya')) {
    if (workspace.documents.length > 0) {
      const lines = workspace.documents.map(
        (d) => `• **${d.name}** (${d.category}): ${d.summary}`
      );
      sections.push(
        `Bellekte **${workspace.documents.length}** belge bulunuyor:\n${lines.join('\n')}`
      );
      workspace.documents.forEach((d) => citations.add(d.name));
    }
  }

  // 6. Fallback full-text & table search across all docs
  if (sections.length === 0) {
    const tokens = q
      .split(/[^a-z0-9]+/)
      .filter((t) => t.length >= 3 && !['neler', 'nedir', 'nasil', 'hangi', 'kac', 'icin', 'olan'].includes(t));

    const matchedLines: string[] = [];

    for (const doc of workspace.documents) {
      const rawLines = doc.rawText
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => l.length > 8);

      for (const line of rawLines) {
        const normLine = normalizeTr(line);
        if (tokens.some((tok) => normLine.includes(tok))) {
          matchedLines.push(`• (${doc.name}) ${line.slice(0, 180)}`);
          citations.add(doc.name);
          if (matchedLines.length >= 5) break;
        }
      }
      if (matchedLines.length >= 5) break;
    }

    if (matchedLines.length > 0) {
      sections.push(
        `Belgelerinizde sorunuzla eşleşen kayıtlar bulundu:\n${matchedLines.join('\n')}`
      );
    } else {
      sections.push(
        `Bu soru için belgelerde doğrudan eşleşme bulunamadı. Şu an bellekte **${workspace.documents.length} belge**, **${workspace.chartSeries.length} dönemlik grafik verisi**, **${workspace.assets.length} varlık** ve **${workspace.reminders.length} hatırlatıcı** var. Yukarıdaki hazır analiz sorularından birini deneyebilirsiniz.`
      );
    }
  }

  return {
    text: sections.join('\n\n'),
    citations: Array.from(citations),
  };
}

function buildCompactContext(workspace: WorkspaceState): string {
  const parts: string[] = [
    `Çalışma Alanı: ${workspace.workspaceName} (${workspace.sector})`,
  ];
  if (workspace.chartSeries.length > 0) {
    parts.push(
      `Dönemsel Seri:\n${JSON.stringify(workspace.chartSeries.slice(-6))}`
    );
  }
  if (workspace.reminders.length > 0) {
    parts.push(
      `Hatırlatıcılar:\n${workspace.reminders
        .map(
          (r) =>
            `- [${r.category}/${r.priority}/${r.completed ? 'tamam' : 'acik'}] ${r.title} (${r.dueDate})`
        )
        .join('\n')}`
    );
  }
  if (workspace.assets.length > 0) {
    parts.push(
      `Varlıklar:\n${workspace.assets
        .map((a) => `- ${a.name} (${a.department}, ${a.status})`)
        .join('\n')}`
    );
  }
  if (workspace.documents.length > 0) {
    parts.push(
      `Belgeler:\n${workspace.documents
        .map((d) => `- ${d.name}: ${d.summary}`)
        .join('\n')}`
    );
  }
  return parts.join('\n\n');
}

export const AssistantView: React.FC<AssistantViewProps> = ({
  workspace,
  onLoadDemo,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: 'Merhaba! Ben Tertip Analiz Asistanı. Yüklediğiniz Excel, PDF, sunum ve OCR belgelerindeki sayıları, kâr marjlarını, yaklaşan bakımları ve SUT takvimini **%100 çevrimdışı** olarak sorgulayabilirsiniz.',
      modeLabel: 'Yerel Çevrimdışı Motor',
      timestamp: new Date().toLocaleTimeString('tr-TR', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Strictly RAM-only AI config, defaults to 100% offline with zero network calls
  const [aiConfig, setAiConfig] = useState<AiConfig>({
    provider: 'local-offline',
    ollamaUrl: 'http://localhost:11434',
    ollamaModel: 'llama3.2',
    geminiApiKey: '',
    geminiModel: 'gemini-2.0-flash',
  });

  const providerLabel = useMemo(() => {
    if (aiConfig.provider === 'ollama') {
      return `Yerel Ollama (${aiConfig.ollamaModel})`;
    }
    if (aiConfig.provider === 'gemini-byok') {
      return `Gemini BYOK (${aiConfig.geminiModel})`;
    }
    return 'Yerel Çevrimdışı Motor (0 Ağ İsteği)';
  }, [aiConfig]);

  const askQuestion = async (rawQuestion: string) => {
    const question = rawQuestion.trim();
    if (!question || isLoading) return;

    const now = new Date().toLocaleTimeString('tr-TR', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const userMsg: ChatMessage = {
      id: `u_${Date.now()}`,
      role: 'user',
      text: question,
      timestamp: now,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      if (aiConfig.provider === 'local-offline') {
        const result = buildLocalAnswer(question, workspace);
        setMessages((prev) => [
          ...prev,
          {
            id: `a_${Date.now()}`,
            role: 'assistant',
            text: result.text,
            citations: result.citations,
            modeLabel: 'Yerel Çevrimdışı Motor',
            timestamp: new Date().toLocaleTimeString('tr-TR', {
              hour: '2-digit',
              minute: '2-digit',
            }),
          },
        ]);
      } else if (aiConfig.provider === 'ollama') {
        const context = buildCompactContext(workspace);
        const endpoint = `${aiConfig.ollamaUrl.replace(/\/+$/, '')}/api/generate`;
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: aiConfig.ollamaModel || 'llama3.2',
            stream: false,
            prompt: `Sen Tertip yerel iş analizi asistanısın. Yalnızca aşağıdaki verilere dayanarak kısa, net Türkçe yanıt ver.\n\nVERİ:\n${context}\n\nSORU: ${question}`,
          }),
        });
        if (!response.ok) {
          throw new Error(`Ollama yanıt vermedi (HTTP ${response.status}).`);
        }
        const data = (await response.json()) as { response?: string };
        setMessages((prev) => [
          ...prev,
          {
            id: `a_${Date.now()}`,
            role: 'assistant',
            text: data.response?.trim() || 'Ollama boş yanıt döndürdü.',
            modeLabel: `Yerel Ollama · ${aiConfig.ollamaModel}`,
            timestamp: new Date().toLocaleTimeString('tr-TR', {
              hour: '2-digit',
              minute: '2-digit',
            }),
          },
        ]);
      } else if (aiConfig.provider === 'gemini-byok') {
        if (!aiConfig.geminiApiKey.trim()) {
          throw new Error(
            'Gemini BYOK modu için lütfen ayarlardan kendi API anahtarınızı girin veya Yerel Çevrimdışı Motoru seçin.'
          );
        }
        const context = buildCompactContext(workspace);
        const model = aiConfig.geminiModel || 'gemini-2.0-flash';
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
          model
        )}:generateContent?key=${encodeURIComponent(aiConfig.geminiApiKey.trim())}`;

        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: `Sen Tertip iş operasyonları ve belge analiz asistanısın. Aşağıdaki özet veriye dayanarak net, rakamsal Türkçe yanıt ver.\n\nVERİ:\n${context}\n\nSORU: ${question}`,
                  },
                ],
              },
            ],
          }),
        });

        if (!response.ok) {
          throw new Error(`Gemini API hatası (HTTP ${response.status}).`);
        }

        const data = (await response.json()) as {
          candidates?: Array<{
            content?: { parts?: Array<{ text?: string }> };
          }>;
        };
        const replyText =
          data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ||
          'Modelden yanıt alınamadı.';

        setMessages((prev) => [
          ...prev,
          {
            id: `a_${Date.now()}`,
            role: 'assistant',
            text: replyText,
            modeLabel: `Gemini BYOK · ${model}`,
            timestamp: new Date().toLocaleTimeString('tr-TR', {
              hour: '2-digit',
              minute: '2-digit',
            }),
          },
        ]);
      }
    } catch (err) {
      const fallback = buildLocalAnswer(question, workspace);
      const errMsg =
        err instanceof Error ? err.message : 'Bağlantı sırasında hata oluştu.';
      setMessages((prev) => [
        ...prev,
        {
          id: `a_${Date.now()}`,
          role: 'assistant',
          text: `${errMsg}\n\nYerel çevrimdışı analiz sonucu:\n${fallback.text}`,
          citations: fallback.citations,
          modeLabel: 'Yerel Yedek Yanıt',
          timestamp: new Date().toLocaleTimeString('tr-TR', {
            hour: '2-digit',
            minute: '2-digit',
          }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void askQuestion(input);
  };

  const hasData =
    workspace.documents.length > 0 ||
    workspace.chartSeries.length > 0 ||
    workspace.reminders.length > 0;

  return (
    <div className="space-y-5">
      <SectionHeader
        eyebrow="BELGE & METRİK SORGULAMA"
        title="Analiz Asistanı"
        subtitle="Belgelerinizdeki tabloları, finansal serileri, bakım takvimlerini ve SUT kayıtlarını doğal Türkçe sorularla sorgulayın."
        as="h1"
        actions={
          <Button
            variant="secondary"
            size="sm"
            icon={<Settings2 className="h-4 w-4" />}
            iconRight={
              showSettings ? (
                <ChevronUp className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )
            }
            onClick={() => setShowSettings((prev) => !prev)}
          >
            İsteğe Bağlı YZ Sağlayıcı
          </Button>
        }
      />

      {/* Optional Collapsible AI Provider Settings */}
      {showSettings && (
        <Card variant="elevated" padding="md">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Cpu className="h-4 w-4 text-tertip-accent" />
                <h2 className="text-sm font-semibold text-tertip-ink">
                  İsteğe Bağlı Yapay Zekâ Sağlayıcı Ayarları
                </h2>
              </div>
              <Badge variant="success" size="sm" icon={<Lock className="h-3 w-3" />}>
                Varsayılan: %100 Çevrimdışı (0 Ağ İsteği)
              </Badge>
            </div>

            <p className="text-xs text-tertip-ink-muted">
              Tertip varsayılan olarak hiçbir dış servise bağlanmaz. İsterseniz
              kendi bilgisayarınızdaki <strong>Yerel Ollama</strong> örneğini
              veya kendi <strong>Gemini API anahtarınızı (BYOK)</strong>{' '}
              yalnızca bu oturum boyunca (RAM) kullanabilirsiniz.
            </p>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {(
                [
                  {
                    id: 'local-offline',
                    title: 'Yerel Çevrimdışı Motor',
                    desc: 'Önerilen · 0 ağ isteği',
                  },
                  {
                    id: 'ollama',
                    title: 'Yerel Ollama',
                    desc: 'localhost:11434 · Kendi modeliniz',
                  },
                  {
                    id: 'gemini-byok',
                    title: 'Gemini API (BYOK)',
                    desc: 'İsteğe bağlı · Kendi anahtarınız',
                  },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() =>
                    setAiConfig((prev) => ({ ...prev, provider: opt.id }))
                  }
                  className={`rounded-xl border p-3 text-left transition-colors ${
                    aiConfig.provider === opt.id
                      ? 'border-tertip-accent bg-tertip-accent-soft'
                      : 'border-tertip-border bg-tertip-surface hover:bg-tertip-surface-subtle'
                  }`}
                >
                  <p className="text-xs font-semibold text-tertip-ink">
                    {opt.title}
                  </p>
                  <p className="mt-0.5 text-[11px] text-tertip-ink-muted">
                    {opt.desc}
                  </p>
                </button>
              ))}
            </div>

            {aiConfig.provider === 'ollama' && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-tertip-ink">
                    Ollama Sunucu Adresi
                  </label>
                  <input
                    type="url"
                    value={aiConfig.ollamaUrl}
                    onChange={(e) =>
                      setAiConfig((prev) => ({
                        ...prev,
                        ollamaUrl: e.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-tertip-border bg-tertip-surface px-3 py-2 font-mono text-xs text-tertip-ink focus:border-tertip-accent focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-tertip-ink">
                    Model Adı
                  </label>
                  <input
                    type="text"
                    value={aiConfig.ollamaModel}
                    onChange={(e) =>
                      setAiConfig((prev) => ({
                        ...prev,
                        ollamaModel: e.target.value,
                      }))
                    }
                    placeholder="llama3.2 / qwen2.5"
                    className="w-full rounded-xl border border-tertip-border bg-tertip-surface px-3 py-2 font-mono text-xs text-tertip-ink focus:border-tertip-accent focus:outline-none"
                  />
                </div>
              </div>
            )}

            {aiConfig.provider === 'gemini-byok' && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-tertip-ink">
                    Gemini API Anahtarı (Yalnızca RAM&apos;de tutulur)
                  </label>
                  <input
                    type="password"
                    value={aiConfig.geminiApiKey}
                    onChange={(e) =>
                      setAiConfig((prev) => ({
                        ...prev,
                        geminiApiKey: e.target.value,
                      }))
                    }
                    placeholder="AIza..."
                    className="w-full rounded-xl border border-tertip-border bg-tertip-surface px-3 py-2 font-mono text-xs text-tertip-ink focus:border-tertip-accent focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-tertip-ink">
                    Model
                  </label>
                  <input
                    type="text"
                    value={aiConfig.geminiModel}
                    onChange={(e) =>
                      setAiConfig((prev) => ({
                        ...prev,
                        geminiModel: e.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-tertip-border bg-tertip-surface px-3 py-2 font-mono text-xs text-tertip-ink focus:border-tertip-accent focus:outline-none"
                  />
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Quick Suggested Question Chips */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1 text-xs font-medium text-tertip-ink-muted">
          <Sparkles className="h-3.5 w-3.5 text-tertip-gold" />
          Hızlı Sorular:
        </span>
        {SUGGESTED_QUESTIONS.map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => void askQuestion(q)}
            disabled={isLoading}
            className="rounded-full border border-tertip-border bg-tertip-surface px-3 py-1 text-xs font-medium text-tertip-ink-secondary transition-colors hover:border-tertip-accent hover:bg-tertip-accent-soft hover:text-tertip-accent disabled:opacity-50"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Main Notebook Q&A Card */}
      <Card
        variant="default"
        padding="none"
        header={
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-tertip-accent" />
              <span className="text-sm font-semibold text-tertip-ink">
                Operasyonel Analiz Defteri
              </span>
            </div>
            <Badge
              variant={aiConfig.provider === 'local-offline' ? 'success' : 'gold'}
              size="sm"
              icon={
                aiConfig.provider === 'local-offline' ? (
                  <WifiOff className="h-3 w-3" />
                ) : (
                  <Cpu className="h-3 w-3" />
                )
              }
            >
              {providerLabel}
            </Badge>
          </div>
        }
      >
        {!hasData && (
          <div className="border-b border-tertip-border bg-tertip-surface-elevated p-4">
            <EmptyState
              compact
              title="Henüz analiz edilecek veri yok"
              description="Anlamlı yanıtlar alabilmek için belge yükleyin veya örnek hastane veri setini aktif edin."
              action={
                <Button
                  variant="secondary"
                  size="sm"
                  icon={<Database className="h-4 w-4" />}
                  onClick={onLoadDemo}
                >
                  Örnek Hastane Verisini Yükle
                </Button>
              }
            />
          </div>
        )}

        {/* Messages Feed */}
        <div className="max-h-[460px] space-y-4 overflow-y-auto p-5">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${
                msg.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-tertip-accent text-tertip-accent-ink'
                    : 'border border-tertip-border bg-tertip-surface-elevated text-tertip-ink'
                }`}
              >
                <div className="whitespace-pre-line">
                  {renderRichText(msg.text)}
                </div>

                {msg.citations && msg.citations.length > 0 && (
                  <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-tertip-border/60 pt-2">
                    <span className="text-[11px] font-medium text-tertip-ink-muted">
                      Kaynaklar:
                    </span>
                    {msg.citations.map((src) => (
                      <Badge
                        key={src}
                        variant="neutral"
                        size="sm"
                        icon={<FileText className="h-3 w-3" />}
                      >
                        {src}
                      </Badge>
                    ))}
                  </div>
                )}

                <div
                  className={`mt-1.5 flex items-center justify-between gap-3 text-[10px] ${
                    msg.role === 'user'
                      ? 'text-tertip-accent-ink/75'
                      : 'text-tertip-ink-muted'
                  }`}
                >
                  <span>{msg.modeLabel ?? 'Siz'}</span>
                  <span className="font-mono">{msg.timestamp}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Input Form */}
        <form
          onSubmit={handleSubmit}
          className="flex items-center gap-2 border-t border-tertip-border bg-tertip-surface-elevated p-3"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Belgeleriniz ve operasyonel sayılar hakkında bir soru sorun..."
            className="flex-1 rounded-xl border border-tertip-border bg-tertip-surface px-3.5 py-2.5 text-sm text-tertip-ink placeholder:text-tertip-ink-muted focus:border-tertip-accent focus:outline-none"
          />
          <Button
            type="submit"
            variant="primary"
            loading={isLoading}
            icon={<Send className="h-4 w-4" />}
          >
            Sor
          </Button>
        </form>
      </Card>
    </div>
  );
};
