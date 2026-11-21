import React from 'react';
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';

export type StatTone = 'default' | 'accent' | 'gold' | 'success' | 'warning' | 'danger';

export interface StatTrend {
  value: string;
  direction: 'up' | 'down' | 'neutral';
  label?: string;
}

export interface StatCardProps {
  label: string;
  value: string | number;
  sublabel?: string;
  trend?: StatTrend;
  icon?: React.ReactNode;
  tone?: StatTone;
  onClick?: () => void;
  className?: string;
}

const iconBgClasses: Record<StatTone, string> = {
  default: 'bg-[var(--tertip-surface-subtle)] text-[var(--tertip-ink-secondary)]',
  accent: 'bg-[var(--tertip-accent-soft)] text-[var(--tertip-accent)]',
  gold: 'bg-[var(--tertip-gold-soft)] text-[var(--tertip-gold)]',
  success: 'bg-[var(--tertip-success-soft)] text-[var(--tertip-success)]',
  warning: 'bg-[var(--tertip-warning-soft)] text-[var(--tertip-warning)]',
  danger: 'bg-[var(--tertip-danger-soft)] text-[var(--tertip-danger)]',
};

const trendClasses: Record<StatTrend['direction'], string> = {
  up: 'text-[var(--tertip-success)] bg-[var(--tertip-success-soft)]',
  down: 'text-[var(--tertip-danger)] bg-[var(--tertip-danger-soft)]',
  neutral: 'text-[var(--tertip-ink-muted)] bg-[var(--tertip-surface-subtle)]',
};

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  sublabel,
  trend,
  icon,
  tone = 'accent',
  onClick,
  className = '',
}) => {
  const interactiveClasses = onClick
    ? 'cursor-pointer text-left w-full hover:border-[var(--tertip-border-strong)] hover:shadow-[var(--tertip-shadow-md)] hover:-translate-y-[1px] transition-[border-color,box-shadow,transform] duration-200'
    : '';

  const content = (
    <>
      <div className="flex items-start justify-between gap-2 sm:gap-3 min-w-0">
        <span className="text-[11px] sm:text-xs font-medium tracking-wide uppercase text-[var(--tertip-ink-muted)] leading-snug">
          {label}
        </span>
        {icon && (
          <span
            className={[
              'inline-flex h-7 w-7 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-[var(--tertip-radius-xs)] sm:rounded-[var(--tertip-radius-sm)]',
              iconBgClasses[tone],
            ].join(' ')}
            aria-hidden="true"
          >
            {icon}
          </span>
        )}
      </div>

      <div className="mt-2 sm:mt-3 flex items-baseline gap-1.5 sm:gap-2.5 flex-wrap min-w-0">
        <span className="font-[var(--tertip-font-display)] text-xl sm:text-2xl lg:text-[1.7rem] font-semibold tracking-tight text-[var(--tertip-ink)] tertip-tabular leading-tight break-words">
          {value}
        </span>
        {trend && (
          <span
            className={[
              'inline-flex items-center gap-0.5 rounded-[var(--tertip-radius-full)] px-1.5 sm:px-2 py-0.5 text-[10.5px] sm:text-[11px] font-semibold tertip-tabular',
              trendClasses[trend.direction],
            ].join(' ')}
          >
            {trend.direction === 'up' && <ArrowUpRight className="h-3 w-3 sm:h-3.5 sm:w-3.5" aria-hidden="true" />}
            {trend.direction === 'down' && <ArrowDownRight className="h-3 w-3 sm:h-3.5 sm:w-3.5" aria-hidden="true" />}
            {trend.direction === 'neutral' && <Minus className="h-3 w-3" aria-hidden="true" />}
            {trend.value}
          </span>
        )}
      </div>

      {(sublabel || trend?.label) && (
        <p className="mt-1.5 sm:mt-2 text-[11px] sm:text-xs text-[var(--tertip-ink-muted)] leading-snug sm:leading-relaxed line-clamp-2">
          {sublabel ?? trend?.label}
        </p>
      )}
    </>
  );

  const baseClasses = [
    'min-w-0 rounded-[var(--tertip-radius-md)] bg-[var(--tertip-surface)] border border-[var(--tertip-border)] p-3.5 sm:p-5 shadow-[var(--tertip-shadow-xs)]',
    interactiveClasses,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={baseClasses}>
        {content}
      </button>
    );
  }

  return <div className={baseClasses}>{content}</div>;
};
