import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from 'recharts';
import { useCallback, useEffect, useState } from 'react';
import { fetchDashboardStats } from '../services/api';
import { MetricCard } from './MetricCard';
import {
  IconBot,
  IconFileText,
  IconScale,
  IconCreditCard,
} from './icons';

export function DashboardMetrics() {
  const [stats, setStats] = useState<any>(null);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    try {
      setStats(await fetchDashboardStats());
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
    const timer = window.setInterval(() => void refresh(), 8000);
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

  return (
    <div className="space-y-6">
      {/* Statistic cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Active Agents"
          value={stats?.active_agents ?? '—'}
          subtitle={`${stats?.total_agents ?? 0} registered agents`}
          badgeText="Database-backed"
          badgeVariant="neutral"
          icon={IconBot}
        />

        <MetricCard
          title="Pending Approvals"
          value={stats?.pending_approvals_count ?? '—'}
          subtitle={`${stats?.total_purchases_count ?? 0} total purchases`}
          badgeText="Approval queue"
          badgeVariant="warning"
          icon={IconFileText}
        />

        <MetricCard
          title="Budget Available"
          value={stats ? money(available) : '—'}
          subtitle={`${money(reserved)} reserved`}
          badgeText="Atomic budget"
          badgeVariant="success"
          icon={IconScale}
        />

        <MetricCard
          title="Budget Spent"
          value={stats ? money(spent) : '—'}
          subtitle={`${stats?.completed_purchases_count ?? 0} completed purchases`}
          badgeText="Ledger-backed"
          badgeVariant="cyan"
          icon={IconCreditCard}
        />
      </div>

      {/* Financial overview */}
      <section className="rounded-xl border border-[#2E3A47] bg-[#1A222C] p-5 sm:p-6">
        <div className="mb-6">
          <h2 className="text-base font-semibold text-white">
            Financial Overview
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            Budget allocation and utilization across AEON
          </p>
        </div>

        {!stats ? (
          <p className="text-sm text-slate-400">
            Loading financial information...
          </p>
        ) : (
          <>
            <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
              {[
                {
                  label: 'Total Allocated',
                  value: allocated,
                  color: 'text-white',
                },
                {
                  label: 'Spent',
                  value: spent,
                  color: 'text-blue-400',
                },
                {
                  label: 'Reserved',
                  value: reserved,
                  color: 'text-amber-400',
                },
                {
                  label: 'Available',
                  value: available,
                  color: 'text-emerald-400',
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-lg border border-[#2E3A47] bg-[#24303F]/60 p-4"
                >
                  <p className="text-xs text-slate-400">
                    {item.label}
                  </p>
                  <p className={`mt-2 text-lg font-semibold ${item.color}`}>
                    {money(item.value)}
                  </p>
                </div>
              ))}
            </div>

            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-medium text-slate-300">
                Budget utilization
              </span>
              <span className="text-xs text-slate-400">
                {percentage(spent + reserved).toFixed(1)}%
              </span>
            </div>

            <div
              className="flex h-3 w-full overflow-hidden rounded-full bg-[#0F172A]"
              aria-label="Budget allocation breakdown"
            >
              <div
                className="h-full bg-blue-500"
                style={{ width: `${percentage(spent)}%` }}
              />
              <div
                className="h-full bg-amber-400"
                style={{ width: `${percentage(reserved)}%` }}
              />
              <div
                className="h-full bg-emerald-500"
                style={{ width: `${percentage(available)}%` }}
              />
            </div>

<div className="mt-8 grid grid-cols-1 items-center gap-8 lg:grid-cols-2">
  <div className="h-[260px] w-full">
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={[
            { name: 'Spent', value: spent },
            { name: 'Reserved', value: reserved },
            { name: 'Available', value: available },
          ].filter((item) => item.value > 0)}
          cx="50%"
          cy="50%"
          innerRadius={72}
          outerRadius={100}
          paddingAngle={4}
          dataKey="value"
          stroke="none"
        >
          <Cell fill="#3C50E0" />
          <Cell fill="#F59E0B" />
          <Cell fill="#10B981" />
        </Pie>
        <Tooltip
          formatter={(value) => money(Number(value))}
          contentStyle={{
            backgroundColor: '#1A222C',
            border: '1px solid #2E3A47',
            borderRadius: '8px',
            color: '#FFFFFF',
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  </div>

  <div className="space-y-5">
    <div>
      <p className="text-sm font-semibold text-white">
        Budget distribution
      </p>
      <p className="mt-1 text-xs text-slate-400">
        Current allocation breakdown
      </p>
    </div>

    {[
      { label: 'Spent', value: spent, color: '#3C50E0' },
      { label: 'Reserved', value: reserved, color: '#F59E0B' },
      { label: 'Available', value: available, color: '#10B981' },
    ].map((item) => (
      <div key={item.label} className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span
            className="h-3 w-3 rounded-full"
            style={{ backgroundColor: item.color }}
          />
          <span className="text-sm text-slate-300">
            {item.label}
          </span>
        </div>

        <div className="text-right">
          <p className="text-sm font-semibold text-white">
            {money(item.value)}
          </p>
          <p className="text-[11px] text-slate-500">
            {percentage(item.value).toFixed(1)}%
          </p>
        </div>
      </div>
    ))}
  </div>
</div>

            <div className="mt-5 flex flex-wrap gap-x-6 gap-y-3">
              {[
                { label: 'Spent', color: 'bg-blue-500' },
                { label: 'Reserved', color: 'bg-amber-400' },
                { label: 'Available', color: 'bg-emerald-500' },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-center gap-2"
                >
                  <span className={`h-2.5 w-2.5 rounded-full ${item.color}`} />
                  <span className="text-xs text-slate-400">
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      {error && (
        <p className="text-xs text-amber-300">
          Metrics unavailable: {error}
        </p>
      )}
    </div>
  );
}
