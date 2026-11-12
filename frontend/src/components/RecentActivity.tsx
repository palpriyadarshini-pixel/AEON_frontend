
import { useCallback, useEffect, useState } from 'react';
import { fetchDashboardOverview } from '../services/api';
import { IconInbox } from './icons';

export function RecentActivity() {
  const [rows, setRows] = useState<any[]>([]);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    try {
      const result = await fetchDashboardOverview();
      setRows(result.recent_activities ?? []);
      setError('');
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'Unable to load recent activity',
      );
    }
  }, []);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), 10000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  const actionColor = (action: string) => {
    if (action.includes('APPROVED') || action.includes('SETTLED')) {
      return 'bg-emerald-500/10 text-emerald-400';
    }
    if (action.includes('REJECTED') || action.includes('BLOCKED')) {
      return 'bg-red-500/10 text-red-400';
    }
    if (action.includes('RESERVED') || action.includes('REQUESTED')) {
      return 'bg-blue-500/10 text-blue-400';
    }
    return 'bg-slate-700/50 text-slate-300';
  };

  return (
    <section className="overflow-hidden rounded-xl border border-[#2E3A47] bg-[#1A222C]">
      {/* Heading */}
      <div className="flex flex-col justify-between gap-3 border-b border-[#2E3A47] px-5 py-5 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-base font-semibold text-white">
            Recent Activity
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            Latest procurement, approval and financial events
          </p>
        </div>

        <span className="w-fit rounded-full bg-[#24303F] px-3 py-1.5 text-xs text-slate-300">
          {rows.length} events
        </span>
      </div>

      {error && (
        <p className="border-b border-[#2E3A47] px-5 py-3 text-xs text-amber-300">
          {error}
        </p>
      )}

      {/* Activity table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left">
          <thead className="bg-[#24303F]">
            <tr className="text-xs font-medium text-slate-400">
              <th className="px-5 py-4">Timestamp</th>
              <th className="px-5 py-4">Actor</th>
              <th className="px-5 py-4">Action</th>
              <th className="px-5 py-4">Entity</th>
              <th className="px-5 py-4">Metadata</th>
            </tr>
          </thead>

          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center">
                  <div className="flex flex-col items-center gap-2 text-slate-500">
                    <IconInbox className="h-7 w-7" />
                    <p className="text-sm text-slate-300">
                      No recent activity recorded
                    </p>
                    <p className="text-xs">
                      New events will appear here
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              rows.slice(0, 8).map((row) => (
                <tr
                  key={row.id}
                  className="border-t border-[#2E3A47] text-xs text-slate-300 transition-colors hover:bg-[#24303F]/60"
                >
                  <td className="whitespace-nowrap px-5 py-4 text-slate-400">
                    {new Date(row.created_at).toLocaleString()}
                  </td>

                  <td className="px-5 py-4">{row.actor_type}</td>

                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-medium ${actionColor(row.action)}`}
                    >
                      {row.action}
                    </span>
                  </td>

                  <td className="px-5 py-4">{row.entity_type}</td>

                  <td className="max-w-xs truncate px-5 py-4 text-slate-500">
                    {JSON.stringify(row.metadata_json ?? {})}
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
