
import type { ServiceHealthResponse } from '../types';
import { IconRefresh } from './icons';

interface HeaderProps {
  health: ServiceHealthResponse | null;
  loading: boolean;
  onRefresh: () => void;
  onLogout: () => void;
  onMenuClick: () => void;
}

export function Header({
  health,
  loading,
  onRefresh,
  onLogout,
  onMenuClick,
}: HeaderProps) {
  const isHealthy = health?.status === 'healthy';

  return (
    <header className="sticky top-0 z-40 flex h-[72px] shrink-0 items-center justify-between border-b border-slate-700/60 bg-[#161f2c] px-5 sm:px-8">
      {/* Mobile menu button */}
<button
  type="button"
  onClick={onMenuClick}
  aria-label="Open navigation"
  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-700 bg-[#1c2736] text-slate-300 transition-colors hover:bg-[#24303F] hover:text-white lg:hidden"
>
  <span className="flex w-5 flex-col gap-1">
    <span className="h-0.5 w-5 rounded bg-current" />
    <span className="h-0.5 w-5 rounded bg-current" />
    <span className="h-0.5 w-5 rounded bg-current" />
  </span>
</button>
      {/* Workspace context */}
      <div className="min-w-0">
        <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-slate-500">
          AEON / Control Plane
        </p>
        <h1 className="mt-1 truncate text-sm font-semibold text-white sm:text-base">
          Autonomous Procurement Governance
        </h1>
      </div>

      {/* Header actions */}
      <div className="ml-4 flex shrink-0 items-center gap-3">
        {/* API status */}
        <div className="hidden items-center gap-2 rounded-lg border border-slate-700 bg-[#1c2736] px-3 py-2 sm:flex">
          <span
            className={`h-2 w-2 rounded-full ${
              isHealthy ? 'bg-emerald-400' : 'bg-red-400'
            }`}
          />
          <span className="text-[11px] text-slate-400">API</span>
          <span
            className={`text-[11px] font-medium ${
              loading
                ? 'text-slate-400'
                : isHealthy
                  ? 'text-emerald-400'
                  : 'text-red-400'
            }`}
          >
            {loading ? 'Checking' : isHealthy ? 'Connected' : 'Offline'}
          </span>
        </div>

        {/* Refresh */}
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          title="Refresh service status"
          aria-label="Refresh service status"
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-700 bg-[#1c2736] text-slate-400 transition-colors hover:border-cyan-500/40 hover:text-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <IconRefresh
            className={`h-4 w-4 ${loading ? 'animate-spin text-cyan-400' : ''}`}
          />
        </button>

        {/* Sign out */}
        <button
          type="button"
          onClick={onLogout}
          className="rounded-lg border border-slate-700 bg-[#1c2736] px-3.5 py-2.5 text-[11px] font-medium text-slate-300 transition-colors hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-300"
        >
          Sign out
        </button>
      </div>
    </header>
  );
}
