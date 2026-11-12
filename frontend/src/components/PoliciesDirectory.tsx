import { useEffect, useState } from 'react';
import { fetchPolicies } from '../services/api';
import { StatusBadge } from './StatusBadge';
import { EmptyState } from './EmptyState';
import { IconScale, IconRefresh } from './icons';

interface PolicyVersion {
  version: number;
  max_amount_per_transaction: number | string;
  max_amount_per_day: number | string;
  approval_threshold_amount: number | string;
  allowed_currencies?: string[];
  allowed_suppliers?: string[];
}

interface PolicyRecord {
  id: string;
  name: string;
  description: string;
  is_active: boolean;
  versions?: PolicyVersion[];
}

const money = (value: number | string) =>
  `$${Number(value).toFixed(2)}`;

export function PoliciesDirectory() {
  const [policies, setPolicies] = useState<PolicyRecord[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    fetchPolicies()
      .then((data) => {
        setPolicies(data as PolicyRecord[]);
        setError('');
      })
      .catch((e) => {
        setError(
          e instanceof Error
            ? e.message
            : 'Unable to load policies',
        );
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <section className="space-y-6">
      {/* PAGE HEADER */}
      <div className="flex flex-col justify-between gap-4 border-b border-[rgba(255,255,255,0.06)] pb-5 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-[#777777]">
              GOVERNANCE
            </span>
            <span className="text-[10px] text-[#55585D]">/</span>
            <span className="text-[10px] font-mono text-[#00F0FF] uppercase tracking-wider">
              DETERMINISTIC RULE MATRIX
            </span>
          </div>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-[#EBEBEB]">
            Procurement Policy Matrix
          </h2>
          <p className="mt-1 text-xs text-[#9EA1A5]">
            Deterministic spend caps, rolling daily ceilings, supplier allow-lists, and human authorization thresholds enforced before PayPal order generation.
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
            <span>{loading ? 'Refreshing…' : 'Refresh Policies'}</span>
          </button>
        </div>
      </div>

      {/* ERROR */}
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-[rgba(239,68,68,0.3)] bg-[rgba(239,68,68,0.08)] p-4 text-xs text-[#EF4444]"
        >
          <span className="font-mono font-bold mr-2">POLICY ENGINE ERROR:</span>
          {error}
        </div>
      )}

      {/* INVARIANT INFO STRIP */}
      <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#141414] p-4 text-xs font-mono text-[#9EA1A5] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-[#1DB954]" />
          <span>APPROVE: Below threshold &amp; allow-listed</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-[#F5B942]" />
          <span>FLAG: Over approval threshold or 0.00 review</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-[#EF4444]" />
          <span>BLOCK: Limit exceeded or supplier disallowed (Non-overridable)</span>
        </div>
      </div>

      {/* LOADING */}
      {loading ? (
        <div className="py-16 text-center text-xs text-[#777777] font-mono">
          Loading procurement policy rules…
        </div>
      ) : policies.length === 0 ? (
        <EmptyState
          title="No Policies Configured"
          description="No deterministic procurement policies are registered for this organization."
          illustration="approvals"
        />
      ) : (
        /* POLICY GRID */
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          {policies.map((policy) => {
            const version = policy.versions
              ?.slice()
              .sort((a, b) => b.version - a.version)[0];

            return (
              <article
                key={policy.id}
                className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#181818] p-6 transition-all hover:border-[rgba(255,255,255,0.14)]"
              >
                {/* POLICY HEADER */}
                <div className="flex items-start justify-between gap-4 border-b border-[rgba(255,255,255,0.06)] pb-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <IconScale className="h-4 w-4 text-[#00F0FF]" />
                      <h3 className="text-base font-semibold tracking-tight text-[#EBEBEB]">
                        {policy.name}
                      </h3>
                    </div>
                    <p className="mt-1.5 text-xs leading-relaxed text-[#9EA1A5]">
                      {policy.description || 'Global deterministic policy governing agent procurement.'}
                    </p>
                  </div>

                  <StatusBadge value={policy.is_active ? 'ACTIVE' : 'INACTIVE'} />
                </div>

                {/* VERSION */}
                {version ? (
                  <div className="mt-5 space-y-4">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-[#777777] uppercase text-[11px]">
                        Active Version Constraints
                      </span>
                      <span className="rounded border border-[rgba(0,240,255,0.3)] bg-[rgba(0,240,255,0.08)] px-2 py-0.5 text-[10px] text-[#00F0FF]">
                        v{version.version}.0
                      </span>
                    </div>

                    {/* POLICY LIMITS */}
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <div className="rounded-xl border border-[rgba(255,255,255,0.05)] bg-[#141414] p-3.5">
                        <p className="text-[10px] font-mono uppercase tracking-wider text-[#777777]">
                          Per-Tx Limit
                        </p>
                        <p className="mt-1.5 font-mono text-base font-bold tabular-nums text-[#EBEBEB]">
                          {money(version.max_amount_per_transaction)}
                        </p>
                      </div>

                      <div className="rounded-xl border border-[rgba(255,255,255,0.05)] bg-[#141414] p-3.5">
                        <p className="text-[10px] font-mono uppercase tracking-wider text-[#777777]">
                          Daily Rolling Cap
                        </p>
                        <p className="mt-1.5 font-mono text-base font-bold tabular-nums text-[#EBEBEB]">
                          {money(version.max_amount_per_day)}
                        </p>
                      </div>

                      <div className="rounded-xl border border-[rgba(245,185,66,0.2)] bg-[#141414] p-3.5">
                        <p className="text-[10px] font-mono uppercase tracking-wider text-[#F5B942]">
                          Approval Threshold
                        </p>
                        <p className="mt-1.5 font-mono text-base font-bold tabular-nums text-[#F5B942]">
                          {money(version.approval_threshold_amount)}
                        </p>
                      </div>
                    </div>

                    {/* ALLOWED SUPPLIERS */}
                    <div className="rounded-xl border border-[rgba(255,255,255,0.05)] bg-[#141414] p-4 space-y-2">
                      <div className="flex items-center justify-between text-[11px] font-mono">
                        <span className="uppercase text-[#777777]">Supplier Allow-list</span>
                        <span className="text-[#9EA1A5]">
                          {version.allowed_suppliers?.length ?? 0} Vendors Permitted
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {version.allowed_suppliers?.length ? (
                          version.allowed_suppliers.map((supplier) => (
                            <span
                              key={supplier}
                              className="rounded-md border border-[rgba(255,255,255,0.08)] bg-[#1E1E1E] px-2.5 py-1 text-[11px] font-mono text-[#EBEBEB]"
                            >
                              ✓ {supplier}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-[#777777] font-mono">
                            Unrestricted / None specified
                          </span>
                        )}
                      </div>
                    </div>

                    {/* CURRENCIES */}
                    <div className="flex items-center justify-between text-xs font-mono text-[#777777] px-1">
                      <span>Currencies:</span>
                      <span className="text-[#9EA1A5]">
                        {version.allowed_currencies?.join(', ') || 'USD'}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="mt-5 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#141414] p-4 text-xs text-[#777777]">
                    No version constraints assigned.
                  </div>
                )}

                {/* POLICY ID */}
                <div className="mt-5 border-t border-[rgba(255,255,255,0.06)] pt-3 flex items-center justify-between text-[11px] font-mono text-[#777777]">
                  <span className="truncate max-w-[280px]">ID: {policy.id}</span>
                  <span className="text-[#00F0FF]">DETERMINISTIC INVARIANT</span>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
