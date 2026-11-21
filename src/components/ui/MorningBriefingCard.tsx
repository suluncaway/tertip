import React, { useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  CalendarClock,
  Check,
  CheckCircle2,
  Clock,
  Sparkles,
} from 'lucide-react';
import type { ReminderItem } from '../../types';
import { Badge } from './Badge';

export interface MorningBriefingCardProps {
  workspaceName: string;
  dateLabel?: string;
  headline?: string;
  reminders: ReminderItem[];
  onCompleteReminder: (id: string) => void;
  onSelectReminder?: (reminder: ReminderItem) => void;
  onViewAllOperations?: () => void;
  actions?: React.ReactNode;
  className?: string;
}

const CATEGORY_LABELS: Record<ReminderItem['category'], string> = {
  maintenance: 'Bakım',
  sut: 'SUT / Mevzuat',
  finance: 'Finans',
  meeting: 'Toplantı',
  other: 'Operasyon',
};

function formatTurkishToday(): string {
  try {
    return new Intl.DateTimeFormat('tr-TR', {
      day: 'numeric',
      month: 'long',
      weekday: 'long',
    }).format(new Date());
  } catch {
    return 'Bugün';
  }
}

function getRelativeDueInfo(dueDate: string): {
  label: string;
  tone: 'danger' | 'warning' | 'accent' | 'neutral';
  daysDiff: number;
} {
  const parsed = new Date(dueDate);
  if (Number.isNaN(parsed.getTime())) {
    return { label: dueDate, tone: 'neutral', daysDiff: 999 };
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(parsed);
  target.setHours(0, 0, 0, 0);
  const diffDays = Math.round((target.getTime() - today.getTime()) / 86_400_000);

  if (diffDays < 0) {
    return { label: `${Math.abs(diffDays)} gün gecikti`, tone: 'danger', daysDiff: diffDays };
  }
  if (diffDays === 0) {
    return { label: 'Bugün son gün', tone: 'danger', daysDiff: 0 };
  }
  if (diffDays === 1) {
    return { label: 'Yarın', tone: 'warning', daysDiff: 1 };
  }
  if (diffDays <= 7) {
    return { label: `${diffDays} gün kaldı`, tone: 'warning', daysDiff: diffDays };
  }
  return {
    label: new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'short' }).format(target),
    tone: 'accent',
    daysDiff: diffDays,
  };
}

interface SwipeableTimelineCardProps {
  reminder: ReminderItem;
  onComplete: (id: string) => void;
  onSelect?: (reminder: ReminderItem) => void;
}

