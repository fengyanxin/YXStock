import { Link, NavLink, Outlet } from 'react-router-dom';
import { GlobalSearch } from '@/components/search/GlobalSearch';

const nav = [
  { to: '/', label: '大盘' },
  { to: '/market', label: '行情' },
  { to: '/screener', label: '选股' },
  { to: '/sector', label: '板块' },
  { to: '/watchlist', label: '自选' },
];

export function AppLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 border-b border-[var(--color-border)] bg-[var(--color-surface-elevated)]/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-4 px-4 py-3">
          <Link to="/" className="text-lg font-semibold tracking-tight text-[var(--color-accent)]">
            YXStock
          </Link>
          <nav className="flex flex-wrap gap-1">
            {nav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `rounded-md px-3 py-1.5 text-sm transition-colors ${
                    isActive
                      ? 'bg-[var(--color-accent)]/20 text-[var(--color-accent)]'
                      : 'text-[var(--color-muted)] hover:text-[var(--color-text)]'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto min-w-[200px] flex-1 max-w-md">
            <GlobalSearch />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">
        <Outlet />
      </main>
      <footer className="border-t border-[var(--color-border)] px-4 py-4 text-center text-xs text-[var(--color-muted)]">
        数据仅供参考，不构成投资建议。行情来源：Stock SDK（腾讯 / 东方财富等公开接口）
      </footer>
    </div>
  );
}
