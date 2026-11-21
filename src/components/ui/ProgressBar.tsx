import React from 'react';

export type ProgressTone = 'accent' | 'success' | 'warning' | 'danger';

export interface ProgressBarProps {
  value: number;
  max?: number;
  indeterminate?: boolean;
  label?: string;
  hint?: string;
  tone?: ProgressTone;
  size?: 'sm' | 'md';
  showPercent?: boolean;
  className?: string;
}

const toneClasses: Record<ProgressTone, string> = {
  accent: 'bg-[var(--tertip-accent)]',
  success: 'bg-[var(--tertip-success)]',
  warning: 'bg-[var(--tertip-warning)]',
  danger: 'bg-[var(--tertip-danger)]',
};

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max = 100,
  indeterminate = false,
  label,
  hint,
  tone = 'accent',
  size = 'md',
  showPercent = false,
  className = '',
}) => {
  const safeMax = max > 0 ? max : 100;
  const clamped = Math.max(0, Math.min(100, (value / safeMax) * 100));

  return (
    <div className={`w-full ${className}`}>
      {(label || showPercent || hint) && (
        <div className="mb-1.5 flex items-baseline justify-between gap-3 text-xs">
          <div className="min-w-0 truncate font-medium text-[var(--tertip-ink-secondary)]">
            {label}
          </div>
          <div className="flex items-center gap-2 shrink-0 text-[var(--tertip-ink-muted)] tertip-tabular">
            {hint && <span>{hint}</span>}
            {showPercent && !indeterminate && (
              <span className="font-semibold text-[var(--tertip-ink)]">
                %{Math.round(clamped)}
              </span>
            )}
          </div>
        </div>
      )}

      <div
        role="progressbar"
        aria-label={label ?? 'İlerleme durumu'}
        aria-valuemin={0}
        aria-valuemax={safeMax}
        aria-valuenow={indeterminate ? undefined : Math.round(value)}
        className={[
          'w-full overflow-hidden rounded-[var(--tertip-radius-full)] bg-[var(--tertip-surface-subtle)]',
          size === 'sm' ? 'h-1.5' : 'h-2.5',
        ].join(' ')}
      >
        {indeterminate ? (
          <div
            className={`h-full w-1/3 rounded-[var(--tertip-radius-full)] ${toneClasses[tone]}`}
            style={{ animation: 'tertip-indeterminate 1.4s ease-in-out infinite' }}
          />
        ) : (
          <div
            className={[
              'h-full rounded-[var(--tertip-radius-full)] transition-[width] duration-300 ease-out',
              toneClasses[tone],
            ].join(' ')}
            style={{ width: `${clamped}%` }}
          />
        )}
      </div>
    </div>
  );
};
