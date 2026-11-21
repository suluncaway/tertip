import React, { useEffect, useState } from 'react';
import {
  CalendarClock,
  Database,
  FileSpreadsheet,
  LayoutDashboard,
  Lock,
  Menu,
  Moon,
  Plus,
  ShieldCheck,
  Sparkles,
  Sun,
  X,
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
  shortDesc: string;
  icon: React.FC<{ className?: string }>;
}

const NAV_ITEMS: NavItemConfig[] = [
  {
    id: 'dashboard',
    label: 'Genel Bakış',
    shortDesc: 'KPI, gelir ve hacim özeti',
    icon: LayoutDashboard,
  },
  {
    id: 'documents',
    label: 'Belgeler',
    shortDesc: 'Excel, PDF, PPTX ve OCR',
    icon: FileSpreadsheet,
  },
  {
    id: 'operations',
    label: 'Operasyon & Hatırlatıcılar',
    shortDesc: 'Bakım, SUT ve varlık takibi',
    icon: CalendarClock,
  },
  {
    id: 'assistant',
    label: 'Analiz Asistanı',
    shortDesc: 'Belge ve rakam sorgulama',
    icon: Sparkles,
  },
  {
    id: 'privacy',
    label: 'Gizlilik & Yedek',
    shortDesc: 'Şifreli .tertip kasa & RAM',
    icon: ShieldCheck,
  },
];

const TertipMark: React.FC = () => (
  <span
    className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--tertip-radius-sm)] bg-[var(--tertip-accent)] text-[var(--tertip-accent-ink)] ring-1 ring-[var(--tertip-border)]/50 shadow-[var(--tertip-shadow-xs)]"
    aria-hidden="true"
  >
    <svg
      width="20"
      height="20"
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileMenuOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileMenuOpen]);

  const handleNavSelect = (tab: NavTab) => {
    onSelectTab(tab);
    setMobileMenuOpen(false);
  };

  const renderSidebarContent = () => (
    <div className="flex h-full flex-col">
      {/* Brand Header */}
      <div className="flex items-center justify-between gap-2 px-5 h-16 border-b border-[var(--tertip-border)] shrink-0">
        <div className="flex items-center gap-3 min-w-0">
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

        <button
          type="button"
          onClick={() => setMobileMenuOpen(false)}
          aria-label="Menüyü kapat"
          className="lg:hidden inline-flex h-8 w-8 items-center justify-center rounded-[var(--tertip-radius-xs)] text-[var(--tertip-ink-muted)] hover:bg-[var(--tertip-surface-subtle)] hover:text-[var(--tertip-ink)] cursor-pointer"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      {/* Primary Navigation */}
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
                  onClick={() => handleNavSelect(item.id)}
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
          onClick={() => handleNavSelect('privacy')}
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
  );

  return (
    <div className="min-h-dvh flex bg-[var(--tertip-bg)] text-[var(--tertip-ink)]">
      {/* Skip to main content link for keyboard users */}
      <a
        href="#main-content"
        className="visually-hidden fixed top-3 left-3 z-50 rounded-[var(--tertip-radius-sm)] bg-[var(--tertip-accent)] px-4 py-2 text-sm font-semibold text-[var(--tertip-accent-ink)] shadow-[var(--tertip-shadow-md)]"
      >
        Ana içeriğe geç
      </a>

      {/* Desktop Left Navigation Rail */}
      <aside className="hidden lg:flex lg:flex-col lg:w-[264px] lg:fixed lg:inset-y-0 lg:left-0 bg-[var(--tertip-surface)] border-r border-[var(--tertip-border)] z-30">
        {renderSidebarContent()}
      </aside>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden flex">
          <div
            className="fixed inset-0 bg-[var(--tertip-backdrop)] backdrop-blur-[2px]"
            aria-hidden="true"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="relative z-10 flex w-[280px] max-w-[85vw] flex-col bg-[var(--tertip-surface)] border-r border-[var(--tertip-border)] shadow-[var(--tertip-shadow-lg)]">
            {renderSidebarContent()}
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-[264px]">
        {/* Top Command Bar */}
        <header className="sticky top-0 z-20 h-16 bg-[var(--tertip-surface)]/90 backdrop-blur-md border-b border-[var(--tertip-border)]">
          <div className="h-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-3">
            {/* Left: Mobile Trigger + Workspace Identity */}
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                aria-expanded={mobileMenuOpen}
                aria-label="Menüyü aç"
                className="lg:hidden inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--tertip-radius-sm)] border border-[var(--tertip-border)] bg-[var(--tertip-surface)] text-[var(--tertip-ink)] hover:bg-[var(--tertip-surface-subtle)] cursor-pointer"
              >
                <Menu className="h-4 w-4" aria-hidden="true" />
              </button>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-[var(--tertip-font-display)] text-sm sm:text-[15px] font-semibold text-[var(--tertip-ink)] truncate">
                    {workspaceName}
                  </span>
                  {sector && (
                    <span className="hidden sm:inline-flex items-center rounded-[var(--tertip-radius-full)] bg-[var(--tertip-surface-subtle)] px-2 py-0.5 text-[11px] font-medium text-[var(--tertip-ink-muted)] truncate max-w-[180px]">
                      {sector}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Live Privacy Pill + Actions + Theme Toggle */}
            <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
              {/* Reassuring Live Privacy Pill */}
              <button
                type="button"
                onClick={() => onSelectTab('privacy')}
                title="Gizlilik ve şifreli yedekleme ayarlarını görüntüle"
                className="hidden md:inline-flex items-center gap-2 rounded-[var(--tertip-radius-full)] border border-[var(--tertip-success-border)] bg-[var(--tertip-success-soft)] px-3 py-1.5 text-xs font-medium text-[var(--tertip-success)] transition-opacity hover:opacity-90 cursor-pointer"
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
                  className="hidden sm:inline-flex"
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
                <span className="hidden xs:inline sm:inline">Belge Yükle</span>
                <span className="sm:hidden">Yükle</span>
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

        {/* Main Workspace Surface */}
        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 focus:outline-none"
        >
          {children}
        </main>
      </div>
    </div>
  );
};