const SwipeableTimelineCard: React.FC<SwipeableTimelineCardProps> = ({
  reminder,
  onComplete,
  onSelect,
}) => {
  const startXRef = useRef<number | null>(null);
  const startYRef = useRef<number | null>(null);
  const [offsetX, setOffsetX] = useState(0);
  const [swiping, setSwiping] = useState(false);

  const due = getRelativeDueInfo(reminder.dueDate);

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    const touch = e.touches[0];
    if (!touch) return;
    startXRef.current = touch.clientX;
    startYRef.current = touch.clientY;
    setSwiping(false);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    const touch = e.touches[0];
    if (!touch || startXRef.current === null || startYRef.current === null) return;
    const dx = touch.clientX - startXRef.current;
    const dy = Math.abs(touch.clientY - startYRef.current);

    if (dx > 12 && dx > dy * 1.4) {
      setSwiping(true);
      setOffsetX(Math.min(dx, 108));
    } else if (!swiping) {
      setOffsetX(0);
    }
  };

  const handleTouchEnd = () => {
    if (offsetX >= 68) {
      onComplete(reminder.id);
    }
    startXRef.current = null;
    startYRef.current = null;
    setOffsetX(0);
    setSwiping(false);
  };

  const priorityDotColor =
    reminder.priority === 'high'
      ? 'bg-[var(--tertip-danger)]'
      : reminder.priority === 'medium'
        ? 'bg-[var(--tertip-gold)]'
        : 'bg-[var(--tertip-accent)]';

  return (
    <div className="relative snap-start shrink-0 w-[236px] sm:w-[258px] rounded-[var(--tertip-radius-md)] overflow-hidden">
      {/* Swipe reveal background */}
      <div
        aria-hidden="true"
        className="absolute inset-0 flex items-center pl-4 bg-[var(--tertip-success)] text-white text-xs font-semibold gap-1.5"
      >
        <Check className="h-4 w-4" />
        <span>Tamamla</span>
      </div>

      {/* Foreground card */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          transform: offsetX > 0 ? `translateX(${offsetX}px)` : undefined,
          transition: swiping ? 'none' : 'transform 180ms var(--tertip-ease)',
        }}
        className="relative h-full flex flex-col justify-between gap-2.5 p-3.5 rounded-[var(--tertip-radius-md)] border border-[var(--tertip-border)] bg-[var(--tertip-surface)] shadow-[var(--tertip-shadow-xs)]"
      >
        <div>
          <div className="flex items-center justify-between gap-2">
            <Badge
              variant={
                due.tone === 'danger'
                  ? 'danger'
                  : due.tone === 'warning'
                    ? 'gold'
                    : 'accent'
              }
              size="sm"
            >
              {due.label}
            </Badge>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[var(--tertip-ink-muted)]">
              <span className={`h-2 w-2 rounded-full ${priorityDotColor}`} aria-hidden="true" />
              {CATEGORY_LABELS[reminder.category]}
            </span>
          </div>

          {onSelect ? (
            <button
              type="button"
              onClick={() => onSelect(reminder)}
              className="mt-2 block w-full text-left text-[13px] font-semibold text-[var(--tertip-ink)] leading-snug line-clamp-2 hover:text-[var(--tertip-accent)] transition-colors cursor-pointer"
            >
              {reminder.title}
            </button>
          ) : (
            <h4 className="mt-2 text-[13px] font-semibold text-[var(--tertip-ink)] leading-snug line-clamp-2">
              {reminder.title}
            </h4>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 pt-2 border-t border-[var(--tertip-border)]/70">
          <span className="inline-flex items-center gap-1 text-[11px] text-[var(--tertip-ink-muted)] tertip-tabular">
            <Clock className="h-3 w-3 shrink-0" aria-hidden="true" />
            {reminder.dueDate}
          </span>
          <button
            type="button"
            onClick={() => onComplete(reminder.id)}
            className="inline-flex items-center gap-1 rounded-[var(--tertip-radius-xs)] px-2 py-1 text-[11px] font-semibold text-[var(--tertip-accent)] bg-[var(--tertip-accent-soft)] hover:brightness-95 transition cursor-pointer"
          >
            <Check className="h-3 w-3" aria-hidden="true" />
            <span>Tamamla</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export const MorningBriefingCard: React.FC<MorningBriefingCardProps> = ({
  workspaceName,
  dateLabel,
  headline,
  reminders,
  onCompleteReminder,
  onSelectReminder,
  onViewAllOperations,
  actions,
  className = '',
}) => {
  const pendingReminders = useMemo(() => {
    return reminders
      .filter((r) => !r.completed)
      .slice()
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  }, [reminders]);

  const urgentCount = useMemo(
    () =>
      pendingReminders.filter(
        (r) => r.priority === 'high' || getRelativeDueInfo(r.dueDate).daysDiff <= 7
      ).length,
    [pendingReminders]
  );

  const completedCount = reminders.length - pendingReminders.length;
  const resolvedDate = dateLabel ?? formatTurkishToday();

  const resolvedHeadline =
    headline ??
    (pendingReminders.length === 0
      ? `${workspaceName} için bekleyen kritik bir aksiyon bulunmuyor — tüm operasyonlar tertipli.`
      : urgentCount > 0
        ? `${workspaceName} gündeminde ${urgentCount} öncelikli aksiyon dahil toplam ${pendingReminders.length} açık takip maddesi var.`
        : `${workspaceName} için planlı ${pendingReminders.length} operasyon maddesi sırada bekliyor.`);

  return (
    <section
      aria-label="Bugünün Tertibi"
      className={[
        'rounded-[var(--tertip-radius-lg)] border border-[var(--tertip-border)] bg-[var(--tertip-surface)] shadow-[var(--tertip-shadow-sm)] overflow-hidden',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {/* Editorial Header Band */}
      <div className="px-4 sm:px-6 pt-4 sm:pt-5 pb-4 bg-gradient-to-br from-[var(--tertip-accent-soft)] via-[var(--tertip-surface)] to-[var(--tertip-gold-soft)] border-b border-[var(--tertip-border)]/80">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.09em] text-[var(--tertip-accent)]">
                <Sparkles className="h-3.5 w-3.5 text-[var(--tertip-gold)]" aria-hidden="true" />
                Bugünün Tertibi
              </span>
              <span className="text-[var(--tertip-border-strong)]" aria-hidden="true">
                ·
              </span>
              <span className="text-xs font-medium text-[var(--tertip-ink-muted)] capitalize">
                {resolvedDate}
              </span>
            </div>

            <p className="mt-1.5 font-[var(--tertip-font-display)] text-sm sm:text-[15.5px] font-semibold text-[var(--tertip-ink)] leading-snug max-w-3xl">
              {resolvedHeadline}
            </p>
          </div>

          {actions && (
            <div className="flex items-center gap-2 shrink-0 flex-wrap">{actions}</div>
          )}
        </div>
      </div>

      {/* Horizontally Scrollable Operations Timeline Strip */}
      <div className="px-4 sm:px-6 py-4 bg-[var(--tertip-surface-elevated)]/55">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-[var(--tertip-ink-secondary)]">
            <CalendarClock className="h-3.5 w-3.5 text-[var(--tertip-accent)]" aria-hidden="true" />
            <span>Operasyon Zaman Çizelgesi</span>
            {completedCount > 0 && (
              <Badge variant="success" size="sm">
                {completedCount} tamamlandı
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-3">
            <span className="sm:hidden text-[10.5px] text-[var(--tertip-ink-muted)]">
              Sağa kaydır → Tamamla
            </span>
            {onViewAllOperations && (
              <button
                type="button"
                onClick={onViewAllOperations}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--tertip-accent)] hover:underline cursor-pointer"
              >
                <span>Tümü</span>
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>

        {pendingReminders.length === 0 ? (
          <div className="flex items-center gap-2.5 rounded-[var(--tertip-radius-md)] border border-[var(--tertip-success-border)] bg-[var(--tertip-success-soft)] px-4 py-3 text-xs sm:text-sm font-medium text-[var(--tertip-success)]">
            <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>Bugün için bekleyen kritik aksiyon yok — her şey tertipli.</span>
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1 snap-x snap-mandatory">
            {pendingReminders.slice(0, 8).map((reminder) => (
              <SwipeableTimelineCard
                key={reminder.id}
                reminder={reminder}
                onComplete={onCompleteReminder}
                onSelect={onSelectReminder}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
