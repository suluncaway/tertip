import React from 'react';
import {
  CalendarClock,
  Database,
  FileSpreadsheet,
  LayoutDashboard,
  Lock,
  Moon,
  Plus,
  ShieldCheck,
  Sparkles,
  Sun,
} from 'lucide-react';
import type { NavTab } from '../../types';
import { Button } from '../ui/Button';

export interface AppShellProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  workspaceName: string;
  sector?: string;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onUploadClick: () => void;
  isEmpty?: boolean;
  onLoadDemo?: () => void;
  badges?: Partial<Record<NavTab, number | string>>;
  headerExtra?: React.ReactNode;
  children: React.ReactNode;
}

interface NavItemConfig {
  id: NavTab;
  label: string;
  mobileLabel: string;
  shortDesc: string;
  icon: React.FC<{ className?: string }>;
}

const NAV_ITEMS: NavItemConfig[] = [
  {
    id: 'dashboard',
    label: 'Genel Bakış',
    mobileLabel: 'Özet',
    shortDesc: 'KPI, gelir ve hacim özeti',
    icon: LayoutDashboard,
  },
  {
    id: 'documents',
    label: 'Belgeler',
    mobileLabel: 'Belgeler',
    shortDesc: 'Excel, PDF, PPTX ve OCR',
    icon: FileSpreadsheet,
  },
  {
    id: 'operations',
    label: 'Operasyon & Hatırlatıcılar',
    mobileLabel: 'Operasyon',
    shortDesc: 'Bakım, SUT ve varlık takibi',
    icon: CalendarClock,
  },
  {
    id: 'assistant',
    label: 'Analiz Asistanı',
    mobileLabel: 'Asistan',
    shortDesc: 'Belge ve rakam sorgulama',
    icon: Sparkles,
  },
  {
    id: 'privacy',
    label: 'Gizlilik & Yedek',
    mobileLabel: 'Gizlilik',
    shortDesc: 'Şifreli .tertip kasa & RAM',
    icon: ShieldCheck,
  },
];

const TertipMark: React.FC<{ size?: 'sm' | 'md' }> = ({ size = 'md' }) => (
  <span
    className={[
      'inline-flex shrink-0 items-center justify-center rounded-[var(--tertip-radius-sm)] bg-[var(--tertip-accent)] text-[var(--tertip-accent-ink)] ring-1 ring-[var(--tertip-border)]/50 shadow-[var(--tertip-shadow-xs)]',
      size === 'sm' ? 'h-8 w-8' : 'h-9 w-9',
    ].join(' ')}
    aria-hidden="true"
  >
    <svg
      width={size === 'sm' ? '18' : '20'}
      height={size === 'sm' ? '18' : '20'}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="3" y="4" width="18" height="3.5" rx="1.5" fill="var(--tertip-gold)" />
      <rect x="3" y="10.25" width="7.5" height="9.75" rx="1.75" fill="currentColor" fillOpacity="0.95" />
      <rect x="13" y="10.25" width="8" height="4" rx="1.5" fill="var(--tertip-sand)" fillOpacity="0.8" />
      <rect x="13" y="16" width="8" height="4" rx="1.5" fill="var(--tertip-gold)" />
    </svg>
  </span>
);

