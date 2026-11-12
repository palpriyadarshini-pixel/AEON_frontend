import React from 'react';
import type { NavigationTab, ServiceHealthResponse } from '../types';
import {
  IconShield,
  IconBot,
  IconFileText,
  IconScale,
  IconCreditCard,
  IconHistory,
  IconInbox,
} from './icons';

interface NavItem {
  id: NavigationTab;
  label: string;
  badge?: string;
  icon: (props: { className?: string }) => JSX.Element;
}

const navSections: { title: string; items: NavItem[] }[] = [
  {
    title: 'CORE PLATFORM',
    items: [
      { id: 'overview', label: 'Overview', icon: IconShield },
      { id: 'procurement', label: 'Control Plane', icon: IconFileText, badge: 'INTENTS' },
      { id: 'approvals', label: 'Approvals', icon: IconInbox },
    ],
  },
  {
    title: 'GOVERNANCE & ASSETS',
    items: [
      { id: 'agents', label: 'Agents', icon: IconBot },
      { id: 'policies', label: 'Policies', icon: IconScale },
      { id: 'budgets', label: 'Budgets', icon: IconCreditCard },
    ],
  },
  {
    title: 'FINANCIAL RECONCILIATION',
    items: [
      { id: 'transactions', label: 'Transactions', icon: IconCreditCard },
      { id: 'audit', label: 'Audit Trail', icon: IconHistory },
    ],
  },
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
    <aside className="flex h-full w-[248px] shrink-0 flex-col border-r border-[rgba(255,255,255,0.08)] bg-[#181818] text-[#EBEBEB]">
      {/* Brand Header */}
      <div className="flex h-[68px] shrink-0 items-center justify-between border-b border-[rgba(255,255,255,0.08)] px-5">
        <div className="flex items-center gap-3">
          <img
            src="/assets/aeon/aeon-mark-accent.svg"
            alt="AEON Monogram"
            width="32"
            height="32"
            className="h-8 w-8 shrink-0 rounded-lg shadow-sm"
          />
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-sm font-bold tracking-wider text-[#EBEBEB]">
                AEON
              </span>
              <span className="rounded border border-[rgba(0,240,255,0.3)] bg-[rgba(0,240,255,0.1)] px-1 py-0.2 text-[9px] font-mono text-[#00F0FF]">
                v1.0
              </span>
            </div>
            <p className="text-[10px] font-mono uppercase tracking-wider text-[#777777]">
              CONTROL PLANE
            </p>
          </div>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[#9EA1A5] transition-colors hover:bg-[#202020] hover:text-white"
          >
            <span className="text-xl leading-none">&times;</span>
          </button>
        )}
      </div>

      {/* Navigation Groups */}
      <div className="flex-1 overflow-y-auto px-3.5 py-5 space-y-6">
        {navSections.map((section) => (
          <div key={section.title}>
            <h3 className="mb-2 px-2.5 text-[10px] font-mono font-medium tracking-[0.14em] text-[#55585D]">
              {section.title}
            </h3>

            <nav className="space-y-1">
              {section.items.map((item) => {
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
                    className={`group relative flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs font-medium transition-all duration-150 ${
                      isActive
                        ? 'border border-[rgba(0,240,255,0.25)] bg-[#202020] text-[#EBEBEB] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]'
                        : 'border border-transparent text-[#9EA1A5] hover:border-[rgba(255,255,255,0.05)] hover:bg-[#1C1C1C] hover:text-[#EBEBEB]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon
                        className={`h-4 w-4 shrink-0 transition-colors ${
                          isActive
                            ? 'text-[#00F0FF]'
                            : 'text-[#777777] group-hover:text-[#9EA1A5]'
                        }`}
                      />
                      <span>{item.label}</span>
                    </div>

                    {item.badge && (
                      <span className="rounded border border-[rgba(255,255,255,0.06)] bg-[#141414] px-1.5 py-0.5 text-[9px] font-mono text-[#777777]">
                        {item.badge}
                      </span>
                    )}

                    {/* Left Accent Bar for Active State */}
                    {isActive && (
                      <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full bg-[#00F0FF]" />
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        ))}
      </div>

      {/* Persistent Footer: Governance & System Spec */}
      <div className="border-t border-[rgba(255,255,255,0.08)] bg-[#141414] p-4">
        <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#181818] p-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#777777]">
              GOVERNANCE ENGINE
            </span>
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                loading
                  ? 'bg-[#F5B942]'
                  : isHealthy
                    ? 'bg-[#1DB954]'
                    : 'bg-[#EF4444]'
              }`}
            />
          </div>
          <p className="mt-1 font-mono text-[11px] font-medium text-[#EBEBEB]">
            Policy Authorizer
          </p>
          <div className="mt-2.5 flex items-center justify-between border-t border-[rgba(255,255,255,0.04)] pt-2 text-[10px] text-[#777777] font-mono">
            <span>PayPal Orders v2</span>
            <span className="text-[#00F0FF]">LIVE</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
