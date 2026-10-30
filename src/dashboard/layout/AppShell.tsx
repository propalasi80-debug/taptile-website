/**
 * The dashboard shell (handoff §3).
 *
 * One responsive tree rather than the separate `/m/*` route set the artboards
 * imply. The phone artboards exist because a design canvas cannot express a
 * breakpoint; duplicating eleven pages to satisfy that would mean every future
 * change lands twice. The one exception is More, which is a real route because
 * it is a screen rather than a layout state.
 *
 * Breakpoints follow §10: sidebar → 72px icon rail at 1024, → off-canvas
 * drawer at 768, → bottom tab bar below that.
 */

import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../lib/auth';
import { cn } from '../lib/cn';
import {
  MORE_ITEMS,
  MORE_ROUTE,
  NAV,
  type NavItem,
  PHONE_TABS,
  ROOT,
  titleFor,
} from './nav';
import { Avatar, IconButton, SampleChip, LiveChip, SearchField } from '../ui';
import { ChevronDown, Close, Dots, Grid, Refresh } from '../icons';

/* -------------------------------------------------------------- sidebar --- */

function NavRow({
  item,
  collapsed,
  onNavigate,
}: {
  item: NavItem;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  return (
    <NavLink
      to={item.to}
      end={item.to === ROOT}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          'flex h-9 items-center gap-[11px] rounded-chip text-[12.5px]',
          collapsed ? 'justify-center px-0' : 'px-[10px]',
          isActive
            ? "relative bg-white/[0.06] font-medium text-ink-1 before:absolute before:left-0 before:top-[9px] before:h-[18px] before:w-[2px] before:rounded-r-full before:bg-lime before:content-['']"
            : 'font-medium text-ink-nav transition-colors duration-120 hover:bg-white/[0.035] hover:text-ink-1',
        )
      }
      title={collapsed ? item.label : undefined}
    >
      {({ isActive }) => (
        <>
          <span className={isActive ? 'text-lime' : undefined}>
            <item.icon size={16} />
          </span>
          {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
          {!collapsed && item.badge !== undefined && (
            <span
              aria-label={`${item.badge} unread messages`}
              className={cn(
                'rounded-pill px-[6px] py-[1px] text-[9.5px] font-bold',
                'bg-lime/[0.16] text-lime',
              )}
            >
              {item.badge > 9 ? '9+' : item.badge}
            </span>
          )}
        </>
      )}
    </NavLink>
  );
}

