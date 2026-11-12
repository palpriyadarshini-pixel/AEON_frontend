import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
  AgentRecord,
  BudgetResponse,
  BudgetReservationResponse,
  createAgent,
  fetchAgents,
  fetchBudgets,
  fetchPurchases,
  fetchBudgetReservations,
} from '../services/api';
import { StatusBadge } from './StatusBadge';
import { EmptyState } from './EmptyState';
import { Drawer } from './Drawer';
import { IconBot, IconRefresh, IconCreditCard, IconScale, IconCheck, IconLock } from './icons';

const money = (n: number, currency = 'USD') =>
  new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
  }).format(n);

const inputClass =
  'mt-2 h-10 w-full rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#121212] px-3 font-mono text-xs text-[#EBEBEB] outline-none transition-colors placeholder:text-[#55585D] focus:border-[#00F0FF]/50';

export function AgentDirectory() {
  const [agents, setAgents] = useState<AgentRecord[]>([]);
  const [name, setName] = useState('Procurement Autonomous Agent');
  const [budget, setBudget] = useState('100.00');
  const [singleLimit, setSingleLimit] = useState('25.00');
  const [approvalThreshold, setApprovalThreshold] = useState('25.00');
  const [vendors, setVendors] = useState('mock_supplier_a, mock_supplier_b');

  const [rawKey, setRawKey] = useState('');
  const [createdAgent, setCreatedAgent] = useState('');
  const [selectedAgent, setSelectedAgent] = useState<AgentRecord | null>(null);

  const [agentReservations, setAgentReservations] = useState<BudgetReservationResponse[]>([]);
  const [reservationsLoading, setReservationsLoading] = useState(false);
  const [reservationError, setReservationError] = useState('');

  const [agentPurchases, setAgentPurchases] = useState<Awaited<ReturnType<typeof fetchPurchases>>>([]);
  const [purchasesLoading, setPurchasesLoading] = useState(false);
  const [purchaseError, setPurchaseError] = useState('');

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    setError('');

    try {
      const rows = await fetchAgents();
      setAgents(rows);

      setSelectedAgent((current) => {
        if (!current) return null;
        return rows.find((agent) => agent.id === current.id) ?? null;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to load agents');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const loadAgentReservations = useCallback(async (agent: AgentRecord) => {
    setReservationsLoading(true);
    setReservationError('');
    setAgentReservations([]);

    try {
      const budgets: BudgetResponse[] = await fetchBudgets();
      const agentBudget = budgets.find((item) => item.agent_id === agent.id && item.is_active);

      if (!agentBudget) {
        setAgentReservations([]);
        return;
      }

      const reservations = await fetchBudgetReservations(agentBudget.id);
      setAgentReservations(reservations);
    } catch (e) {
      setReservationError(e instanceof Error ? e.message : 'Unable to load reservation history');
    } finally {
      setReservationsLoading(false);
    }
  }, []);

  const loadAgentPurchases = useCallback(async (agent: AgentRecord) => {
    setPurchasesLoading(true);
    setPurchaseError('');
    setAgentPurchases([]);

    try {
      const purchases = await fetchPurchases({ skip: 0, limit: 100 });
      setAgentPurchases(purchases.filter((purchase) => purchase.agent_id === agent.id));
    } catch (e) {
      setPurchaseError(e instanceof Error ? e.message : 'Unable to load procurement activity');
    } finally {
      setPurchasesLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => {
      void refresh();
    }, 10000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    setRawKey('');

    try {
      const created = await createAgent({
        name,
        budget: Number(budget),
        max_single_purchase: Number(singleLimit),
        approval_threshold: Number(approvalThreshold),
        allowed_vendors: vendors
          .split(',')
          .map((vendor) => vendor.trim())
          .filter(Boolean),
      });

      setCreatedAgent(created.name);
      setRawKey(created.raw_api_key);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Agent provisioning failed');
    } finally {
      setBusy(false);
    }
  };

  const openAgentDetails = (agent: AgentRecord) => {
    setSelectedAgent(agent);
    void loadAgentReservations(agent);
    void loadAgentPurchases(agent);
  };

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
              AGENT IDENTITIES
            </span>
          </div>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-[#EBEBEB]">
            Autonomous Agent Registry
          </h2>
          <p className="mt-1 text-xs text-[#9EA1A5]">
            Provision agent cryptographic identities, enforce policy assignments, and monitor active capital commitments.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#202020] px-3 py-1.5 text-xs font-mono text-[#9EA1A5]">
            {agents.length} AGENTS PROVISIONED
          </span>
          <button
            type="button"
            onClick={() => void refresh()}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#202020] px-3.5 py-2 text-xs font-medium text-[#EBEBEB] transition-colors hover:border-[#00F0FF]/40 hover:text-[#00F0FF] disabled:opacity-50"
          >
            <IconRefresh className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin text-[#00F0FF]' : ''}`} />
            <span>{refreshing ? 'Syncing…' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* ERROR */}
      {error && (
        <div role="alert" className="rounded-xl border border-[rgba(239,68,68,0.3)] bg-[rgba(239,68,68,0.08)] p-4 text-xs text-[#EF4444]">
          <span className="font-mono font-bold mr-2">REGISTRY ERROR:</span>
          {error}
        </div>
      )}

      {/* CREATE AGENT FORM */}
      <div className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#181818] p-6 space-y-6">
        <div className="border-b border-[rgba(255,255,255,0.06)] pb-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-[#EBEBEB] font-mono flex items-center gap-2">
              <IconBot className="h-4 w-4 text-[#00F0FF]" />
              Provision New Autonomous Agent
            </h3>
            <span className="rounded border border-[rgba(255,255,255,0.06)] bg-[#121212] px-2 py-0.5 text-[10px] font-mono text-[#777777]">
              POST /api/v1/agents
            </span>
          </div>
          <p className="mt-1 text-xs text-[#9EA1A5]">
            Atomically creates the agent record, provisions an individual policy version, and binds an initial dedicated budget.
          </p>
        </div>

        <form onSubmit={submit} className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-[#9EA1A5] font-mono">
                Agent Display Name
              </label>
              <input
                required
                minLength={2}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputClass}
                placeholder="Agent identity name"
              />
            </div>

            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-[#9EA1A5] font-mono">
                Dedicated Budget (USD)
              </label>
              <input
                required
                min="0.01"
                step="0.01"
                type="number"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-[#9EA1A5] font-mono">
                Single Purchase Cap (USD)
              </label>
              <input
                required
                min="0.01"
                step="0.01"
                type="number"
                value={singleLimit}
                onChange={(e) => setSingleLimit(e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-[#9EA1A5] font-mono">
                Auto-Approval Threshold (USD)
              </label>
              <input
                required
                min="0"
                step="0.01"
                type="number"
                value={approvalThreshold}
                onChange={(e) => setApprovalThreshold(e.target.value)}
                className={inputClass}
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium uppercase tracking-wider text-[#9EA1A5] font-mono">
                Allowed Suppliers (Comma-separated)
              </label>
              <input
                required
                value={vendors}
                onChange={(e) => setVendors(e.target.value)}
                className={inputClass}
                placeholder="mock_supplier_a, mock_supplier_b"
              />
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t border-[rgba(255,255,255,0.06)] pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[11px] font-mono text-[#777777]">
              Deterministic policy rules are compiled and row-locked on PostgreSQL.
            </p>

            <button
              type="submit"
              disabled={busy}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#00F0FF] px-6 text-xs font-mono font-bold uppercase tracking-wider text-[#121212] transition-colors hover:bg-[#38bdf8] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? 'Provisioning Invariants…' : 'Provision Agent + Policy + Budget'}
            </button>
          </div>
        </form>
      </div>

      {/* ONE-TIME API KEY VAULT REVEAL */}
      {rawKey && (
        <div className="rounded-2xl border border-[rgba(245,185,66,0.3)] bg-[rgba(245,185,66,0.06)] p-6 space-y-3">
          <div className="flex items-center gap-2">
            <IconLock className="h-4 w-4 text-[#F5B942]" />
            <h3 className="text-sm font-semibold uppercase tracking-wider text-[#F5B942] font-mono">
              One-Time Cryptographic Agent Key Issued for {createdAgent}
            </h3>
          </div>

          <p className="text-xs text-[#9EA1A5] leading-relaxed">
            The AEON backend exposes this key only once upon generation. Stored as an SHA-256 hash in the database.
            Copy this key to your agent runtime immediately. It cannot be recovered later.
          </p>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center pt-2">
            <code className="min-w-0 flex-1 break-all rounded-xl border border-[rgba(255,255,255,0.1)] bg-[#121212] p-3.5 font-mono text-xs text-[#1DB954]">
              {rawKey}
            </code>

            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                onClick={() => void navigator.clipboard.writeText(rawKey)}
                className="h-10 rounded-lg bg-[#1DB954] px-4 font-mono text-xs font-bold text-black hover:bg-[#18A148]"
              >
                Copy Key
              </button>
              <button
                type="button"
                onClick={() => setRawKey('')}
                className="h-10 rounded-lg border border-[rgba(255,255,255,0.1)] bg-[#202020] px-4 font-mono text-xs text-[#9EA1A5] hover:text-white"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REGISTERED AGENTS GRID */}
      {loading ? (
        <div className="py-16 text-center text-xs text-[#777777] font-mono">
          Loading agent registry…
        </div>
      ) : agents.length === 0 ? (
        <EmptyState
          title="No Agents Registered"
          description="Provision your first autonomous procurement agent using the form above."
          illustration="agents"
        />
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {agents.map((agent) => {
            const used = Math.max(0, agent.spent_amount + agent.reserved_amount);
            const pct = agent.budget > 0 ? Math.min(100, (used / agent.budget) * 100) : 0;

            return (
              <article
                key={agent.id}
                className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#181818] p-5.5 transition-all hover:border-[rgba(255,255,255,0.14)]"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold tracking-tight text-[#EBEBEB]">
                      {agent.name}
                    </h3>
                    <p className="mt-1 break-all font-mono text-[10px] text-[#777777]">
                      {agent.id}
                    </p>
                  </div>
                  <StatusBadge value={agent.is_active ? 'ACTIVE' : 'INACTIVE'} />
                </div>

                {/* Balances */}
                <div className="mt-4 grid grid-cols-2 gap-2 text-xs font-mono">
                  <div className="rounded-xl border border-[rgba(255,255,255,0.05)] bg-[#141414] p-3">
                    <p className="text-[10px] uppercase text-[#777777]">Allocated</p>
                    <p className="mt-1 tabular-nums font-bold text-[#EBEBEB]">
                      {money(agent.budget, agent.currency)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-[rgba(29,185,84,0.2)] bg-[#141414] p-3">
                    <p className="text-[10px] uppercase text-[#1DB954]">Available</p>
                    <p className="mt-1 tabular-nums font-bold text-[#1DB954]">
                      {money(agent.remaining_budget, agent.currency)}
                    </p>
                  </div>
                </div>

                {/* Utilization Progress Bar */}
                <div className="mt-4 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="text-[#777777]">Committed Capital</span>
                    <span className="tabular-nums text-[#9EA1A5]">{pct.toFixed(1)}%</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#121212] border border-[rgba(255,255,255,0.04)]">
                    <div
                      className="h-full rounded-full bg-[#1657AD] transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                {/* Metadata */}
                <div className="mt-4 border-t border-[rgba(255,255,255,0.06)] pt-3 text-[11px] font-mono text-[#777777] space-y-1">
                  <div className="flex items-center justify-between">
                    <span>Policy:</span>
                    <span className="text-[#00F0FF]">{agent.assigned_policy_name || 'Tier-1 Default'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Suppliers:</span>
                    <span className="text-[#9EA1A5]">{agent.allowed_vendors.length} vendors</span>
                  </div>
                </div>

                {/* Action button */}
                <button
                  type="button"
                  onClick={() => openAgentDetails(agent)}
                  className="mt-4 inline-flex h-9 w-full items-center justify-center rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#202020] text-xs font-mono font-medium text-[#EBEBEB] transition-colors hover:border-[#00F0FF]/40 hover:text-[#00F0FF]"
                >
                  Inspect Agent Telemetry &amp; Escrow
                </button>
              </article>
            );
          })}
        </div>
      )}

      {/* AGENT DETAIL DRAWER */}
      <Drawer
        isOpen={Boolean(selectedAgent)}
        onClose={() => setSelectedAgent(null)}
        title={selectedAgent?.name || 'Agent Details'}
        subtitle={`ID: ${selectedAgent?.id || ''}`}
        badge={<StatusBadge value={selectedAgent?.is_active ? 'ACTIVE' : 'INACTIVE'} />}
      >
        {selectedAgent && (
          <div className="space-y-6">
            {/* Budget Positions */}
            <div className="grid grid-cols-2 gap-3 text-xs font-mono">
              <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#141414] p-3.5">
                <span className="text-[10px] uppercase text-[#777777]">Total Allocated</span>
                <p className="mt-1 text-base font-bold tabular-nums text-[#EBEBEB]">
                  {money(selectedAgent.budget, selectedAgent.currency)}
                </p>
              </div>
              <div className="rounded-xl border border-[rgba(29,185,84,0.2)] bg-[#141414] p-3.5">
                <span className="text-[10px] uppercase text-[#1DB954]">Available Liquidity</span>
                <p className="mt-1 text-base font-bold tabular-nums text-[#1DB954]">
                  {money(selectedAgent.remaining_budget, selectedAgent.currency)}
                </p>
              </div>
            </div>

            {/* Allowed Vendors List */}
            <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#141414] p-4">
              <span className="text-[11px] font-mono uppercase tracking-wider text-[#777777]">
                Approved Supplier Allow-List
              </span>
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {selectedAgent.allowed_vendors.map((v) => (
                  <span
                    key={v}
                    className="rounded-md border border-[rgba(255,255,255,0.08)] bg-[#1C1C1C] px-2.5 py-1 font-mono text-[11px] text-[#EBEBEB]"
                  >
                    ✓ {v}
                  </span>
                ))}
              </div>
            </div>

            {/* Escrow Reservations */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-mono uppercase tracking-wider text-[#EBEBEB]">
                  Active Budget Escrows
                </h4>
                <span className="text-[10px] font-mono text-[#777777]">
                  {agentReservations.length} Locks
                </span>
              </div>

              {reservationsLoading ? (
                <div className="py-6 text-center text-xs font-mono text-[#777777]">Loading escrows…</div>
              ) : agentReservations.length === 0 ? (
                <div className="rounded-xl border border-[rgba(255,255,255,0.04)] bg-[#141414] p-4 text-center text-xs font-mono text-[#777777]">
                  No active budget reservations
                </div>
              ) : (
                <div className="space-y-2">
                  {agentReservations.map((r) => (
                    <div
                      key={r.id}
                      className="flex items-center justify-between rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#141414] p-3 text-xs font-mono"
                    >
                      <div>
                        <span className="tabular-nums font-bold text-[#EBEBEB]">
                          {money(Number(r.amount), r.currency)}
                        </span>
                        <p className="text-[10px] text-[#777777]">Lock: {r.id.slice(0, 8)}…</p>
                      </div>
                      <StatusBadge value={r.status} />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Procurement History */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-mono uppercase tracking-wider text-[#EBEBEB]">
                  Agent Procurement History
                </h4>
                <span className="text-[10px] font-mono text-[#777777]">
                  {agentPurchases.length} Purchases
                </span>
              </div>

              {purchasesLoading ? (
                <div className="py-6 text-center text-xs font-mono text-[#777777]">Loading history…</div>
              ) : agentPurchases.length === 0 ? (
                <div className="rounded-xl border border-[rgba(255,255,255,0.04)] bg-[#141414] p-4 text-center text-xs font-mono text-[#777777]">
                  No recorded procurement requests
                </div>
              ) : (
                <div className="space-y-2">
                  {agentPurchases.map((p) => (
                    <div
                      key={p.id}
                      className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#141414] p-3 text-xs font-mono space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[#EBEBEB] font-semibold truncate max-w-[200px]">{p.item_description}</span>
                        <StatusBadge value={p.status} />
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-[#777777]">
                        <span>Budget Cap: ${Number(p.max_budget).toFixed(2)}</span>
                        <span>{new Date(p.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Drawer>
    </section>
  );
}
