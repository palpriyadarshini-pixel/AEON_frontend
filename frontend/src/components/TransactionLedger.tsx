
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AgGridReact } from 'ag-grid-react';
import {
  AllCommunityModule,
  ModuleRegistry,
  themeQuartz,
} from 'ag-grid-community';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';

import {
  AgentRecord,
  AuditEvent,
  fetchAgents,
  fetchAuditEvents,
  fetchTransactions,
  LedgerTransaction,
  LedgerSummary,
} from '../services/api';

ModuleRegistry.registerModules([AllCommunityModule]);

type LedgerMode = 'transactions' | 'audit';

const gridTheme = themeQuartz.withParams({
  backgroundColor: '#1A222C',
  foregroundColor: '#E5E7EB',
  headerBackgroundColor: '#24303F',
  headerTextColor: '#9CA3AF',
  borderColor: '#2E3A47',
  rowHoverColor: '#24303F',
  oddRowBackgroundColor: '#1A222C',
  fontSize: 13,
  spacing: 8,
});

const money = (
  value: number | null | undefined,
  currency = 'USD',
) =>
  value === null || value === undefined
    ? '—'
    : new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
      }).format(value);

function StatusBadge({ value }: { value: string }) {
  const status = value?.toUpperCase() ?? '';

  const styles: Record<string, string> = {
    SETTLED: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    COMPLETED: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    PENDING: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    FAILED: 'bg-red-500/10 text-red-400 border-red-500/20',
    BLOCKED: 'bg-red-500/10 text-red-400 border-red-500/20',
    REFUNDED: 'bg-slate-500/10 text-slate-300 border-slate-500/20',
  };

  return (
    <span className={`inline-flex rounded-md border px-2 py-1 text-[11px] font-medium ${styles[status] ?? 'border-slate-600 bg-slate-700/30 text-slate-300'}`}>
      {status || 'UNKNOWN'}
    </span>
  );
}

function Metric({
  label,
  value,
  detail,
}: {
  label: string;
  value: string | number;
  detail: string;
}) {
  return (
    <div className="rounded-lg border border-slate-700/70 bg-[#1A222C] p-5">
      <p className="text-xs font-medium text-slate-400">{label}</p>
      <p className="mt-3 text-2xl font-semibold tracking-tight text-white">
        {value}
      </p>
      <p className="mt-2 text-xs text-slate-500">{detail}</p>
    </div>
  );
}

