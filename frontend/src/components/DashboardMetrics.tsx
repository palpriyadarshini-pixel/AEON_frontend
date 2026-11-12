import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from 'recharts';
import { useCallback, useEffect, useState } from 'react';
import { fetchDashboardStats, fetchSpendingSummary } from '../services/api';
import type { DashboardStatsResponse, SpendingSummaryResponse } from '../types';
import { MetricCard } from './MetricCard';
import {
  IconBot,
  IconFileText,
  IconScale,
  IconCreditCard,
} from './icons';

export function DashboardMetrics() {
  const [stats, setStats] = useState<DashboardStatsResponse | null>(null);
  const [spending, setSpending] = useState<SpendingSummaryResponse | null>(null);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    try {
      const [statsData, spendingData] = await Promise.all([
        fetchDashboardStats(),
        fetchSpendingSummary().catch(() => null),
      ]);
      setStats(statsData);
      setSpending(spendingData);
      setError('');
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'Unable to load dashboard metrics',
      );
    }
  }, []);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), 10000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  const currency = stats?.currency ?? 'USD';

  const money = (value: number) =>
    new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(value);

  const allocated = Number(stats?.total_budget_allocated ?? 0);
  const spent = Number(stats?.total_budget_spent ?? 0);
  const reserved = Number(stats?.total_budget_reserved ?? 0);
  const available = Number(stats?.total_budget_available ?? 0);

  const percentage = (value: number) =>
    allocated > 0
      ? Math.min(100, Math.max(0, (value / allocated) * 100))
      : 0;

  const chartData = [
    { name: 'Settled Spent', value: spent, color: '#1657AD' },
    { name: 'Active Reserved', value: reserved, color: '#F5B942' },
    { name: 'Available Liquidity', value: available, color: '#1DB954' },
  ].filter((item) => item.value > 0);

  return (
    <div className="space-y-6">
      {/* 4-Column KPI Strip */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Active Agents"
          value={stats?.active_agents ?? '—'}
          subtitle={`${stats?.total_agents ?? 0} registered identity keys`}
          badgeText="PostgreSQL Hash"
          badgeVariant="cyan"
          icon={IconBot}
        />

        <MetricCard
          title="Approval Backlog"
          value={stats?.pending_approvals_count ?? '—'}
          subtitle={`${stats?.total_purchases_count ?? 0} total purchase requests`}
          badgeText={stats?.pending_approvals_count ? 'Action Required' : 'Queue Cleared'}
          badgeVariant={stats?.pending_approvals_count ? 'amber' : 'emerald'}
          icon={IconFileText}
        />

        <MetricCard
          title="Budget Available"
          value={stats ? money(available) : '—'}
          subtitle={`${money(reserved)} reserved in escrow`}
          badgeText="Row-Locked Reserve"
          badgeVariant="emerald"
          icon={IconScale}
        />

        <MetricCard
          title="Settled Expenditure"
          value={stats ? money(spent) : '—'}
          subtitle={`${stats?.completed_purchases_count ?? 0} completed orders`}
          badgeText="PayPal Reconciled"
          badgeVariant="neutral"
          icon={IconCreditCard}
        />
      </div>

      {/* Financial Capital Breakdown & Allocation Stage */}
      <section className="relative overflow-hidden rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#181818] p-6 sm:p-7">
        {/* Subtle Deep Navy Atmospheric Glow from new assets */}
        <div
          className="absolute -right-20 -top-20 w-[420px] h-[420px] opacity-15 pointer-events-none rounded-full blur-2xl"
          style={{
            backgroundImage: "url('/assets/aeon/radial-glow-orb.jpeg')",
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        <div className="flex flex-col justify-between gap-3 border-b border-[rgba(255,255,255,0.06)] pb-5 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[#EBEBEB] font-mono">
              Capital Exposure & Allocation Model
            </h2>
            <p className="mt-1 text-xs text-[#9EA1A5]">
              Real-time budget reservation, authorized expenditure, and uncommitted liquidity
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded border border-[rgba(255,255,255,0.08)] bg-[#202020] px-2.5 py-1 text-[11px] font-mono text-[#9EA1A5]">
              Currency: {currency}
            </span>
          </div>
        </div>

        {!stats ? (
          <div className="py-12 text-center text-xs text-[#777777] font-mono">
            Synchronizing financial state…
          </div>
        ) : (
          <div className="mt-6 space-y-7">
            {/* 4 Financial Balances */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {[
                {
                  label: 'Total Allocated',
                  value: allocated,
                  sub: 'Base organization capital',
                  border: 'border-[rgba(255,255,255,0.08)]',
                  color: 'text-[#EBEBEB]',
                },
                {
                  label: 'Settled Spent',
                  value: spent,
                  sub: 'Captured PayPal payments',
                  border: 'border-[rgba(22,87,173,0.3)]',
                  color: 'text-[#619CBE]',
                },
                {
                  label: 'Active Reserved',
                  value: reserved,
                  sub: 'Pending approval & capture',
                  border: 'border-[rgba(245,185,66,0.3)]',
                  color: 'text-[#F5B942]',
                },
                {
                  label: 'Uncommitted Available',
                  value: available,
                  sub: 'Immediately deployable',
                  border: 'border-[rgba(29,185,84,0.3)]',
                  color: 'text-[#1DB954]',
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className={`rounded-xl border ${item.border} bg-[#202020] p-4 transition-colors`}
                >
                  <p className="text-[11px] font-medium tracking-wide uppercase text-[#9EA1A5]">
                    {item.label}
                  </p>
                  <p className={`mt-2 tabular-nums text-xl font-bold tracking-tight ${item.color}`}>
                    {money(item.value)}
                  </p>
                  <p className="mt-1 text-[10px] text-[#777777]">
                    {item.sub}
                  </p>
                </div>
              ))}
            </div>

            {/* Linear Allocation Bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono text-[#9EA1A5] uppercase text-[11px]">
                  Capital Utilization & Exposure
                </span>
                <span className="tabular-nums font-mono text-[#EBEBEB] text-xs font-semibold">
                  {percentage(spent + reserved).toFixed(1)}% COMMITTED
                </span>
              </div>

              <div
                className="flex h-2.5 w-full overflow-hidden rounded-full bg-[#121212] p-0.5 border border-[rgba(255,255,255,0.06)]"
                aria-label="Capital breakdown bar"
              >
                <div
                  className="h-full rounded-l-full bg-[#1657AD] transition-all duration-300"
                  style={{ width: `${percentage(spent)}%` }}
                  title={`Spent: ${percentage(spent).toFixed(1)}%`}
                />
                <div
                  className="h-full bg-[#F5B942] transition-all duration-300"
                  style={{ width: `${percentage(reserved)}%` }}
                  title={`Reserved: ${percentage(reserved).toFixed(1)}%`}
                />
                <div
                  className="h-full rounded-r-full bg-[#1DB954] transition-all duration-300"
                  style={{ width: `${percentage(available)}%` }}
                  title={`Available: ${percentage(available).toFixed(1)}%`}
                />
              </div>

              <div className="flex flex-wrap items-center gap-6 pt-1 text-[11px] font-mono">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[#1657AD]" />
                  <span className="text-[#9EA1A5]">Settled ({percentage(spent).toFixed(1)}%)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[#F5B942]" />
                  <span className="text-[#9EA1A5]">Reserved Escrow ({percentage(reserved).toFixed(1)}%)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[#1DB954]" />
                  <span className="text-[#9EA1A5]">Available ({percentage(available).toFixed(1)}%)</span>
                </div>
              </div>
            </div>

            {/* Donut Chart & Detailed Ledger Positions */}
            <div className="grid grid-cols-1 items-center gap-8 border-t border-[rgba(255,255,255,0.06)] pt-6 lg:grid-cols-2">
              <div className="h-[220px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={64}
                      outerRadius={92}
                      paddingAngle={4}
                      dataKey="value"
                      stroke="none"
                    >
                      {chartData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val) => money(Number(val))}
                      contentStyle={{
                        backgroundColor: '#181818',
                        borderColor: 'rgba(255,255,255,0.12)',
                        borderRadius: '10px',
                        color: '#EBEBEB',
                        fontFamily: 'monospace',
                        fontSize: '12px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-[#EBEBEB] font-mono">
                    Deterministic Reserve Ratios
                  </h3>
                  <p className="mt-0.5 text-xs text-[#777777]">
                    Governed through PostgreSQL row-level locks on budget entries
                  </p>
                </div>

                <div className="space-y-3">
                  {[
                    { label: 'Settled Spent', value: spent, color: '#1657AD' },
                    { label: 'Escrow Reserved', value: reserved, color: '#F5B942' },
                    { label: 'Free Liquidity', value: available, color: '#1DB954' },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center justify-between rounded-lg border border-[rgba(255,255,255,0.05)] bg-[#141414] px-4 py-2.5"
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-xs text-[#9EA1A5]">
                          {item.label}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="tabular-nums font-mono text-xs font-bold text-[#EBEBEB]">
                          {money(item.value)}
                        </span>
                        <span className="ml-2 tabular-nums text-[10px] font-mono text-[#777777]">
                          ({percentage(item.value).toFixed(1)}%)
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Optional Category Breakdown if present from API */}
            {spending && spending.by_category && Object.keys(spending.by_category).length > 0 && (
              <div className="border-t border-[rgba(255,255,255,0.06)] pt-5">
                <h4 className="text-[11px] font-mono uppercase tracking-wider text-[#777777] mb-3">
                  Expenditure by Category
                </h4>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(spending.by_category).map(([cat, amt]) => (
                    <div
                      key={cat}
                      className="flex items-center gap-2 rounded-lg border border-[rgba(255,255,255,0.06)] bg-[#141414] px-3 py-1.5 text-xs"
                    >
                      <span className="font-mono text-[#9EA1A5] uppercase">{cat}</span>
                      <span className="tabular-nums font-mono font-medium text-[#EBEBEB]">
                        {money(Number(amt))}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {error && (
        <div className="rounded-xl border border-[rgba(239,68,68,0.3)] bg-[rgba(239,68,68,0.08)] p-4 text-xs text-[#EF4444]">
          Telemetric sync warning: {error}
        </div>
      )}
    </div>
  );
}
