import React from 'react';
import { AlertCircle, ArrowRight, CheckCircle2, ShieldCheck } from 'lucide-react';
import { Badge } from './Badge';

export interface AuditMissingItem {
  id: string;
  label: string;
  detail?: string;
  severity?: 'high' | 'medium' | 'low';
}

export interface AuditReadinessGaugeProps {
  score: number;
  label?: string;
  subtitle?: string;
  passedCount?: number;
  totalCount?: number;
  missingItems?: AuditMissingItem[];
  onActionClick?: () => void;
  actionLabel?: string;
  className?: string;
}

export const AuditReadinessGauge: React.FC<AuditReadinessGaugeProps> = ({
  score,
  label = 'Denetime Hazırlık Skoru',
  subtitle,
  passedCount,
  totalCount,
  missingItems = [],
  onActionClick,
  actionLabel = 'Eksikleri İncele',
  className = '',
}) => {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (clamped / 100) * circumference;

  const statusConfig =
    clamped >= 80
      ? {
          stroke: 'var(--tertip-success)',
          badgeVariant: 'success' as const,
          statusText: 'Denetime Hazır',
        }
      : clamped >= 55
        ? {
            stroke: 'var(--tertip-gold)',
            badgeVariant: 'gold' as const,
            statusText: 'Geliştirilmeli',
          }
        : {
            stroke: 'var(--tertip-danger)',
            badgeVariant: 'danger' as const,
            statusText: 'Eksik Kanıt Var',
          };

  return (
    <div
      className={[
        'rounded-[var(--tertip-radius-md)] border border-[var(--tertip-border)] bg-[var(--tertip-surface)] p-4 sm:p-5 shadow-[var(--tertip-shadow-xs)]',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-5">
        {/* Crisp Circular SVG Gauge */}
        <div className="flex items-center gap-4 shrink-0">
          <div
            role="img"
            aria-label={`${label}: yüzde ${clamped} — ${statusConfig.statusText}`}
            className="relative h-24 w-24 sm:h-28 sm:w-28 shrink-0 flex items-center justify-center"
          >
            <svg
              viewBox="0 0 112 112"
              className="h-full w-full -rotate-90"
              aria-hidden="true"
            >
              <circle
                cx="56"
                cy="56"
                r={radius}
                fill="none"
                stroke="var(--tertip-surface-subtle)"
                strokeWidth="10"
              />
              <circle
                cx="56"
                cy="56"
                r={radius}
                fill="none"
                stroke={statusConfig.stroke}
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
                className="transition-[stroke-dashoffset] duration-500 ease-out"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="font-[var(--tertip-font-display)] text-xl sm:text-2xl font-bold text-[var(--tertip-ink)] tertip-tabular leading-none">
                %{clamped}
              </span>
              <span className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--tertip-ink-muted)]">
                Hazırlık
              </span>
            </div>
          </div>

          {/* Mobile title beside ring */}
          <div className="sm:hidden min-w-0">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--tertip-ink)]">
              <ShieldCheck className="h-4 w-4 text-[var(--tertip-accent)] shrink-0" aria-hidden="true" />
              <span>{label}</span>
            </div>
            <div className="mt-1.5">
              <Badge variant={statusConfig.badgeVariant} size="sm" dot>
                {statusConfig.statusText}
              </Badge>
            </div>
            {passedCount !== undefined && totalCount !== undefined && (
              <p className="mt-1.5 text-[11px] text-[var(--tertip-ink-muted)] tertip-tabular">
                {passedCount} / {totalCount} kontrol eksiksiz
              </p>
            )}
          </div>
        </div>

        {/* Details & Missing Evidence Summary */}
        <div className="min-w-0 flex-1">
          <div className="hidden sm:flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-[var(--tertip-accent)] shrink-0" aria-hidden="true" />
              <h3 className="font-[var(--tertip-font-display)] text-sm sm:text-[15px] font-semibold text-[var(--tertip-ink)]">
                {label}
              </h3>
            </div>
            <Badge variant={statusConfig.badgeVariant} size="sm" dot>
              {statusConfig.statusText}
            </Badge>
          </div>

          {(subtitle || (passedCount !== undefined && totalCount !== undefined)) && (
            <p className="hidden sm:block mt-1 text-xs text-[var(--tertip-ink-muted)] leading-relaxed">
              {subtitle ??
                `${totalCount} denetim kaleminden ${passedCount} tanesi belgelenmiş ve güncel durumda.`}
            </p>
          )}

          {missingItems.length === 0 ? (
            <div className="mt-3 flex items-center gap-2 rounded-[var(--tertip-radius-sm)] bg-[var(--tertip-success-soft)] border border-[var(--tertip-success-border)] px-3 py-2 text-xs font-medium text-[var(--tertip-success)]">
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>Tüm varlık sertifikaları ve dönemsel evraklar eksiksiz görünüyor.</span>
            </div>
          ) : (
            <ul className="mt-3 space-y-1.5">
              {missingItems.slice(0, 3).map((item) => {
                const dotColor =
                  item.severity === 'high'
                    ? 'text-[var(--tertip-danger)]'
                    : item.severity === 'medium'
                      ? 'text-[var(--tertip-gold)]'
                      : 'text-[var(--tertip-ink-muted)]';

                return (
                  <li
                    key={item.id}
                    className="flex items-start gap-2 rounded-[var(--tertip-radius-xs)] bg-[var(--tertip-surface-elevated)] border border-[var(--tertip-border)]/70 px-2.5 py-1.5 text-xs"
                  >
                    <AlertCircle className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${dotColor}`} aria-hidden="true" />
                    <div className="min-w-0 flex-1">
                      <span className="font-medium text-[var(--tertip-ink)]">
                        {item.label}
                      </span>
                      {item.detail && (
                        <span className="ml-1.5 text-[var(--tertip-ink-muted)]">
                          — {item.detail}
                        </span>
                      )}
                    </div>
                  </li>
                );
              })}
              {missingItems.length > 3 && (
                <li className="text-[11px] font-medium text-[var(--tertip-ink-muted)] pl-1">
                  +{missingItems.length - 3} eksik kanıt daha
                </li>
              )}
            </ul>
          )}

          {onActionClick && (
            <div className="mt-3">
              <button
                type="button"
                onClick={onActionClick}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--tertip-accent)] hover:underline cursor-pointer"
              >
                <span>{actionLabel}</span>
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
