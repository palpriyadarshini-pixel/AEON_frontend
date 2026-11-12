
import type { NavigationTab, ServiceHealthResponse } from '../types';
import {
  IconShield,
  IconBot,
  IconFileText,
  IconScale,
  IconCreditCard,
  IconHistory,
} from './icons';

interface NavItem {
  id: NavigationTab;
  label: string;
  icon: (props: { className?: string }) => JSX.Element;
}

const navItems: NavItem[] = [
  { id: 'overview', label: 'Overview', icon: IconShield },
  { id: 'agents', label: 'Agents', icon: IconBot },
  { id: 'procurement', label: 'Procurement', icon: IconFileText },
  { id: 'policies', label: 'Policies', icon: IconScale },
  { id: 'transactions', label: 'Transactions', icon: IconCreditCard },
  { id: 'audit', label: 'Audit Log', icon: IconHistory },
];

interface SidebarProps {
  activeTab: NavigationTab;
  onTabChange: (tab: NavigationTab) => void;
  health: ServiceHealthResponse | null;
  loading: boolean;
  onClose?: () => void;
}

export function Sidebar({
  activeTab,
  onTabChange,
  health,
  loading,
  onClose,
}: SidebarProps) {
  const isHealthy = health?.status === 'healthy';

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-[#2E3A47] bg-[#1A222C] text-white">
      {/* Brand */}
      <div className="flex h-[72px] shrink-0 items-center justify-between border-b border-[#2E3A47] px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#3C50E0] text-white">
            <IconShield className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-wider">AEON</h1>
            <p className="text-[10px] text-slate-400">CONTROL PLANE</p>
          </div>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-[#24303F] hover:text-white"
          >
            <span className="text-2xl leading-none">&times;</span>
          </button>
        )}
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto px-4 py-7">
        <h3 className="mb-4 px-4 text-xs font-semibold uppercase text-slate-400">
          MENU
        </h3>

        <nav className="space-y-2">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onTabChange(item.id);
                  onClose?.();
                }}
                aria-current={isActive ? 'page' : undefined}
                className={`group flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-[#3C50E0] text-white'
                    : 'text-slate-400 hover:bg-[#24303F] hover:text-white'
                }`}
              >
                <Icon
                  className={`h-5 w-5 shrink-0 ${
                    isActive
                      ? 'text-white'
                      : 'text-slate-400 group-hover:text-white'
                  }`}
                />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* System Status */}
      <div className="shrink-0 border-t border-[#2E3A47] p-4">
        <div className="rounded-lg border border-[#2E3A47] bg-[#24303F] p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-semibold text-white">
              System Status
            </span>
            <span
              className={`h-2 w-2 rounded-full ${
                isHealthy ? 'bg-green-400' : 'bg-red-400'
              }`}
            />
          </div>

          {loading ? (
            <p className="text-xs text-slate-400">Checking service...</p>
          ) : health ? (
            <div className="space-y-2 text-xs">
              <div className="flex justify-between gap-2">
                <span className="text-slate-400">Service</span>
                <span className="truncate text-slate-200">
                  {health.app ?? health.service ?? 'AEON API'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Version</span>
                <span className="text-slate-200">
                  {health.version ?? 'v1'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Environment</span>
                <span className="capitalize text-slate-200">
                  {health.environment ?? 'unknown'}
                </span>
              </div>
              <div className="border-t border-[#2E3A47] pt-3">
                <span className={isHealthy ? 'text-green-400' : 'text-red-400'}>
                  {isHealthy ? '● Operational' : '● Degraded'}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-red-400">Backend unreachable</p>
          )}
        </div>
      </div>
    </aside>
  );
}
