import React from 'react';

export type CardVariant = 'default' | 'elevated' | 'subtle' | 'interactive';
export type CardPadding = 'none' | 'sm' | 'md' | 'lg';

export interface CardProps extends React.HTMLAttributes<HTMLElement> {
  variant?: CardVariant;
  padding?: CardPadding;
  as?: 'div' | 'section' | 'article';
  header?: React.ReactNode;
  footer?: React.ReactNode;
}

const variantClasses: Record<CardVariant, string> = {
  default:
    'bg-[var(--tertip-surface)] border border-[var(--tertip-border)] shadow-[var(--tertip-shadow-xs)]',
  elevated:
    'bg-[var(--tertip-surface)] border border-[var(--tertip-border)] shadow-[var(--tertip-shadow-md)]',
  subtle:
    'bg-[var(--tertip-surface-elevated)] border border-[var(--tertip-border)]',
  interactive:
    'bg-[var(--tertip-surface)] border border-[var(--tertip-border)] shadow-[var(--tertip-shadow-xs)] transition-[border-color,box-shadow,transform] duration-200 hover:border-[var(--tertip-border-strong)] hover:shadow-[var(--tertip-shadow-md)] hover:-translate-y-[1px]',
};

const paddingClasses: Record<CardPadding, string> = {
  none: '',
  sm: 'p-4',
  md: 'p-5',
  lg: 'p-6',
};

export const Card: React.FC<CardProps> = ({
  variant = 'default',
  padding = 'md',
  as: Component = 'div',
  header,
  footer,
  className = '',
  children,
  ...props
}) => {
  return (
    <Component
      className={[
        'rounded-[var(--tertip-radius-md)] text-[var(--tertip-ink)] overflow-hidden',
        variantClasses[variant],
        !header && !footer ? paddingClasses[padding] : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    >
      {header && (
        <div className="px-5 py-4 border-b border-[var(--tertip-border)] bg-[var(--tertip-surface-elevated)]/60">
          {header}
        </div>
      )}
      {header || footer ? (
        <div className={paddingClasses[padding]}>{children}</div>
      ) : (
        children
      )}
      {footer && (
        <div className="px-5 py-3.5 border-t border-[var(--tertip-border)] bg-[var(--tertip-surface-elevated)]/60">
          {footer}
        </div>
      )}
    </Component>
  );
};