export function TransactionLedger({ mode }: { mode: LedgerMode }) {
  const [transactions, setTransactions] = useState<LedgerTransaction[]>([]);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [agents, setAgents] = useState<AgentRecord[]>([]);

  const [summary, setSummary] = useState<LedgerSummary>({
    total: 0,
    pending: 0,
    blocked: 0,
    completed: 0,
    failed: 0,
    completed_amount: 0,
  });

  const [statusFilter, setStatusFilter] = useState('ALL');
  const [agentFilter, setAgentFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<LedgerTransaction | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    try {
      const [ledger, agentRows, audit] = await Promise.all([
        fetchTransactions(),
        fetchAgents(),
        fetchAuditEvents(),
      ]);

      setTransactions(ledger.data);
      setSummary(ledger.summary);
      setAgents(agentRows);
      setAuditEvents(audit.data);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to load ledger');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), 8000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  const visibleTransactions = useMemo(
    () =>
      transactions.filter((row) => {
        const matchesStatus =
          statusFilter === 'ALL' || row.status === statusFilter;

        const matchesAgent =
          agentFilter === 'ALL' || row.agent_id === agentFilter;

        const searchableText = [
          row.id,
          row.agent_name,
          row.vendor,
          row.status,
          row.item_description,
          row.paypal_order_id,
          row.paypal_capture_id,
        ]
          .map((value) => String(value ?? ''))
          .join(' ')
          .toLowerCase();

        return (
          matchesStatus &&
          matchesAgent &&
          (!search || searchableText.includes(search.toLowerCase()))
        );
      }),
    [transactions, statusFilter, agentFilter, search],
  );

  const displayedEvents = useMemo(
    () =>
      auditEvents.filter((row) => {
        const matchesAgent =
          agentFilter === 'ALL' ||
          (row.actor_type.toLowerCase() === 'agent' &&
            row.actor_id === agentFilter);

        const searchableText = [
          row.action,
          row.actor_type,
          row.actor_id,
          row.entity_type,
          row.entity_id,
          JSON.stringify(row.metadata_json ?? {}),
        ]
          .map((value) => String(value ?? ''))
          .join(' ')
          .toLowerCase();

        return (
          matchesAgent &&
          (!search || searchableText.includes(search.toLowerCase()))
        );
      }),
    [auditEvents, agentFilter, search],
  );

  const transactionColumns = useMemo<ColDef<LedgerTransaction>[]>(
    () => [
      {
        field: 'created_at',
        headerName: 'DATE',
        minWidth: 175,
        valueFormatter: (p) =>
          p.value ? new Date(p.value).toLocaleString() : '—',
      },
      { field: 'agent_name', headerName: 'AGENT', minWidth: 150 },
      { field: 'vendor', headerName: 'SUPPLIER', minWidth: 145 },
      {
        field: 'item_description',
        headerName: 'REQUESTED ITEM',
        minWidth: 200,
        flex: 1,
      },
      {
        field: 'amount',
        headerName: 'AMOUNT',
        minWidth: 125,
        valueFormatter: (p) => money(Number(p.value), p.data?.currency),
      },
      {
        field: 'status',
        headerName: 'STATUS',
        minWidth: 120,
        cellRenderer: (p: ICellRendererParams<LedgerTransaction>) => (
          <StatusBadge value={String(p.value ?? '')} />
        ),
      },
      {
        field: 'policy_decision',
        headerName: 'POLICY DECISION',
        minWidth: 145,
      },
      {
        field: 'remaining_budget',
        headerName: 'REMAINING BUDGET',
        minWidth: 155,
        valueFormatter: (p) => money(p.value, p.data?.currency),
      },
    ],
    [],
  );

  const auditColumns = useMemo<ColDef<AuditEvent>[]>(
    () => [
      {
        field: 'timestamp',
        headerName: 'TIMESTAMP',
        minWidth: 180,
        valueFormatter: (p) =>
          p.value ? new Date(p.value).toLocaleString() : '—',
      },
      { field: 'action', headerName: 'ACTION', minWidth: 190 },
      { field: 'actor_type', headerName: 'ACTOR TYPE', minWidth: 125 },
      { field: 'actor_id', headerName: 'ACTOR ID', minWidth: 180 },
      { field: 'entity_type', headerName: 'ENTITY TYPE', minWidth: 140 },
      { field: 'entity_id', headerName: 'ENTITY ID', minWidth: 210 },
      {
        field: 'metadata_json',
        headerName: 'EVENT METADATA',
        minWidth: 280,
        flex: 1,
        valueFormatter: (p) =>
          p.value ? JSON.stringify(p.value) : '—',
      },
    ],
    [],
  );

  return (
    <section className="space-y-6">
      {/* Page heading */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-slate-500">
            AEON / {mode === 'transactions' ? 'FINANCE' : 'GOVERNANCE'}
          </p>
          <h2 className="text-2xl font-semibold tracking-tight text-white">
            {mode === 'transactions'
              ? 'Transaction Ledger'
              : 'Audit Trail'}
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            {mode === 'transactions'
              ? 'Review financial transactions, payment status and agent budget positions.'
              : 'Review recorded system events and procurement activity.'}
          </p>
        </div>

        <button
          type="button"
          onClick={() => void refresh()}
          disabled={loading}
          className="rounded-md border border-slate-700 bg-[#1A222C] px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-[#24303F] disabled:opacity-50"
        >
          {loading ? 'Refreshing...' : 'Refresh data'}
        </button>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-800/70 bg-red-950/30 p-4 text-sm text-red-300"
        >
          {error}
        </div>
      )}

      {/* Transaction summary */}
      {mode === 'transactions' && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <Metric
            label="Total transactions"
            value={summary.total}
            detail="Recorded ledger entries"
          />
          <Metric
            label="Pending"
            value={summary.pending}
            detail="Awaiting completion"
          />
          <Metric
            label="Blocked"
            value={summary.blocked}
            detail="Denied by policy"
          />
          <Metric
            label="Settled"
            value={summary.completed}
            detail="Completed payments"
          />
          <Metric
            label="Net captured"
            value={money(summary.completed_amount)}
            detail={`${summary.failed} failed / cancelled`}
          />
        </div>
      )}

      
      {/* Ledger table */}
      <div className="overflow-hidden rounded-xl border border-slate-700 bg-[#1A222C]">
        <div className="flex flex-col gap-4 border-b border-slate-700 p-5 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h3 className="text-base font-semibold text-white">
              {mode === 'transactions' ? 'Financial records' : 'Recorded events'}
            </h3>
            <p className="mt-1 text-xs text-slate-400">
              {mode === 'transactions'
                ? 'Transaction records retrieved from the backend ledger.'
                : 'Append-only event records retrieved from the audit API.'}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:flex">
            <input
              aria-label="Search ledger"
              placeholder="Search records..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-md border border-slate-700 bg-[#111827] px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-500 focus:border-indigo-500 lg:w-64"
            />

            {mode === 'transactions' && (
              <select
                aria-label="Filter by status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full rounded-md border border-slate-700 bg-[#111827] px-3 py-2.5 text-sm text-white outline-none focus:border-indigo-500"
              >
                <option value="ALL">All statuses</option>
                {['SETTLED', 'PENDING', 'FAILED', 'REFUNDED'].map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            )}

            <select
              aria-label="Filter by agent"
              value={agentFilter}
              onChange={(e) => setAgentFilter(e.target.value)}
              className="w-full rounded-md border border-slate-700 bg-[#111827] px-3 py-2.5 text-sm text-white outline-none focus:border-indigo-500"
            >
              <option value="ALL">All agents</option>
              {agents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="w-full overflow-x-auto p-3">
          <div
            className="ag-theme-quartz-dark w-full"
            style={{
              height: mode === 'transactions' ? 240 : 420,
              width: '100%',
              minWidth: 0,
            }}
          >
            {mode === 'transactions' ? (
              <AgGridReact<LedgerTransaction>
                theme={gridTheme}
                rowData={visibleTransactions}
                columnDefs={transactionColumns}
                defaultColDef={{
                  sortable: true,
                  filter: true,
                  resizable: true,
                  flex: 1,
                  minWidth: 120,
                }}
                pagination
                paginationPageSize={10}
                animateRows
                onRowClicked={(event) => setSelected(event.data ?? null)}
                getRowId={(params) => params.data.id}
                overlayNoRowsTemplate="No transactions match the selected filters."
              />
            ) : (
              <AgGridReact<AuditEvent>
                theme={gridTheme}
                rowData={displayedEvents}
                columnDefs={auditColumns}
                defaultColDef={{
                  sortable: true,
                  filter: true,
                  resizable: true,
                  flex: 1,
                  minWidth: 120,
                }}
                pagination
                paginationPageSize={12}
                animateRows
                getRowId={(params) => params.data.id}
                overlayNoRowsTemplate="No audit events match the selected filters."
              />
            )}
          </div>
        </div>

        <div className="border-t border-slate-700 px-5 py-3 text-xs text-slate-400">
          {mode === 'transactions'
            ? `Showing ${visibleTransactions.length} of ${summary.total} transactions`
            : `Showing ${displayedEvents.length} audit events`}
          <span className="ml-2 text-slate-500">
            · Automatically refreshes every 8 seconds
          </span>
        </div>
      </div>

      
      {/* Agent budget position */}
      {mode === 'transactions' && (
        <section className="rounded-xl border border-slate-700 bg-[#1A222C] p-5">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-white">
                Agent budget position
              </h3>
              <p className="mt-1 text-xs text-slate-400">
                Current balances from server-side budget records.
              </p>
            </div>
            <span className="text-xs text-slate-400">
              {agents.length} registered agents
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {agents.map((agent) => {
              const used = Math.max(
                0,
                agent.budget - agent.remaining_budget
              );

              const pct =
                agent.budget > 0
                  ? Math.min(100, (used / agent.budget) * 100)
                  : 0;

              const duplicateName =
                agents.filter((item) => item.name === agent.name).length > 1;

              return (
                <article
                  key={agent.id}
                  className="rounded-lg border border-slate-700 bg-[#111827] p-4 transition-colors hover:border-slate-500"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h4 className="truncate text-sm font-semibold text-white">
                        {agent.name}
                      </h4>

                      {duplicateName && (
                        <p
                          className="mt-1 font-mono text-[10px] text-slate-500"
                          title={agent.id}
                        >
                          ID · {agent.id.slice(-8)}
                        </p>
                      )}
                    </div>

                    <span className="shrink-0 text-sm font-semibold tabular-nums text-emerald-400">
                      {money(agent.remaining_budget, agent.currency)}
                    </span>
                  </div>

                  <p className="mt-2 text-xs text-slate-400">
                    Available balance
                  </p>

                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-700">
                    <div
                      className="h-full rounded-full bg-indigo-500 transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-700 pt-3">
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-slate-500">
                        Allocated
                      </p>
                      <p className="mt-1 text-xs font-medium text-slate-200">
                        {money(agent.budget, agent.currency)}
                      </p>
                    </div>

                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-slate-500">
                        Used / reserved
                      </p>
                      <p className="mt-1 text-xs font-medium text-slate-200">
                        {money(used, agent.currency)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-[10px] text-slate-500">
                      Budget utilization
                    </span>
                    <span className="text-xs font-medium text-slate-300">
                      {pct.toFixed(1)}%
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}


      {/* Selected transaction details */}
      {selected && mode === 'transactions' && (
        <section className="rounded-lg border border-slate-700/70 bg-[#1A222C] p-5">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-700/70 pb-4">
            <div>
              <h3 className="text-base font-semibold text-white">
                Transaction details
              </h3>
              <p className="mt-1 break-all font-mono text-xs text-slate-500">
                {selected.id}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="rounded-md border border-slate-700 px-3 py-1.5 text-xs text-slate-400 transition hover:bg-slate-800 hover:text-white"
            >
              Close details
            </button>
          </div>

          <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <p className="text-xs text-slate-500">Purchase request</p>
              <p className="mt-1 break-all font-mono text-sm text-slate-200">
                {selected.purchase_request_id}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Ledger status</p>
              <div className="mt-2">
                <StatusBadge value={selected.status} />
              </div>
            </div>
            <div>
              <p className="text-xs text-slate-500">Supplier</p>
              <p className="mt-1 text-sm text-slate-200">
                {selected.vendor}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Amount</p>
              <p className="mt-1 text-sm font-semibold text-white">
                {money(selected.amount, selected.currency)}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">PayPal order ID</p>
              <p className="mt-1 break-all font-mono text-xs text-slate-300">
                {selected.paypal_order_id ?? 'Not available'}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Capture / provider ID</p>
              <p className="mt-1 break-all font-mono text-xs text-slate-300">
                {selected.paypal_capture_id ?? 'Not available'}
              </p>
            </div>
          </div>
        </section>
      )}
    </section>
  );
}
