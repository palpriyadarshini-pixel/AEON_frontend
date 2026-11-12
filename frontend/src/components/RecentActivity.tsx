import React, { useCallback, useEffect, useState } from 'react';
import { fetchDashboardOverview } from '../services/api';
import type { RecentActivityItem } from '../types';
import { StatusBadge } from './StatusBadge';
import { EmptyState } from './EmptyState';

export function RecentActivity() {
  const [rows, setRows] = useState<RecentActivityItem[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const result = await fetchDashboardOverview();
      setRows(result.recent_activities ?? []);
      setError('');
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'Unable to load recent activity',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), 10000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  return (
    <section className="overflow-hidden rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#181818]">
      {/* Table Header */}
      <div className="flex flex-col justify-between gap-3 border-b border-[rgba(255,255,255,0.06)] px-6 py-5 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[#EBEBEB] font-mono">
              Operational Telemetry & Event Feed
            </h2>
            <span className="h-1.5 w-1.5 rounded-full bg-[#00F0FF] telemetry-pulse" />
          </div>
          <p className="mt-1 text-xs text-[#9EA1A5]">
            Chronological audit stream of agent purchase evaluations, human decisions, and PayPal settlement events
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="rounded-lg border border-[rgba(255,255,255,0.06)] bg-[#202020] px-3 py-1 text-xs font-mono text-[#9EA1A5]">
            {rows.length} RECORDED EVENTS
          </span>
        </div>
      </div>

      {error && (
        <div className="border-b border-[rgba(239,68,68,0.2)] bg-[rgba(239,68,68,0.06)] px-6 py-3 text-xs text-[#EF4444]">
          Feed warning: {error}
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left border-collapse">
          <thead>
            <tr className="border-b border-[rgba(255,255,255,0.06)] bg-[#141414] text-[11px] font-mono uppercase tracking-wider text-[#777777]">
              <th className="px-6 py-3.5 font-medium">Timestamp</th>
              <th className="px-6 py-3.5 font-medium">Actor</th>
              <th className="px-6 py-3.5 font-medium">Action Verdict</th>
              <th className="px-6 py-3.5 font-medium">Target Entity</th>
              <th className="px-6 py-3.5 font-medium">Event Metadata</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-[rgba(255,255,255,0.04)] text-xs">
            {loading ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-xs text-[#777777] font-mono">
                  Loading telemetry feed…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-6">
                  <EmptyState
                    title="No Recent Activity"
                    description="No procurement, authorization, or settlement actions have been recorded in the current session."
                    illustration="ledger"
                  />
                </td>
              </tr>
            ) : (
              rows.slice(0, 10).map((row) => (
                <tr
                  key={row.id}
                  className="transition-colors hover:bg-[#202020]/70"
                >
                  <td className="whitespace-nowrap px-6 py-4 font-mono text-[11px] tabular-nums text-[#9EA1A5]">
                    {new Date(row.created_at).toLocaleString([], {
                      month: 'short',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="flex items-center gap-1.5 font-mono text-xs">
                      <span className="text-[#00F0FF]">[{row.actor_type}]</span>
                      <span className="truncate max-w-[120px] text-[#EBEBEB]">
                        {row.actor_id ? row.actor_id.slice(0, 8) + '…' : 'SYSTEM'}
                      </span>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <StatusBadge value={row.action} />
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 font-mono text-xs text-[#9EA1A5]">
                    <span className="text-[#777777]">{row.entity_type}: </span>
                    <span className="text-[#EBEBEB]">{row.entity_id ? row.entity_id.slice(0, 8) + '…' : '—'}</span>
                  </td>
                  <td className="px-6 py-4 max-w-xs truncate font-mono text-[11px] text-[#777777]">
                    {row.metadata_json && Object.keys(row.metadata_json).length > 0
                      ? JSON.stringify(row.metadata_json)
                      : '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
