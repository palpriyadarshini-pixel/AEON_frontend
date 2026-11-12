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
  fetchTransactionDetail,
  fetchTransactionTimeline,
  fetchTransactionReceipt,
  reconcilePendingPayments,
  reconcilePayPalOrder,
  LedgerTransaction,
  LedgerSummary,
} from '../services/api';
import type {
  TransactionTimelineResponse,
  TransactionReceiptResponse,
  ReconciliationResponse,
  TimelineEventItem,
} from '../types';
import { StatusBadge } from './StatusBadge';
import { Drawer } from './Drawer';
import { EmptyState } from './EmptyState';
import { IconCreditCard, IconHistory, IconRefresh, IconSearch, IconFilter, IconCheck } from './icons';

ModuleRegistry.registerModules([AllCommunityModule]);

type LedgerMode = 'transactions' | 'audit';

const gridTheme = themeQuartz.withParams({
  backgroundColor: '#181818',
  foregroundColor: '#EBEBEB',
  headerBackgroundColor: '#141414',
  headerTextColor: '#9EA1A5',
  borderColor: 'rgba(255, 255, 255, 0.08)',
  rowHoverColor: '#202020',
  oddRowBackgroundColor: '#181818',
  fontSize: 12,
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
  const [timeline, setTimeline] = useState<TransactionTimelineResponse | null>(null);
  const [receipt, setReceipt] = useState<TransactionReceiptResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [reconciling, setReconciling] = useState(false);
  const [reconciliationResult, setReconciliationResult] = useState<string | null>(null);
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
    const timer = window.setInterval(() => void refresh(), 10000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  // Load detailed timeline and receipt when a transaction is selected
  useEffect(() => {
    if (!selected) {
      setTimeline(null);
      setReceipt(null);
      return;
    }

    let active = true;
    setDetailLoading(true);

    Promise.all([
      fetchTransactionTimeline(selected.id).catch(() => null),
      fetchTransactionReceipt(selected.id).catch(() => null),
    ]).then(([tData, rData]) => {
      if (!active) return;
      setTimeline(tData);
      setReceipt(rData);
      setDetailLoading(false);
    });

    return () => {
      active = false;
    };
  }, [selected]);

  const handleReconcileBatch = async () => {
    setReconciling(true);
    setReconciliationResult(null);
    setError('');
    try {
      const res: ReconciliationResponse = await reconcilePendingPayments();
      setReconciliationResult(
        `Batch reconciliation complete: ${res.settled_count} settled, ${res.pending_count} pending, ${res.failed_count} failed.`
      );
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Batch reconciliation failed');
    } finally {
      setReconciling(false);
    }
  };

  const handleReconcileSingle = async (orderId: string) => {
    setReconciling(true);
    setError('');
    try {
      await reconcilePayPalOrder(orderId);
      setReconciliationResult(`Payment attempt ${orderId} reconciled with PayPal authoritative ledger.`);
      await refresh();
      if (selected) {
        const updated = await fetchTransactionDetail(selected.id).catch(() => null);
        if (updated) {
          setSelected((prev) => (prev ? { ...prev, status: updated.status } : null));
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Single reconciliation failed');
    } finally {
      setReconciling(false);
    }
  };

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
        headerName: 'TIMESTAMP',
        minWidth: 160,
        valueFormatter: (p) =>
          p.value ? new Date(p.value).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : '—',
        cellClass: 'tabular-nums font-mono text-[11px] text-[#9EA1A5]',
      },
      {
        field: 'agent_name',
        headerName: 'AGENT',
        minWidth: 140,
        cellClass: 'font-mono text-xs text-[#EBEBEB]',
      },
      {
        field: 'vendor',
        headerName: 'SUPPLIER',
        minWidth: 140,
        cellClass: 'font-mono text-xs text-[#9EA1A5]',
      },
      {
        field: 'item_description',
        headerName: 'PURCHASE SPECIFICATION',
        minWidth: 220,
        flex: 1,
        cellClass: 'text-xs text-[#EBEBEB]',
      },
      {
        field: 'amount',
        headerName: 'AMOUNT',
        minWidth: 120,
        valueFormatter: (p) => money(Number(p.value), p.data?.currency),
        cellClass: 'tabular-nums font-mono text-xs font-bold text-[#EBEBEB]',
      },
      {
        field: 'status',
        headerName: 'SETTLEMENT',
        minWidth: 130,
        cellRenderer: (p: ICellRendererParams<LedgerTransaction>) => (
          <StatusBadge value={String(p.value ?? '')} />
        ),
      },
      {
        field: 'policy_decision',
        headerName: 'POLICY VERDICT',
        minWidth: 140,
        cellRenderer: (p: ICellRendererParams<LedgerTransaction>) => (
          <StatusBadge value={String(p.value ?? '')} />
        ),
      },
      {
        field: 'remaining_budget',
        headerName: 'RESIDUAL BUDGET',
        minWidth: 140,
        valueFormatter: (p) => money(p.value, p.data?.currency),
        cellClass: 'tabular-nums font-mono text-xs text-[#1DB954]',
      },
    ],
    [],
  );

  const auditColumns = useMemo<ColDef<AuditEvent>[]>(
    () => [
      {
        field: 'timestamp',
        headerName: 'TIMESTAMP',
        minWidth: 160,
        valueFormatter: (p) =>
          p.value ? new Date(p.value).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : '—',
        cellClass: 'tabular-nums font-mono text-[11px] text-[#9EA1A5]',
      },
      {
        field: 'action',
        headerName: 'ACTION VERDICT',
        minWidth: 180,
        cellRenderer: (p: ICellRendererParams<AuditEvent>) => (
          <StatusBadge value={String(p.value ?? '')} />
        ),
      },
      {
        field: 'actor_type',
        headerName: 'ACTOR TYPE',
        minWidth: 120,
        cellClass: 'font-mono text-xs text-[#00F0FF]',
      },
      {
        field: 'actor_id',
        headerName: 'ACTOR ID',
        minWidth: 160,
        cellClass: 'font-mono text-[11px] text-[#9EA1A5]',
        valueFormatter: (p) => p.value ? String(p.value).slice(0, 12) + '…' : 'SYSTEM',
      },
      {
        field: 'entity_type',
        headerName: 'ENTITY',
        minWidth: 130,
        cellClass: 'font-mono text-xs text-[#777777]',
      },
      {
        field: 'entity_id',
        headerName: 'ENTITY ID',
        minWidth: 160,
        cellClass: 'font-mono text-[11px] text-[#EBEBEB]',
        valueFormatter: (p) => p.value ? String(p.value).slice(0, 12) + '…' : '—',
      },
      {
        field: 'metadata_json',
        headerName: 'EVENT METADATA',
        minWidth: 260,
        flex: 1,
        cellClass: 'font-mono text-[11px] text-[#777777]',
        valueFormatter: (p) => (p.value ? JSON.stringify(p.value) : '—'),
      },
    ],
    [],
  );

  return (
    <section className="space-y-6">
      {/* Page Heading */}
      <div className="flex flex-col justify-between gap-4 border-b border-[rgba(255,255,255,0.06)] pb-5 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-[#777777]">
              {mode === 'transactions' ? 'FINANCIAL OPERATIONS' : 'AUDIT REPOSITORY'}
            </span>
            <span className="text-[10px] text-[#55585D]">/</span>
            <span className="text-[10px] font-mono text-[#00F0FF] uppercase tracking-wider">
              {mode === 'transactions' ? 'IMMUTABLE LEDGER' : 'APPEND-ONLY TRAIL'}
            </span>
          </div>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-[#EBEBEB]">
            {mode === 'transactions' ? 'Financial Transaction Ledger' : 'Cryptographic Audit Trail'}
          </h2>
          <p className="mt-1 text-xs text-[#9EA1A5]">
            {mode === 'transactions'
              ? 'Authoritative records of agent purchases, PayPal Orders v2 captures, escrow states, and verified settlements.'
              : 'Tamper-resistant event ledger capturing all governance checks, policy verdicts, and operator actions.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {mode === 'transactions' && (
            <button
              type="button"
              onClick={handleReconcileBatch}
              disabled={reconciling || loading}
              className="inline-flex items-center gap-2 rounded-lg border border-[rgba(0,240,255,0.3)] bg-[rgba(0,240,255,0.08)] px-3.5 py-2 text-xs font-mono font-medium text-[#00F0FF] transition-colors hover:bg-[rgba(0,240,255,0.16)] disabled:opacity-50"
            >
              <IconRefresh className={`h-3.5 w-3.5 ${reconciling ? 'animate-spin' : ''}`} />
              <span>{reconciling ? 'Reconciling…' : 'Reconcile In-Flight Payments'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => void refresh()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#202020] px-3.5 py-2 text-xs font-medium text-[#EBEBEB] transition-colors hover:border-[#00F0FF]/40 hover:text-[#00F0FF] disabled:opacity-50"
          >
            <IconRefresh className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-[#00F0FF]' : ''}`} />
            <span>{loading ? 'Syncing…' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {error && (
        <div role="alert" className="rounded-xl border border-[rgba(239,68,68,0.3)] bg-[rgba(239,68,68,0.08)] p-4 text-xs text-[#EF4444]">
          <span className="font-mono font-bold mr-2">LEDGER ERROR:</span>
          {error}
        </div>
      )}

      {reconciliationResult && (
        <div className="rounded-xl border border-[rgba(29,185,84,0.3)] bg-[rgba(29,185,84,0.08)] p-4 text-xs font-mono text-[#1DB954]">
          ✓ {reconciliationResult}
        </div>
      )}

      {/* 5-Metric Strip for Transactions */}
      {mode === 'transactions' && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
          <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#181818] p-4">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#777777]">
              Total Transactions
            </span>
            <p className="mt-1.5 tabular-nums font-mono text-2xl font-bold text-[#EBEBEB]">
              {summary.total}
            </p>
            <p className="mt-1 text-[10px] text-[#55585D]">Recorded entries</p>
          </div>

          <div className="rounded-xl border border-[rgba(245,185,66,0.2)] bg-[#181818] p-4">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#F5B942]">
              Pending In-Flight
            </span>
            <p className="mt-1.5 tabular-nums font-mono text-2xl font-bold text-[#F5B942]">
              {summary.pending}
            </p>
            <p className="mt-1 text-[10px] text-[#55585D]">Awaiting capture</p>
          </div>

          <div className="rounded-xl border border-[rgba(239,68,68,0.2)] bg-[#181818] p-4">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#EF4444]">
              Blocked By Policy
            </span>
            <p className="mt-1.5 tabular-nums font-mono text-2xl font-bold text-[#EF4444]">
              {summary.blocked}
            </p>
            <p className="mt-1 text-[10px] text-[#55585D]">Hard stopped</p>
          </div>

          <div className="rounded-xl border border-[rgba(29,185,84,0.2)] bg-[#181818] p-4">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#1DB954]">
              Settled &amp; Reconciled
            </span>
            <p className="mt-1.5 tabular-nums font-mono text-2xl font-bold text-[#1DB954]">
              {summary.completed}
            </p>
            <p className="mt-1 text-[10px] text-[#55585D]">Confirmed capture</p>
          </div>

          <div className="col-span-2 sm:col-span-1 rounded-xl border border-[rgba(22,87,173,0.3)] bg-[#181818] p-4">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#619CBE]">
              Net Captured Capital
            </span>
            <p className="mt-1.5 tabular-nums font-mono text-2xl font-bold text-[#EBEBEB]">
              {money(summary.completed_amount)}
            </p>
            <p className="mt-1 text-[10px] text-[#55585D]">{summary.failed} cancelled/failed</p>
          </div>
        </div>
      )}

      {/* Filter and Table Container */}
      <div className="relative rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#181818] overflow-hidden">
        {/* Subtle Telemetry Dot-Matrix Graphic Accent */}
        <div
          className="absolute right-0 top-0 w-72 h-36 opacity-10 pointer-events-none"
          style={{
            backgroundImage: "url('/assets/aeon/dot-matrix-chart.jpeg')",
            backgroundSize: 'cover',
            backgroundPosition: 'top right',
          }}
        />
        {/* Controls Toolbar */}
        <div className="flex flex-col gap-4 border-b border-[rgba(255,255,255,0.06)] p-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-semibold uppercase tracking-wider text-[#EBEBEB]">
              {mode === 'transactions' ? 'Authoritative Ledger Records' : 'Immutable Event Records'}
            </span>
            <span className="rounded bg-[#202020] px-2 py-0.5 text-[10px] font-mono text-[#777777]">
              {mode === 'transactions' ? visibleTransactions.length : displayedEvents.length} MATCHES
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {/* Search Input */}
            <div className="relative">
              <input
                aria-label="Search records"
                placeholder="Filter by ID, vendor, item…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 w-full rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#121212] px-3 font-mono text-xs text-[#EBEBEB] outline-none placeholder:text-[#55585D] focus:border-[#00F0FF]/50"
              />
            </div>

            {/* Status Filter */}
            {mode === 'transactions' && (
              <select
                aria-label="Filter by status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-9 w-full rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#121212] px-3 font-mono text-xs text-[#EBEBEB] outline-none focus:border-[#00F0FF]/50"
              >
                <option value="ALL">All Statuses</option>
                {['SETTLED', 'PENDING', 'FAILED', 'REFUNDED'].map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            )}

            {/* Agent Filter */}
            <select
              aria-label="Filter by agent"
              value={agentFilter}
              onChange={(e) => setAgentFilter(e.target.value)}
              className="h-9 w-full rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#121212] px-3 font-mono text-xs text-[#EBEBEB] outline-none focus:border-[#00F0FF]/50"
            >
              <option value="ALL">All Agents</option>
              {agents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* AG-Grid Table View */}
        <div className="w-full overflow-x-auto p-4">
          <div
            className="ag-theme-quartz-dark w-full"
            style={{
              height: mode === 'transactions' ? 360 : 480,
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
                overlayNoRowsTemplate="No transactions found matching criteria."
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
                overlayNoRowsTemplate="No audit events found matching criteria."
              />
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-[rgba(255,255,255,0.06)] px-5 py-3 text-xs font-mono text-[#777777]">
          <span>
            {mode === 'transactions'
              ? `Showing ${visibleTransactions.length} of ${summary.total} entries`
              : `Showing ${displayedEvents.length} events`}
          </span>
          <span>Click any row for comprehensive ledger &amp; PayPal verification</span>
        </div>
      </div>

      {/* SLIDE-OUT DETAIL DRAWER FOR SELECTED TRANSACTION */}
      <Drawer
        isOpen={Boolean(selected && mode === 'transactions')}
        onClose={() => setSelected(null)}
        title="Transaction Ledger Inspection"
        subtitle={`Tx ID: ${selected?.id || ''}`}
        badge={selected ? <StatusBadge value={selected.status} /> : undefined}
      >
        {selected && (
          <div className="space-y-6">
            {/* Core Verification Banner */}
            <div
              className={`rounded-xl border p-4 ${
                selected.status === 'SETTLED'
                  ? 'border-[rgba(29,185,84,0.3)] bg-[rgba(29,185,84,0.06)]'
                  : selected.status === 'PENDING'
                    ? 'border-[rgba(245,185,66,0.3)] bg-[rgba(245,185,66,0.06)]'
                    : 'border-[rgba(239,68,68,0.3)] bg-[rgba(239,68,68,0.06)]'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono uppercase tracking-wider text-[#9EA1A5]">
                  Authoritative Verification
                </span>
                <span
                  className={`text-xs font-mono font-bold ${
                    selected.status === 'SETTLED'
                      ? 'text-[#1DB954]'
                      : selected.status === 'PENDING'
                        ? 'text-[#F5B942]'
                        : 'text-[#EF4444]'
                  }`}
                >
                  {selected.status === 'SETTLED'
                    ? 'VERIFIED SETTLEMENT'
                    : selected.status === 'PENDING'
                      ? 'CAPTURE PENDING REVIEW'
                      : 'FAILED / CANCELLED'}
                </span>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-[#EBEBEB]">
                {selected.status === 'SETTLED'
                  ? 'The backend confirms a completed PayPal capture with matching amount and settled ledger entry.'
                  : selected.status === 'PENDING'
                    ? 'Buyer approval does not establish settlement. Reserved funds remain in escrow pending capture confirmation.'
                    : 'Transaction did not complete. Any reserved funds have been released by the backend.'}
              </p>
            </div>

            {/* Financial Parameters */}
            <div className="grid grid-cols-2 gap-3 text-xs font-mono">
              <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#141414] p-3.5">
                <span className="text-[10px] uppercase text-[#777777]">Captured Amount</span>
                <p className="mt-1 text-base font-bold tabular-nums text-[#EBEBEB]">
                  {money(selected.amount, selected.currency)}
                </p>
              </div>
              <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#141414] p-3.5">
                <span className="text-[10px] uppercase text-[#777777]">Policy Result</span>
                <p className="mt-1 text-sm font-bold text-[#00F0FF]">
                  {selected.policy_decision}
                </p>
              </div>
            </div>

            {/* PayPal Orchestration Details */}
            <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#141414] p-4 space-y-3">
              <h4 className="text-[11px] font-mono uppercase tracking-wider text-[#777777]">
                PayPal Orders v2 Orchestration
              </h4>
              <div className="space-y-2 text-xs font-mono">
                <div className="flex items-center justify-between">
                  <span className="text-[#9EA1A5]">PayPal Order ID:</span>
                  <span className="text-[#EBEBEB] tabular-nums">{selected.paypal_order_id || 'Not generated'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#9EA1A5]">Capture ID:</span>
                  <span className="text-[#EBEBEB] tabular-nums">{selected.paypal_capture_id || 'Not issued'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#9EA1A5]">Agent Name:</span>
                  <span className="text-[#00F0FF]">{selected.agent_name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#9EA1A5]">Supplier:</span>
                  <span className="text-[#EBEBEB]">{selected.vendor}</span>
                </div>
              </div>

              {selected.paypal_order_id && selected.status !== 'SETTLED' && (
                <button
                  type="button"
                  onClick={() => handleReconcileSingle(selected.paypal_order_id!)}
                  disabled={reconciling}
                  className="mt-3 w-full rounded-lg border border-[rgba(0,240,255,0.3)] bg-[rgba(0,240,255,0.08)] py-2 text-xs font-mono font-medium text-[#00F0FF] hover:bg-[rgba(0,240,255,0.16)] disabled:opacity-50"
                >
                  {reconciling ? 'Reconciling with PayPal…' : 'Reconcile this Order with PayPal'}
                </button>
              )}
            </div>

            {/* Timeline Events if present */}
            {timeline && timeline.events && timeline.events.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-xs font-mono uppercase tracking-wider text-[#EBEBEB]">
                  Settlement Event Timeline
                </h4>
                <div className="space-y-2 border-l border-[rgba(255,255,255,0.08)] pl-4">
                  {timeline.events.map((ev: TimelineEventItem) => (
                    <div key={ev.id} className="relative pb-3 text-xs font-mono">
                      <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-[#00F0FF]" />
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[#EBEBEB]">{ev.action}</span>
                        <span className="text-[10px] text-[#777777]">
                          {new Date(ev.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[#9EA1A5]">{ev.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Receipt Summary */}
            {receipt && (
              <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#141414] p-4 space-y-2 text-xs font-mono">
                <div className="flex items-center justify-between">
                  <span className="text-[#777777] uppercase text-[10px]">Authoritative Receipt</span>
                  <span className="text-[#00F0FF]">#{receipt.receipt_number}</span>
                </div>
                <div className="text-[11px] text-[#9EA1A5] space-y-1">
                  <p>Organization: {receipt.organization_name}</p>
                  <p>Item: {receipt.item_description}</p>
                  <p>Issued: {new Date(receipt.issued_at).toLocaleString()}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </Drawer>
    </section>
  );
}
