import React from 'react';

export interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  as?: 'h1' | 'h2' | 'h3';
  className?: string;
}

const headingClasses: Record<'h1' | 'h2' | 'h3', string> = {
  h1: 'text-2xl sm:text-[1.75rem] font-semibold tracking-tight',
  h2: 'text-lg sm:text-xl font-semibold tracking-tight',
  h3: 'text-base font-semibold tracking-tight',
};

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  subtitle,
  eyebrow,
  badge,
  actions,
  as: Heading = 'h2',
  className = '',
}) => {
  return (
    <div
      className={[
        'flex flex-col sm:flex-row sm:items-end justify-between gap-3',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="min-w-0">
        {eyebrow && (
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--tertip-accent)]">
            {eyebrow}
          </p>
        )}
        <div className="flex items-center gap-2.5 flex-wrap">
          <Heading
            className={`font-[var(--tertip-font-display)] text-[var(--tertip-ink)] leading-tight ${headingClasses[Heading]}`}
          >
            {title}
          </Heading>
          {badge}
        </div>
        {subtitle && (
          <p className="mt-1 text-sm text-[var(--tertip-ink-muted)] leading-relaxed max-w-2xl">
            {subtitle}
          </p>
        )}
      </div>

      {actions && (
        <div className="flex items-center gap-2 shrink-0 flex-wrap">{actions}</div>
      )}
    </div>
  );
};
