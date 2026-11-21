import React from 'react';
import {
  Building2,
  Check,
  HardHat,
  Layers,
  ShoppingBag,
  UtensilsCrossed,
} from 'lucide-react';
import { Badge } from './Badge';

export interface SectorPackOption {
  id: string;
  name: string;
  badge?: string;
  description?: string;
  icon?: 'hospital' | 'restaurant' | 'construction' | 'ecommerce' | React.ReactNode;
}

export interface SectorPackPickerProps {
  packs: SectorPackOption[];
  activePackId?: string | null;
  onSelectPack: (packId: string) => void;
  variant?: 'pills' | 'cards';
  title?: string;
  subtitle?: string;
  className?: string;
}

function renderSectorIcon(pack: SectorPackOption): React.ReactNode {
  if (pack.icon && typeof pack.icon !== 'string') {
    return pack.icon;
  }

  const key = typeof pack.icon === 'string' ? pack.icon : pack.id.toLowerCase();

  if (key.includes('hastane') || key.includes('hospital') || key.includes('saglik')) {
    return <Building2 className="h-4 w-4" aria-hidden="true" />;
  }
  if (key.includes('restoran') || key.includes('restaurant') || key.includes('gida')) {
    return <UtensilsCrossed className="h-4 w-4" aria-hidden="true" />;
  }
  if (key.includes('santiye') || key.includes('construction') || key.includes('insaat')) {
    return <HardHat className="h-4 w-4" aria-hidden="true" />;
  }
  if (key.includes('eticaret') || key.includes('ecommerce') || key.includes('magaza')) {
    return <ShoppingBag className="h-4 w-4" aria-hidden="true" />;
  }

  return <Layers className="h-4 w-4" aria-hidden="true" />;
}

export const SectorPackPicker: React.FC<SectorPackPickerProps> = ({
  packs,
  activePackId,
  onSelectPack,
  variant = 'pills',
  title,
  subtitle,
  className = '',
}) => {
  if (variant === 'pills') {
    return (
      <div className={className}>
        {(title || subtitle) && (
          <div className="mb-2 flex items-baseline justify-between gap-2 flex-wrap">
            {title && (
              <span className="text-xs font-semibold uppercase tracking-wide text-[var(--tertip-ink-muted)]">
                {title}
              </span>
            )}
            {subtitle && (
              <span className="text-[11px] text-[var(--tertip-ink-muted)]">
                {subtitle}
              </span>
            )}
          </div>
        )}

        <div
          role="group"
          aria-label={title ?? 'Sektör paketi seçici'}
          className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-0.5"
        >
          {packs.map((pack) => {
            const isActive = activePackId === pack.id;
            return (
              <button
                key={pack.id}
                type="button"
                onClick={() => onSelectPack(pack.id)}
                aria-pressed={isActive}
                className={[
                  'inline-flex shrink-0 items-center gap-2 h-9 px-3.5 rounded-[var(--tertip-radius-full)] border text-xs font-semibold transition-[background-color,border-color,color,box-shadow] duration-150 cursor-pointer whitespace-nowrap',
                  isActive
                    ? 'bg-[var(--tertip-accent)] text-[var(--tertip-accent-ink)] border-transparent shadow-[var(--tertip-shadow-xs)]'
                    : 'bg-[var(--tertip-surface)] text-[var(--tertip-ink-secondary)] border-[var(--tertip-border)] hover:border-[var(--tertip-border-strong)] hover:bg-[var(--tertip-surface-elevated)] hover:text-[var(--tertip-ink)]',
                ].join(' ')}
              >
                <span className="shrink-0 opacity-90">{renderSectorIcon(pack)}</span>
                <span>{pack.name}</span>
                {pack.badge && !isActive && (
                  <span className="hidden sm:inline-block rounded-full bg-[var(--tertip-gold-soft)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--tertip-gold)]">
                    {pack.badge}
                  </span>
                )}
                {isActive && <Check className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      {(title || subtitle) && (
        <div className="mb-3">
          {title && (
            <h3 className="font-[var(--tertip-font-display)] text-sm sm:text-base font-semibold text-[var(--tertip-ink)]">
              {title}
            </h3>
          )}
          {subtitle && (
            <p className="mt-0.5 text-xs text-[var(--tertip-ink-muted)]">
              {subtitle}
            </p>
          )}
        </div>
      )}

      <div
        role="group"
        aria-label={title ?? 'Sektör paketi seçici'}
        className="flex sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-3 overflow-x-auto sm:overflow-visible no-scrollbar pb-1 sm:pb-0 snap-x snap-mandatory"
      >
        {packs.map((pack) => {
          const isActive = activePackId === pack.id;

          return (
            <button
              key={pack.id}
              type="button"
              onClick={() => onSelectPack(pack.id)}
              aria-pressed={isActive}
              className={[
                'group snap-start shrink-0 w-[220px] sm:w-auto flex flex-col justify-between text-left rounded-[var(--tertip-radius-md)] border p-4 transition-[border-color,background-color,box-shadow,transform] duration-150 cursor-pointer',
                isActive
                  ? 'border-[var(--tertip-accent)] bg-[var(--tertip-accent-soft)] shadow-[var(--tertip-shadow-sm)]'
                  : 'border-[var(--tertip-border)] bg-[var(--tertip-surface)] hover:border-[var(--tertip-border-strong)] hover:shadow-[var(--tertip-shadow-sm)] hover:-translate-y-[1px]',
              ].join(' ')}
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={[
                      'inline-flex h-9 w-9 items-center justify-center rounded-[var(--tertip-radius-sm)]',
                      isActive
                        ? 'bg-[var(--tertip-accent)] text-[var(--tertip-accent-ink)]'
                        : 'bg-[var(--tertip-surface-subtle)] text-[var(--tertip-accent)] group-hover:bg-[var(--tertip-accent-soft)]',
                    ].join(' ')}
                  >
                    {renderSectorIcon(pack)}
                  </span>

                  {isActive ? (
                    <Badge variant="accent" size="sm" icon={<Check className="h-3 w-3" />}>
                      Aktif
                    </Badge>
                  ) : (
                    pack.badge && (
                      <Badge variant="gold" size="sm">
                        {pack.badge}
                      </Badge>
                    )
                  )}
                </div>

                <div className="mt-3 font-[var(--tertip-font-display)] text-sm font-semibold text-[var(--tertip-ink)]">
                  {pack.name}
                </div>

                {pack.description && (
                  <p className="mt-1 text-xs text-[var(--tertip-ink-muted)] leading-relaxed line-clamp-2">
                    {pack.description}
                  </p>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
