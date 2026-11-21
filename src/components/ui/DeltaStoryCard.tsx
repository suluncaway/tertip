import React from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Minus,
  Sparkles,
} from 'lucide-react';
import { Badge } from './Badge';

export interface DeltaMetricChip {
  id: string;
  label: string;
  currentFormatted: string;
  previousFormatted?: string;
  deltaFormatted: string;
  deltaPct?: number | null;
  direction: 'up' | 'down' | 'flat';
  /**
   * Determines semantic coloring:
   * - 'up': increase is positive (e.g., Gelir, Net Kâr, Hacim)
   * - 'down': decrease is positive, increase is negative (e.g., Maliyet, Gider)
   */
  goodWhen?: 'up' | 'down';
  /** Optional explicit sentiment override */
  sentiment?: 'positive' | 'negative' | 'neutral';
}

export interface DeltaStoryCardProps {
  title?: string;
  periodLabel?: string;
  metrics: DeltaMetricChip[];
  narratives: string[];
  insufficientData?: boolean;
  insufficientMessage?: string;
  actions?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

function resolveSentiment(chip: DeltaMetricChip): 'positive' | 'negative' | 'neutral' {
  if (chip.sentiment) return chip.sentiment;
  if (chip.direction === 'flat') return 'neutral';
  const goodWhen = chip.goodWhen ?? 'up';
  if (goodWhen === 'down') {
    return chip.direction === 'down' ? 'positive' : 'negative';
  }
  return chip.direction === 'up' ? 'positive' : 'negative';
}

const sentimentStyles: Record<
  'positive' | 'negative' | 'neutral',
  {
    pill: string;
    border: string;
  }
> = {
  positive: {
    pill: 'bg-[var(--tertip-success-soft)] text-[var(--tertip-success)]',
    border: 'border-[var(--tertip-success-border)]/70',
  },
  negative: {
    pill: 'bg-[var(--tertip-danger-soft)] text-[var(--tertip-danger)]',
    border: 'border-[var(--tertip-danger-border)]/70',
  },
  neutral: {
    pill: 'bg-[var(--tertip-gold-soft)] text-[var(--tertip-gold)]',
    border: 'border-[var(--tertip-border)]',
  },
};

export const DeltaStoryCard: React.FC<DeltaStoryCardProps> = ({
  title = 'Geçen Aya Göre Ne Değişti?',
  periodLabel,
  metrics,
  narratives,
  insufficientData = false,
  insufficientMessage = 'Dönemsel karşılaştırma oluşturmak için en az iki dönemlik veri veya eski bir .tertip yedeği gerekir.',
  actions,
  footer,
  className = '',
}) => {
  return (
    <section
      aria-label={title}
      className={[
        'rounded-[var(--tertip-radius-lg)] border border-[var(--tertip-border)] bg-[var(--tertip-surface)] shadow-[var(--tertip-shadow-xs)] overflow-hidden',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {/* Editorial Header */}
      <div className="px-4 sm:px-6 py-4 border-b border-[var(--tertip-border)] bg-[var(--tertip-surface-elevated)]/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-[var(--tertip-radius-xs)] bg-[var(--tertip-accent-soft)] text-[var(--tertip-accent)]">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
            <h3 className="font-[var(--tertip-font-display)] text-base sm:text-[17px] font-semibold text-[var(--tertip-ink)] leading-snug">
              {title}
            </h3>
            {periodLabel && (
              <Badge variant="gold" size="sm">
                {periodLabel}
              </Badge>
            )}
          </div>
        </div>

        {actions && (
          <div className="flex items-center gap-2 shrink-0 flex-wrap">{actions}</div>
        )}
      </div>

      {/* Body */}
      <div className="p-4 sm:p-6">
        {insufficientData ? (
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3.5 rounded-[var(--tertip-radius-md)] border border-dashed border-[var(--tertip-border-strong)] bg-[var(--tertip-surface-elevated)]/60 p-4 sm:p-5">
            <span
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--tertip-radius-sm)] bg-[var(--tertip-gold-soft)] text-[var(--tertip-gold)] border border-[var(--tertip-gold-border)]"
              aria-hidden="true"
            >
              <BarChart3 className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[var(--tertip-ink)]">
                Karşılaştırma için ikinci dönem bekleniyor
              </p>
              <p className="mt-1 text-xs sm:text-sm text-[var(--tertip-ink-muted)] leading-relaxed">
                {insufficientMessage}
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* 3-4 Large Metric Delta Chips */}
            {metrics.length > 0 && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
                {metrics.slice(0, 4).map((chip) => {
                  const sentiment = resolveSentiment(chip);
                  const style = sentimentStyles[sentiment];
                  const pctText =
                    chip.deltaPct !== undefined &&
                    chip.deltaPct !== null &&
                    Number.isFinite(chip.deltaPct)
                      ? `${chip.deltaPct > 0 ? '+' : ''}%${chip.deltaPct.toFixed(1)}`
                      : null;

                  return (
                    <div
                      key={chip.id}
                      className={[
                        'min-w-0 rounded-[var(--tertip-radius-md)] border bg-[var(--tertip-surface-elevated)]/65 p-3 sm:p-3.5',
                        style.border,
                      ].join(' ')}
                    >
                      <div className="text-[11px] font-medium uppercase tracking-wide text-[var(--tertip-ink-muted)] truncate">
                        {chip.label}
                      </div>

                      <div className="mt-1.5 font-[var(--tertip-font-display)] text-base sm:text-lg font-semibold text-[var(--tertip-ink)] tertip-tabular leading-tight truncate">
                        {chip.currentFormatted}
                      </div>

                      <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                        <span
                          className={[
                            'inline-flex items-center gap-0.5 rounded-[var(--tertip-radius-full)] px-2 py-0.5 text-[11px] font-semibold tertip-tabular',
                            style.pill,
                          ].join(' ')}
                        >
                          {chip.direction === 'up' && (
                            <ArrowUpRight className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                          )}
                          {chip.direction === 'down' && (
                            <ArrowDownRight className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                          )}
                          {chip.direction === 'flat' && (
                            <Minus className="h-3 w-3 shrink-0" aria-hidden="true" />
                          )}
                          <span>{pctText ?? chip.deltaFormatted}</span>
                        </span>
                        {pctText && (
                          <span className="text-[11px] text-[var(--tertip-ink-muted)] tertip-tabular truncate">
                            {chip.deltaFormatted}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Editorial Narrative Paragraphs */}
            {narratives.length > 0 && (
              <div className="mt-4 space-y-2 rounded-[var(--tertip-radius-md)] bg-[var(--tertip-surface-elevated)]/75 border border-[var(--tertip-border)]/80 px-4 py-3.5">
                {narratives.map((paragraph, idx) => (
                  <p
                    key={idx}
                    className="text-xs sm:text-[13.5px] text-[var(--tertip-ink-secondary)] leading-relaxed"
                  >
                    {paragraph}
                  </p>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {footer && (
        <div className="px-4 sm:px-6 py-3 border-t border-[var(--tertip-border)] bg-[var(--tertip-surface-elevated)]/55">
          {footer}
        </div>
      )}
    </section>
  );
};
