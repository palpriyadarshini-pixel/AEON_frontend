import { useCallback, useEffect, useState } from 'react';
import { fetchApprovals, decideApproval } from '../services/api';
import type { ApprovalResponse, ApprovalStatus } from '../types';
import { StatusBadge } from './StatusBadge';
import { EmptyState } from './EmptyState';
import { IconInbox, IconRefresh, IconCheck, IconX } from './icons';

export function ApprovalsQueue() {
  const [approvals, setApprovals] = useState<ApprovalResponse[]>([]);
  const [filter, setFilter] = useState<ApprovalStatus | 'ALL'>('PENDING');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionNotes, setActionNotes] = useState<Record<string, string>>({});
  const [actionSuccess, setActionSuccess] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchApprovals(filter === 'ALL' ? undefined : filter);
      setApprovals(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to load approval queue');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleDecision = async (id: string, decision: 'APPROVE' | 'REJECT') => {
    setBusyId(id);
    setError('');
    setActionSuccess('');
    try {
      const notes = actionNotes[id] || `Decided by dashboard administrator as ${decision}`;
      await decideApproval(id, decision, notes);
      setActionSuccess(`Approval record ${id.slice(0, 8)}… marked as ${decision}.`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : `Failed to ${decision.toLowerCase()} request`);
    } finally {
      setBusyId(null);
    }
  };

  const money = (val: string | number, curr = 'USD') =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: curr }).format(Number(val));

  return (
    <section className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 border-b border-[rgba(255,255,255,0.06)] pb-5 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-[#777777]">
              GOVERNANCE
            </span>
            <span className="text-[10px] text-[#55585D]">/</span>
            <span className="text-[10px] font-mono text-[#F5B942] uppercase tracking-wider">
              HUMAN IN THE LOOP
            </span>
          </div>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-[#EBEBEB]">
            Human Authorization Queue
          </h2>
          <p className="mt-1 text-xs text-[#9EA1A5]">
            Review purchase requests that trigger human oversight rules or exceed discretionary thresholds.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#202020] px-3.5 py-2 text-xs font-medium text-[#EBEBEB] transition-colors hover:border-[#00F0FF]/40 hover:text-[#00F0FF] disabled:opacity-50"
          >
            <IconRefresh className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-[#00F0FF]' : ''}`} />
            <span>{loading ? 'Refreshing…' : 'Refresh Queue'}</span>
          </button>
        </div>
      </div>

      {error && (
        <div role="alert" className="rounded-xl border border-[rgba(239,68,68,0.3)] bg-[rgba(239,68,68,0.08)] p-4 text-xs text-[#EF4444]">
          <span className="font-mono font-bold mr-2">QUEUE ERROR:</span>
          {error}
        </div>
      )}

      {actionSuccess && (
        <div className="rounded-xl border border-[rgba(29,185,84,0.3)] bg-[rgba(29,185,84,0.08)] p-4 text-xs font-mono text-[#1DB954]">
          ✓ {actionSuccess}
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-[rgba(255,255,255,0.06)] pb-3">
        {(['PENDING', 'APPROVED', 'REJECTED', 'ALL'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setFilter(tab)}
            className={`rounded-lg px-3 py-1.5 text-xs font-mono transition-colors ${
              filter === tab
                ? 'bg-[#202020] text-[#00F0FF] border border-[rgba(0,240,255,0.3)]'
                : 'text-[#777777] hover:text-[#EBEBEB]'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Queue Items */}
      {loading ? (
        <div className="py-16 text-center text-xs text-[#777777] font-mono">
          Loading approval queue records…
        </div>
      ) : approvals.length === 0 ? (
        <EmptyState
          title="Authorization Queue Cleared"
          description={
            filter === 'PENDING'
              ? 'No pending purchase requests require human authorization at this moment.'
              : `No approval records match the filter '${filter}'.`
          }
          illustration="approvals"
        />
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {approvals.map((item) => {
            const isPending = item.status === 'PENDING';
            const isBusy = busyId === item.id;

            return (
              <div
                key={item.id}
                className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#181818] p-5.5 transition-all hover:border-[rgba(255,255,255,0.14)]"
              >
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono text-xs font-bold text-[#EBEBEB]">
                        Approval ID: {item.id.slice(0, 8)}…
                      </span>
                      <StatusBadge value={item.status} />
                    </div>
                    <p className="mt-1 text-xs text-[#9EA1A5] font-mono">
                      Purchase Request: <span className="text-[#EBEBEB]">{item.purchase_request_id}</span>
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="tabular-nums font-mono text-xl font-bold text-[#EBEBEB]">
                      {money(item.amount, item.currency)}
                    </span>
                    <p className="text-[10px] font-mono text-[#777777]">
                      Policy Version: v{item.policy_version ?? 1}
                    </p>
                  </div>
                </div>

                {/* Additional Metadata */}
                <div className="mt-4 grid grid-cols-1 gap-2 rounded-xl bg-[#141414] p-3 text-xs font-mono sm:grid-cols-3">
                  <div>
                    <span className="text-[#777777]">Created: </span>
                    <span className="text-[#9EA1A5] tabular-nums">
                      {new Date(item.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#777777]">Expires: </span>
                    <span className="text-[#9EA1A5] tabular-nums">
                      {item.expires_at ? new Date(item.expires_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'Never'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#777777]">Approver: </span>
                    <span className="text-[#9EA1A5]">
                      {item.approver_id ? item.approver_id.slice(0, 8) + '…' : 'Pending'}
                    </span>
                  </div>
                </div>

                {item.notes && (
                  <div className="mt-3 text-xs font-mono text-[#9EA1A5] bg-[#141414]/50 p-2.5 rounded-lg border border-[rgba(255,255,255,0.04)]">
                    <span className="text-[#777777]">Notes: </span>
                    {item.notes}
                  </div>
                )}

                {/* Interactive Decisions for Pending Records */}
                {isPending && (
                  <div className="mt-4 border-t border-[rgba(255,255,255,0.06)] pt-4 space-y-3">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <input
                        type="text"
                        placeholder="Optional operator notes / audit justification…"
                        value={actionNotes[item.id] || ''}
                        onChange={(e) =>
                          setActionNotes((prev) => ({ ...prev, [item.id]: e.target.value }))
                        }
                        className="h-9 flex-1 rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#121212] px-3 font-mono text-xs text-[#EBEBEB] outline-none focus:border-[#00F0FF]/50"
                      />

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleDecision(item.id, 'APPROVE')}
                          disabled={isBusy}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-[#1DB954] px-4 py-2 font-mono text-xs font-bold text-black transition-colors hover:bg-[#18A148] disabled:opacity-50"
                        >
                          <IconCheck className="h-3.5 w-3.5" />
                          {isBusy ? 'Saving…' : 'Approve'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDecision(item.id, 'REJECT')}
                          disabled={isBusy}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-[rgba(239,68,68,0.4)] bg-[rgba(239,68,68,0.08)] px-4 py-2 font-mono text-xs font-bold text-[#EF4444] transition-colors hover:bg-[rgba(239,68,68,0.16)] disabled:opacity-50"
                        >
                          <IconX className="h-3.5 w-3.5" />
                          {isBusy ? 'Saving…' : 'Reject'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
