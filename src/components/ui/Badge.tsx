import React from 'react';

export type BadgeVariant = 'neutral' | 'accent' | 'gold' | 'success' | 'warning' | 'danger' | 'info';
export type BadgeSize = 'sm' | 'md';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  pulse?: boolean;
  icon?: React.ReactNode;
}

const variantClasses: Record<BadgeVariant, string> = {
  neutral:
    'bg-[var(--tertip-surface-subtle)] text-[var(--tertip-ink-secondary)] border-[var(--tertip-border)]',
  accent:
    'bg-[var(--tertip-accent-soft)] text-[var(--tertip-accent)] border-[var(--tertip-accent-border)]',
  gold:
    'bg-[var(--tertip-gold-soft)] text-[var(--tertip-gold)] border-[var(--tertip-gold-border)]',
  success:
    'bg-[var(--tertip-success-soft)] text-[var(--tertip-success)] border-[var(--tertip-success-border)]',
  warning:
    'bg-[var(--tertip-warning-soft)] text-[var(--tertip-warning)] border-[var(--tertip-warning-border)]',
  danger:
    'bg-[var(--tertip-danger-soft)] text-[var(--tertip-danger)] border-[var(--tertip-danger-border)]',
  info:
    'bg-[var(--tertip-info-soft)] text-[var(--tertip-info)] border-[var(--tertip-info-border)]',
};

const dotColors: Record<BadgeVariant, string> = {
  neutral: 'bg-[var(--tertip-ink-muted)]',
  accent: 'bg-[var(--tertip-accent)]',
  gold: 'bg-[var(--tertip-gold)]',
  success: 'bg-[var(--tertip-success)]',
  warning: 'bg-[var(--tertip-warning)]',
  danger: 'bg-[var(--tertip-danger)]',
  info: 'bg-[var(--tertip-info)]',
};

const sizeClasses: Record<BadgeSize, string> = {
  sm: 'px-2 py-0.5 text-[11px] gap-1.5',
  md: 'px-2.5 py-1 text-xs gap-1.5',
};

export const Badge: React.FC<BadgeProps> = ({
  variant = 'neutral',
  size = 'sm',
  dot = false,
  pulse = false,
  icon,
  className = '',
  children,
  ...props
}) => {
  return (
    <span
      className={[
        'inline-flex items-center font-medium leading-none rounded-[var(--tertip-radius-full)] border whitespace-nowrap',
        variantClasses[variant],
        sizeClasses[size],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    >
      {dot && (
        <span className="relative flex h-2 w-2 shrink-0" aria-hidden="true">
          {pulse && (
            <span
              className={`absolute inline-flex h-full w-full rounded-full opacity-60 animate-ping ${dotColors[variant]}`}
            />
          )}
          <span className={`relative inline-flex rounded-full h-2 w-2 ${dotColors[variant]}`} />
        </span>
      )}
      {icon && (
        <span className="inline-flex shrink-0 items-center" aria-hidden="true">
          {icon}
        </span>
      )}
      <span>{children}</span>
    </span>
  );
};
