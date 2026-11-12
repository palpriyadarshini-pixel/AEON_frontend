
import { useEffect, useState } from 'react';
import { fetchPolicies } from '../services/api';

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

  useEffect(() => {
    let alive = true;

    fetchPolicies()
      .then((data) => {
        if (alive) {
          setPolicies(data as PolicyRecord[]);
          setError('');
        }
      })
      .catch((e) => {
        if (alive) {
          setError(
            e instanceof Error
              ? e.message
              : 'Unable to load policies',
          );
        }
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, []);

  return (
    <section className="space-y-6 pt-3">

      {/* PAGE HEADER */}
      <div>
        <p className="mb-1 text-xs font-medium uppercase tracking-wider text-slate-500">
          AEON / Governance
        </p>

        <h2 className="text-2xl font-semibold tracking-tight text-white">
          Procurement Policies
        </h2>

        <p className="mt-1 text-sm text-slate-400">
          Review spending limits, approval thresholds and supplier restrictions.
        </p>
      </div>

      {/* ERROR */}
      {error && (
        <div
          role="alert"
          className="rounded-md border border-red-800 bg-red-950/30 p-3 text-sm text-red-300"
        >
          {error}
        </div>
      )}

      {/* LOADING */}
      {loading ? (
        <div className="rounded-lg border border-slate-700/60 bg-[#1A222C] p-8 text-center text-sm text-slate-400">
          Loading procurement policies...
        </div>
      ) : policies.length === 0 ? (
        <div className="rounded-lg border border-slate-700/60 bg-[#1A222C] p-10 text-center">
          <h3 className="text-sm font-semibold text-white">
            No policies available
          </h3>
          <p className="mt-2 text-xs text-slate-500">
            No procurement policies are available for this organization.
          </p>
        </div>
      ) : (

        /* POLICY GRID */
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">

          {policies.map((policy) => {
            const version = policy.versions
              ?.slice()
              .sort((a, b) => b.version - a.version)[0];

            return (
              <article
                key={policy.id}
                className="rounded-lg border border-slate-700/60 bg-[#1A222C] p-5 transition-colors hover:border-slate-600"
              >

                {/* POLICY HEADER */}
                <div className="flex items-start justify-between gap-4 border-b border-slate-700/50 pb-4">

                  <div className="min-w-0">
                    <h3 className="text-base font-semibold text-white">
                      {policy.name}
                    </h3>

                    <p className="mt-2 text-sm leading-5 text-slate-400">
                      {policy.description || 'No description provided.'}
                    </p>
                  </div>

                  <span
                    className={`shrink-0 rounded border px-2 py-1 text-[10px] font-semibold ${
                      policy.is_active
                        ? 'border-emerald-700/50 bg-emerald-950/30 text-emerald-400'
                        : 'border-slate-700 bg-slate-800 text-slate-400'
                    }`}
                  >
                    {policy.is_active ? 'ACTIVE' : 'INACTIVE'}
                  </span>

                </div>

                {/* VERSION */}
                {version ? (
                  <>
                    <div className="mt-4 flex items-center justify-between">
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                        Policy configuration
                      </p>

                      <span className="rounded bg-slate-800 px-2 py-1 font-mono text-[10px] text-slate-300">
                        Version {version.version}
                      </span>
                    </div>

                    {/* POLICY LIMITS */}
                    <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">

                      <div className="rounded-md border border-slate-700/50 bg-[#0B1220] p-4">
                        <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">
                          Per transaction
                        </p>

                        <p className="mt-2 font-mono text-lg font-semibold text-white">
                          {money(version.max_amount_per_transaction)}
                        </p>
                      </div>

                      <div className="rounded-md border border-slate-700/50 bg-[#0B1220] p-4">
                        <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">
                          Daily maximum
                        </p>

                        <p className="mt-2 font-mono text-lg font-semibold text-white">
                          {money(version.max_amount_per_day)}
                        </p>
                      </div>

                      <div className="rounded-md border border-slate-700/50 bg-[#0B1220] p-4">
                        <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">
                          Approval threshold
                        </p>

                        <p className="mt-2 font-mono text-lg font-semibold text-amber-300">
                          {money(version.approval_threshold_amount)}
                        </p>
                      </div>

                      <div className="rounded-md border border-slate-700/50 bg-[#0B1220] p-4">
                        <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">
                          Currency
                        </p>

                        <p className="mt-2 text-sm font-medium text-white">
                          {version.allowed_currencies?.join(', ') || 'Not specified'}
                        </p>
                      </div>

                    </div>

                    {/* ALLOWED SUPPLIERS */}
                    <div className="mt-5 border-t border-slate-700/50 pt-4">

                      <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">
                        Allowed suppliers
                      </p>

                      <div className="mt-3 flex flex-wrap gap-2">

                        {version.allowed_suppliers?.length ? (
                          version.allowed_suppliers.map((supplier) => (
                            <span
                              key={supplier}
                              className="rounded border border-slate-700 bg-[#0B1220] px-3 py-1.5 text-xs text-slate-300"
                            >
                              {supplier}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-slate-500">
                            No suppliers specified
                          </span>
                        )}

                      </div>
                    </div>

                  </>
                ) : (
                  <div className="mt-5 rounded-md border border-slate-700/50 bg-[#0B1220] p-4">
                    <p className="text-sm text-slate-400">
                      No policy version is available.
                    </p>
                  </div>
                )}

                {/* POLICY ID */}
                <div className="mt-5 border-t border-slate-700/50 pt-3">
                  <p className="break-all font-mono text-[10px] text-slate-500">
                    Policy ID: {policy.id}
                  </p>
                </div>

              </article>
            );
          })}

        </div>
      )}

    </section>
  );
}