function Sidebar({
  collapsed,
  onNavigate,
  searchRef,
}: {
  collapsed: boolean;
  onNavigate?: () => void;
  searchRef?: React.RefObject<HTMLDivElement>;
}) {
  const { user, signOut } = useAuth();
  const [query, setQuery] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const email = user?.email ?? 'Signed in';

  return (
    <nav
      aria-label="Primary"
      className={cn(
        'flex h-full shrink-0 flex-col border-r border-line-rail bg-rail',
        collapsed ? 'w-[72px] px-[10px] py-5' : 'w-[232px] px-[14px] py-5',
      )}
    >
      <Link
        to={ROOT}
        className={cn('flex items-center gap-[10px]', collapsed ? 'justify-center' : 'px-[6px]')}
      >
        <span
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-[6px] border border-line-strong text-[13px] font-semibold text-lime"
          aria-hidden="true"
        >
          T
        </span>
        {!collapsed && (
          <span className="min-w-0">
            <span className="block text-[13px] font-semibold text-ink-1">Taptile</span>
            <span className="block truncate text-[11px] text-ink-4">Admin</span>
          </span>
        )}
      </Link>

      {!collapsed && (
        <div className="mt-[18px]" ref={searchRef}>
          <SearchField
            value={query}
            onChange={setQuery}
            label="Search the dashboard"
            placeholder="Search"
            height={34}
            kbd="⌘K"
          />
        </div>
      )}

      <div className="mt-[18px] flex min-h-0 flex-1 flex-col gap-[3px] overflow-y-auto">
        {!collapsed && <p className="dash-eyebrow mb-[6px] px-[10px]">Dashboards</p>}
        {NAV.dashboards.map((item) => (
          <NavRow key={item.to} item={item} collapsed={collapsed} onNavigate={onNavigate} />
        ))}

        {!collapsed && <p className="dash-eyebrow mb-[6px] mt-[14px] px-[10px]">Settings</p>}
        {collapsed && <div className="my-[6px] h-px bg-line-rail" />}
        {NAV.settings.map((item) => (
          <NavRow key={item.to} item={item} collapsed={collapsed} onNavigate={onNavigate} />
        ))}
      </div>

      <div className="relative mt-3 shrink-0">
        {menuOpen && !collapsed && (
          <div className="absolute bottom-[calc(100%+6px)] left-0 right-0 overflow-hidden rounded-tile border border-line-strong bg-tile-grad shadow-card">
            <Link
              to={`${ROOT}/settings`}
              onClick={() => setMenuOpen(false)}
              className="block px-3 py-[9px] text-[12px] font-semibold text-ink-2 hover:bg-white/[0.04] hover:text-ink-1"
            >
              Profile
            </Link>
            <Link
              to="/"
              className="block px-3 py-[9px] text-[12px] font-semibold text-ink-2 hover:bg-white/[0.04] hover:text-ink-1"
            >
              Back to the site
            </Link>
            <button
              type="button"
              onClick={() => void signOut()}
              className="block w-full px-3 py-[9px] text-left text-[12px] font-semibold text-alert-text hover:bg-white/[0.04]"
            >
              Sign out
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-expanded={menuOpen}
          aria-label="Account menu"
          className={cn(
            'flex w-full items-center gap-[9px] rounded-tile border border-line-strong bg-tile-grad p-[9px] text-left transition hover:brightness-110',
            collapsed && 'justify-center p-[6px]',
          )}
        >
          <Avatar name={email} size={26} />
          {!collapsed && (
            <>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[11.5px] font-bold text-ink-1">{email}</span>
                <span className="block text-[9.5px] text-ink-4">Admin</span>
              </span>
              <span className="text-ink-4">
                <ChevronDown size={13} />
              </span>
            </>
          )}
        </button>
      </div>
    </nav>
  );
}

/* ----------------------------------------------------------- phone tabs --- */

function BottomTabs() {
  const tabs = [...PHONE_TABS, { label: 'More', to: MORE_ROUTE, icon: Dots }];
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-30 flex h-[66px] items-center justify-around border-t border-line-rail bg-rail px-2 md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.to === ROOT}
          className="flex min-h-[44px] min-w-[52px] flex-col items-center justify-center gap-[3px]"
        >
          {({ isActive }) => (
            <>
              <span
                className={cn(
                  'inline-flex h-[30px] w-[42px] items-center justify-center rounded-pill transition',
                  isActive ? 'bg-white/[0.08] text-lime' : 'text-ink-nav',
                )}
              >
                <tab.icon size={17} />
              </span>
              <span
                className={cn(
                  'text-[9.5px]',
                  isActive ? 'font-bold text-ink-1' : 'font-semibold text-ink-4',
                )}
              >
                {tab.label}
              </span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}

/* --------------------------------------------------------------- topbar --- */

function Topbar({ onOpenNav }: { onOpenNav: () => void }) {
  const { pathname } = useLocation();
  const page = titleFor(pathname);

  return (
    <header className="flex items-center justify-between gap-4 pb-[6px] pt-5">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onOpenNav}
          aria-label="Open navigation"
          className="hidden h-[34px] w-[34px] items-center justify-center rounded-chip border border-line-strong bg-tile-grad text-ink-2 md:inline-flex lg:hidden"
        >
          <Grid size={15} />
        </button>
        <nav aria-label="Breadcrumb" className="min-w-0">
          <ol className="flex items-center gap-[7px] text-[12px] text-ink-4">
            <li>Taptile</li>
            <li aria-hidden="true">/</li>
            <li className="hidden sm:block">Dashboards</li>
            <li aria-hidden="true" className="hidden sm:block">
              /
            </li>
            <li className="truncate text-ink-2">{page}</li>
          </ol>
        </nav>
      </div>

      <div className="flex shrink-0 items-center gap-[7px]">
        <IconButton icon={Refresh} label="Refresh data" onClick={() => window.location.reload()} />
      </div>
    </header>
  );
}

/* ---------------------------------------------------------- page header --- */

export function PageHeader({
  title,
  live = false,
  actions,
  description,
}: {
  title: string;
  /** Live pages read Supabase; everything else must declare itself sample. */
  live?: boolean;
  actions?: React.ReactNode;
  description?: string;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 pb-[18px] pt-[6px]">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-[10px]">
          <h1 className="dash-page-title">{title}</h1>
          {live ? <LiveChip /> : <SampleChip />}
        </div>
        {description && <p className="mt-[6px] text-[11.5px] text-ink-4">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-[7px]">{actions}</div>}
    </div>
  );
}

/** The 264px column on the right. Below 1280 it falls under the content. */
export function RightRail({ children }: { children: React.ReactNode }) {
  return (
    <aside className="flex w-full shrink-0 flex-col gap-[14px] xl:w-[264px] 2xl:w-[264px]">
      {children}
    </aside>
  );
}

/** Page body: main column plus an optional rail, stacking under 1280. */
export function PageBody({
  children,
  rail,
}: {
  children: React.ReactNode;
  rail?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-[14px] xl:flex-row">
      <div className="flex min-w-0 flex-1 flex-col gap-[14px]">{children}</div>
      {rail && <RightRail>{rail}</RightRail>}
    </div>
  );
}

/* ---------------------------------------------------------------- shell --- */

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // ⌘K / Ctrl+K focuses the sidebar search, and Esc closes the drawer.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        searchRef.current?.querySelector('input')?.focus();
      }
      if (event.key === 'Escape') setDrawerOpen(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  return (
    <div className="dash flex min-h-screen w-full">
      <a
        href="#dash-main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-chip focus:bg-lime-grad focus:px-4 focus:py-2 focus:text-[12px] focus:font-bold focus:text-lime-ink"
      >
        Skip to content
      </a>

      {/* ≥1280 full sidebar, 1024–1279 icon rail, <1024 drawer. */}
      <div className="hidden lg:block xl:hidden">
        <Sidebar collapsed />
      </div>
      <div className="hidden xl:block">
        <Sidebar collapsed={false} searchRef={searchRef} />
      </div>

      {drawerOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setDrawerOpen(false)}
            className="absolute inset-0 bg-black/60"
          />
          <div className="absolute inset-y-0 left-0 w-[232px]">
            <Sidebar collapsed={false} onNavigate={() => setDrawerOpen(false)} />
            <div className="absolute right-[-42px] top-4">
              <IconButton icon={Close} label="Close navigation" onClick={() => setDrawerOpen(false)} />
            </div>
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col px-4 pb-[86px] md:px-5 md:pb-5">
        <Topbar onOpenNav={() => setDrawerOpen(true)} />
        <main id="dash-main" className="mx-auto w-full max-w-[1200px] flex-1">
          {children}
        </main>
      </div>

      <BottomTabs />
    </div>
  );
}

export { MORE_ITEMS };