export const AppShell: React.FC<AppShellProps> = ({
  activeTab,
  onSelectTab,
  workspaceName,
  sector,
  theme,
  onToggleTheme,
  onUploadClick,
  isEmpty = false,
  onLoadDemo,
  badges,
  headerExtra,
  children,
}) => {
  return (
    <div className="min-h-dvh flex bg-[var(--tertip-bg)] text-[var(--tertip-ink)]">
      {/* Skip to main content link for keyboard users */}
      <a
        href="#main-content"
        className="visually-hidden fixed top-3 left-3 z-50 rounded-[var(--tertip-radius-sm)] bg-[var(--tertip-accent)] px-4 py-2 text-sm font-semibold text-[var(--tertip-accent-ink)] shadow-[var(--tertip-shadow-md)]"
      >
        Ana içeriğe geç
      </a>

      {/* Desktop Left Navigation Rail (lg+) */}
      <aside className="hidden lg:flex lg:flex-col lg:w-[264px] lg:fixed lg:inset-y-0 lg:left-0 bg-[var(--tertip-surface)] border-r border-[var(--tertip-border)] z-30">
        <div className="flex h-full flex-col">
          {/* Brand Header */}
          <div className="flex items-center gap-3 px-5 h-16 border-b border-[var(--tertip-border)] shrink-0">
            <TertipMark />
            <div className="min-w-0">
              <div className="font-[var(--tertip-font-display)] text-base font-bold tracking-tight text-[var(--tertip-ink)] leading-none">
                Tertip
              </div>
              <div className="mt-1 text-[11px] font-medium text-[var(--tertip-ink-muted)] truncate">
                Yerel Operasyon Zekâsı
              </div>
            </div>
          </div>

          {/* Primary Desktop Navigation */}
          <nav aria-label="Ana menü" className="flex-1 overflow-y-auto px-3 py-4">
            <ul className="space-y-1">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                const badgeVal = badges?.[item.id];

                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => onSelectTab(item.id)}
                      aria-current={isActive ? 'page' : undefined}
                      className={[
                        'group relative w-full flex items-center gap-3 px-3 py-2.5 rounded-[var(--tertip-radius-sm)] text-left',
                        'transition-[background-color,color,box-shadow] duration-150 cursor-pointer',
                        isActive
                          ? 'bg-[var(--tertip-accent-soft)] text-[var(--tertip-accent)] font-semibold'
                          : 'text-[var(--tertip-ink-secondary)] hover:bg-[var(--tertip-surface-subtle)]/80 hover:text-[var(--tertip-ink)] font-medium',
                      ].join(' ')}
                    >
                      {isActive && (
                        <span
                          className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full bg-[var(--tertip-accent)]"
                          aria-hidden="true"
                        />
                      )}
                      <Icon
                        className={[
                          'h-[18px] w-[18px] shrink-0 transition-colors',
                          isActive
                            ? 'text-[var(--tertip-accent)]'
                            : 'text-[var(--tertip-ink-muted)] group-hover:text-[var(--tertip-ink)]',
                        ].join(' ')}
                        aria-hidden="true"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-[13.5px] leading-snug truncate">
                          {item.label}
                        </div>
                      </div>
                      {badgeVal !== undefined && badgeVal !== 0 && badgeVal !== '' && (
                        <span
                          className={[
                            'inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-[var(--tertip-radius-full)] text-[11px] font-semibold tertip-tabular',
                            isActive
                              ? 'bg-[var(--tertip-accent)] text-[var(--tertip-accent-ink)]'
                              : 'bg-[var(--tertip-surface-subtle)] text-[var(--tertip-ink-secondary)]',
                          ].join(' ')}
                        >
                          {badgeVal}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Reassuring Local-Only Footer Assurance */}
          <div className="p-3 border-t border-[var(--tertip-border)] shrink-0">
            <button
              type="button"
              onClick={() => onSelectTab('privacy')}
              className="w-full rounded-[var(--tertip-radius-sm)] border border-[var(--tertip-border)] bg-[var(--tertip-surface-elevated)] p-3 text-left transition-colors hover:border-[var(--tertip-accent-border)] cursor-pointer"
            >
              <div className="flex items-center gap-2 text-xs font-semibold text-[var(--tertip-ink)]">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[var(--tertip-success-soft)] text-[var(--tertip-success)]">
                  <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
                <span>Sıfır Sunucu Güvencesi</span>
              </div>
              <p className="mt-1.5 text-[11px] leading-relaxed text-[var(--tertip-ink-muted)]">
                Belgeleriniz tarayıcı RAM&apos;inde işlenir. Dış sunucuya tek bayt dahi gönderilmez.
              </p>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Column */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-[264px]">
        {/* Portable Mobile Top Bar (< lg) */}
        <header className="lg:hidden sticky top-0 z-20 h-14 bg-[var(--tertip-surface)]/92 backdrop-blur-md border-b border-[var(--tertip-border)] pt-[env(safe-area-inset-top)]">
          <div className="h-full px-3.5 flex items-center justify-between gap-2">
            {/* Left: Tertip Mark + Concise Title */}
            <button
              type="button"
              onClick={() => onSelectTab('dashboard')}
              className="flex items-center gap-2.5 min-w-0 text-left cursor-pointer"
            >
              <TertipMark size="sm" />
              <div className="min-w-0">
                <div className="font-[var(--tertip-font-display)] text-[14px] font-bold tracking-tight text-[var(--tertip-ink)] leading-tight truncate">
                  Tertip
                </div>
                <div className="text-[11px] font-medium text-[var(--tertip-ink-muted)] leading-tight truncate max-w-[130px] xs:max-w-[170px]">
                  {workspaceName}
                </div>
              </div>
            </button>

            {/* Right: Live Local Dot + Compact Upload + Theme Toggle */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => onSelectTab('privacy')}
                aria-label="Gizlilik durumu: %100 Yerel"
                className="inline-flex h-8 items-center gap-1.5 rounded-[var(--tertip-radius-full)] border border-[var(--tertip-success-border)] bg-[var(--tertip-success-soft)] px-2.5 text-[11px] font-semibold text-[var(--tertip-success)] cursor-pointer"
              >
                <span className="relative flex h-2 w-2 shrink-0" aria-hidden="true">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-[var(--tertip-success)] opacity-60 animate-ping" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--tertip-success)]" />
                </span>
                <span>Yerel</span>
              </button>

              <Button
                variant="primary"
                size="sm"
                icon={<Plus className="h-3.5 w-3.5" />}
                onClick={onUploadClick}
                className="h-8 px-2.5 text-xs"
              >
                Yükle
              </Button>

              <button
                type="button"
                onClick={onToggleTheme}
                aria-label={theme === 'dark' ? 'Açık temaya geç' : 'Koyu temaya geç'}
                className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--tertip-radius-xs)] border border-[var(--tertip-border)] bg-[var(--tertip-surface)] text-[var(--tertip-ink-secondary)] active:bg-[var(--tertip-surface-subtle)] transition-colors cursor-pointer"
              >
                {theme === 'dark' ? (
                  <Sun className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Moon className="h-4 w-4" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>
        </header>

        {/* Desktop Command Bar (lg+) */}
        <header className="hidden lg:block sticky top-0 z-20 h-16 bg-[var(--tertip-surface)]/90 backdrop-blur-md border-b border-[var(--tertip-border)]">
          <div className="h-full max-w-[1440px] mx-auto px-8 flex items-center justify-between gap-3">
            {/* Left: Workspace Identity */}
            <div className="flex items-center gap-3 min-w-0">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-[var(--tertip-font-display)] text-[15px] font-semibold text-[var(--tertip-ink)] truncate">
                    {workspaceName}
                  </span>
                  {sector && (
                    <span className="inline-flex items-center rounded-[var(--tertip-radius-full)] bg-[var(--tertip-surface-subtle)] px-2.5 py-0.5 text-[11px] font-medium text-[var(--tertip-ink-muted)] truncate max-w-[200px]">
                      {sector}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Live Privacy Pill + Actions + Theme Toggle */}
            <div className="flex items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => onSelectTab('privacy')}
                title="Gizlilik ve şifreli yedekleme ayarlarını görüntüle"
                className="inline-flex items-center gap-2 rounded-[var(--tertip-radius-full)] border border-[var(--tertip-success-border)] bg-[var(--tertip-success-soft)] px-3 py-1.5 text-xs font-medium text-[var(--tertip-success)] transition-opacity hover:opacity-90 cursor-pointer"
              >
                <span className="relative flex h-2 w-2 shrink-0" aria-hidden="true">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-[var(--tertip-success)] opacity-60 animate-ping" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--tertip-success)]" />
                </span>
                <span>100% Yerel · RAM Modu · 0 Sunucu</span>
              </button>

              {headerExtra}

              {isEmpty && onLoadDemo && (
                <Button
                  variant="soft"
                  size="sm"
                  icon={<Database className="h-3.5 w-3.5" />}
                  onClick={onLoadDemo}
                >
                  Örnek Veri Yükle
                </Button>
              )}

              <Button
                variant="primary"
                size="sm"
                icon={<Plus className="h-4 w-4" />}
                onClick={onUploadClick}
              >
                Belge Yükle
              </Button>

              <button
                type="button"
                onClick={onToggleTheme}
                aria-label={theme === 'dark' ? 'Açık temaya geç' : 'Koyu temaya geç'}
                title={theme === 'dark' ? 'Açık temaya geç' : 'Koyu temaya geç'}
                className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--tertip-radius-xs)] border border-[var(--tertip-border)] bg-[var(--tertip-surface)] text-[var(--tertip-ink-secondary)] hover:bg-[var(--tertip-surface-subtle)] hover:text-[var(--tertip-ink)] transition-colors cursor-pointer"
              >
                {theme === 'dark' ? (
                  <Sun className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Moon className="h-4 w-4" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>
        </header>

        {/* Main Workspace Surface (pb-24 on mobile so bottom dock never obscures content) */}
        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 w-full max-w-[1440px] mx-auto px-3.5 sm:px-6 lg:px-8 pt-4 sm:pt-6 lg:pt-8 pb-24 lg:pb-8 focus:outline-none"
        >
          {children}
        </main>
      </div>

      {/* Thumb-Friendly Mobile Bottom Navigation Dock (< lg) */}
      <nav
        aria-label="Alt menü"
        className="fixed bottom-0 inset-x-0 z-30 lg:hidden bg-[var(--tertip-surface)]/92 backdrop-blur-md border-t border-[var(--tertip-border)] shadow-[0_-6px_24px_-8px_rgba(0,0,0,0.12)] pb-[env(safe-area-inset-bottom)]"
      >
        <ul className="grid grid-cols-5 h-[62px] max-w-lg mx-auto px-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            const badgeVal = badges?.[item.id];
            const showBadge = badgeVal !== undefined && badgeVal !== 0 && badgeVal !== '';

            return (
              <li key={item.id} className="flex">
                <button
                  type="button"
                  onClick={() => onSelectTab(item.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={[
                    'relative flex flex-1 flex-col items-center justify-center gap-0.5 py-1.5 rounded-[var(--tertip-radius-sm)]',
                    'transition-colors duration-150 cursor-pointer select-none',
                    isActive
                      ? 'text-[var(--tertip-accent)] font-semibold'
                      : 'text-[var(--tertip-ink-muted)] active:text-[var(--tertip-ink)] font-medium',
                  ].join(' ')}
                >
                  <span
                    className={[
                      'relative inline-flex items-center justify-center w-11 h-7 rounded-[var(--tertip-radius-full)] transition-colors duration-150',
                      isActive ? 'bg-[var(--tertip-accent-soft)]' : 'bg-transparent',
                    ].join(' ')}
                  >
                    <Icon className="h-[19px] w-[19px] shrink-0" aria-hidden="true" />
                    {showBadge && (
                      <span
                        className={[
                          'absolute -top-1 -right-0.5 inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-[var(--tertip-radius-full)] text-[10px] font-bold leading-none tertip-tabular ring-2 ring-[var(--tertip-surface)]',
                          isActive
                            ? 'bg-[var(--tertip-accent)] text-[var(--tertip-accent-ink)]'
                            : 'bg-[var(--tertip-gold)] text-[var(--tertip-accent-ink)]',
                        ].join(' ')}
                      >
                        {badgeVal}
                      </span>
                    )}
                  </span>
                  <span className="text-[10.5px] leading-tight tracking-tight truncate max-w-full px-0.5">
                    {item.mobileLabel}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
};
