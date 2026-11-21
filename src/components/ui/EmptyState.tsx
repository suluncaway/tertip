import React from 'react';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  secondaryAction?: React.ReactNode;
  compact?: boolean;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  secondaryAction,
  compact = false,
  className = '',
}) => {
  return (
    <div
      className={[
        'flex flex-col items-center justify-center text-center rounded-[var(--tertip-radius-lg)]',
        'border border-dashed border-[var(--tertip-border-strong)] bg-[var(--tertip-surface-elevated)]/70',
        compact ? 'px-5 py-8' : 'px-6 py-12 sm:py-16',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {icon && (
        <div
          className={[
            'mb-4 inline-flex items-center justify-center rounded-[var(--tertip-radius-md)]',
            'bg-[var(--tertip-accent-soft)] text-[var(--tertip-accent)] border border-[var(--tertip-accent-border)]',
            compact ? 'h-11 w-11' : 'h-14 w-14',
          ].join(' ')}
          aria-hidden="true"
        >
          {icon}
        </div>
      )}

      <h3
        className={[
          'font-[var(--tertip-font-display)] font-semibold text-[var(--tertip-ink)]',
          compact ? 'text-base' : 'text-lg sm:text-xl',
        ].join(' ')}
      >
        {title}
      </h3>

      {description && (
        <p className="mt-2 max-w-md text-sm text-[var(--tertip-ink-muted)] leading-relaxed">
          {description}
        </p>
      )}

      {(action || secondaryAction) && (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {action}
          {secondaryAction}
        </div>
      )}
    </div>
  );
};
