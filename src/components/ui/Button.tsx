import React from 'react';
import { Loader2 } from 'lucide-react';

export type ButtonVariant = 'primary' | 'secondary' | 'soft' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
  fullWidth?: boolean;
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5 rounded-[var(--tertip-radius-xs)]',
  md: 'h-10 px-4 text-sm gap-2 rounded-[var(--tertip-radius-sm)]',
  lg: 'h-11 px-5 text-sm gap-2.5 rounded-[var(--tertip-radius-sm)]',
};

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-[var(--tertip-accent)] text-[var(--tertip-accent-ink)] border border-transparent shadow-[var(--tertip-shadow-xs)] hover:bg-[var(--tertip-accent-hover)] active:translate-y-[0.5px]',
  secondary:
    'bg-[var(--tertip-surface)] text-[var(--tertip-ink)] border border-[var(--tertip-border)] shadow-[var(--tertip-shadow-xs)] hover:bg-[var(--tertip-surface-elevated)] hover:border-[var(--tertip-border-strong)] active:translate-y-[0.5px]',
  soft:
    'bg-[var(--tertip-accent-soft)] text-[var(--tertip-accent)] border border-[var(--tertip-accent-border)] hover:brightness-95 dark:hover:brightness-110 active:translate-y-[0.5px]',
  ghost:
    'bg-transparent text-[var(--tertip-ink-secondary)] border border-transparent hover:bg-[var(--tertip-surface-subtle)] hover:text-[var(--tertip-ink)]',
  danger:
    'bg-[var(--tertip-danger)] text-white border border-transparent shadow-[var(--tertip-shadow-xs)] hover:opacity-90 active:translate-y-[0.5px]',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      icon,
      iconRight,
      fullWidth = false,
      disabled,
      type = 'button',
      className = '',
      children,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        type={type}
        disabled={isDisabled}
        aria-busy={loading || undefined}
        className={[
          'inline-flex items-center justify-center font-medium select-none whitespace-nowrap',
          'transition-[background-color,border-color,color,transform,opacity,box-shadow] duration-150',
          'cursor-pointer disabled:cursor-not-allowed disabled:opacity-55 disabled:translate-y-0',
          sizeClasses[size],
          variantClasses[variant],
          fullWidth ? 'w-full' : '',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        {...props}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin shrink-0" aria-hidden="true" />
        ) : (
          icon && <span className="inline-flex shrink-0 items-center" aria-hidden="true">{icon}</span>
        )}
        {children && <span>{children}</span>}
        {!loading && iconRight && (
          <span className="inline-flex shrink-0 items-center" aria-hidden="true">
            {iconRight}
          </span>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
