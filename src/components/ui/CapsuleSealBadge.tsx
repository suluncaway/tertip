import React, { useState } from 'react';
import {
  Check,
  Copy,
  ShieldAlert,
  ShieldCheck,
  ShieldQuestion,
} from 'lucide-react';
import { Badge } from './Badge';

export type CapsuleSealStatus = 'valid' | 'invalid' | 'unverified';

export interface CapsuleSealBadgeProps {
  status: CapsuleSealStatus;
  fingerprint: string;
  createdAt?: string;
  note?: string;
  compact?: boolean;
  className?: string;
}

const STATUS_META: Record<
  CapsuleSealStatus,
  {
    label: string;
    badgeVariant: 'success' | 'danger' | 'gold';
    containerClass: string;
    icon: React.FC<{ className?: string }>;
  }
> = {
  valid: {
    label: 'Mühür Geçerli',
    badgeVariant: 'success',
    containerClass:
      'border-[var(--tertip-success-border)] bg-[var(--tertip-success-soft)]',
    icon: ShieldCheck,
  },
  invalid: {
    label: 'Mühür Bozuk — İçerik Değiştirilmiş',
    badgeVariant: 'danger',
    containerClass:
      'border-[var(--tertip-danger-border)] bg-[var(--tertip-danger-soft)]',
    icon: ShieldAlert,
  },
  unverified: {
    label: 'Doğrulanmadı',
    badgeVariant: 'gold',
    containerClass:
      'border-[var(--tertip-gold-border)] bg-[var(--tertip-gold-soft)]',
    icon: ShieldQuestion,
  },
};

export function formatShortFingerprint(raw: string): string {
  const clean = raw.replace(/[^a-fA-F0-9]/g, '').toUpperCase();
  if (!clean) return raw;
  const truncated = clean.slice(0, 24);
  return truncated.match(/.{1,4}/g)?.join('-') ?? truncated;
}

export const CapsuleSealBadge: React.FC<CapsuleSealBadgeProps> = ({
  status,
  fingerprint,
  createdAt,
  note,
  compact = false,
  className = '',
}) => {
  const [copied, setCopied] = useState(false);
  const meta = STATUS_META[status];
  const Icon = meta.icon;
  const formatted = formatShortFingerprint(fingerprint);

  const handleCopy = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(formatted);
      } else {
        const ta = document.createElement('textarea');
        ta.value = formatted;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  if (compact) {
    return (
      <div
        className={[
          'inline-flex items-center gap-2 flex-wrap rounded-[var(--tertip-radius-sm)] border px-2.5 py-1.5',
          meta.containerClass,
          className,
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <Badge
          variant={meta.badgeVariant}
          size="sm"
          icon={<Icon className="h-3.5 w-3.5" />}
        >
          {meta.label}
        </Badge>
        <code className="text-[11px] font-semibold tracking-wider text-[var(--tertip-ink)] tertip-tabular">
          {formatted}
        </code>
        <button
          type="button"
          onClick={handleCopy}
          aria-label="Parmak izini kopyala"
          className="inline-flex items-center gap-1 rounded-[var(--tertip-radius-xs)] px-1.5 py-0.5 text-[11px] font-medium text-[var(--tertip-ink-secondary)] hover:bg-[var(--tertip-surface)] transition-colors cursor-pointer"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3 text-[var(--tertip-success)]" aria-hidden="true" />
              <span>Kopyalandı</span>
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" aria-hidden="true" />
              <span>Kopyala</span>
            </>
          )}
        </button>
      </div>
    );
  }

  return (
    <div
      className={[
        'rounded-[var(--tertip-radius-md)] border p-3.5 sm:p-4',
        meta.containerClass,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Badge
            variant={meta.badgeVariant}
            size="md"
            icon={<Icon className="h-3.5 w-3.5" />}
          >
            {meta.label}
          </Badge>
          {createdAt && (
            <span className="text-[11px] text-[var(--tertip-ink-muted)] tertip-tabular">
              {createdAt}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-[var(--tertip-radius-xs)] border border-[var(--tertip-border)] bg-[var(--tertip-surface)] text-xs font-semibold text-[var(--tertip-ink)] hover:bg-[var(--tertip-surface-elevated)] transition-colors cursor-pointer"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-[var(--tertip-success)]" aria-hidden="true" />
              <span>Kopyalandı</span>
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Parmak İzini Kopyala</span>
            </>
          )}
        </button>
      </div>

      <div className="mt-2.5 rounded-[var(--tertip-radius-sm)] border border-[var(--tertip-border)] bg-[var(--tertip-surface)] px-3 py-2">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--tertip-ink-muted)]">
          SHA-256 Parmak İzi
        </div>
        <code className="mt-0.5 block text-xs sm:text-sm font-bold tracking-wider text-[var(--tertip-ink)] break-all tertip-tabular">
          {formatted}
        </code>
      </div>

      {note && (
        <p className="mt-2 text-[11.5px] leading-relaxed text-[var(--tertip-ink-secondary)]">
          {note}
        </p>
      )}
    </div>
  );
};
