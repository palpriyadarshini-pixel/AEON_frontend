
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

const money = (n: number, currency = 'USD') =>
  new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
  }).format(n);

const cardClass =
  'rounded-lg border border-slate-700/60 bg-[#1A222C] p-5';

const inputClass =
  'mt-2 h-11 w-full rounded-md border border-slate-700 bg-[#0B1220] px-3 text-sm text-slate-200 outline-none transition-colors placeholder:text-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500';

export function AgentDirectory() {
  const [agents, setAgents] = useState<AgentRecord[]>([]);
  const [name, setName] = useState('Research Agent');
  const [budget, setBudget] = useState('10');
  const [singleLimit, setSingleLimit] = useState('5');
  const [vendors, setVendors] = useState(
    'mock_supplier_a, mock_supplier_b',
  );

  const [rawKey, setRawKey] = useState('');
  const [createdAgent, setCreatedAgent] = useState('');
  const [selectedAgent, setSelectedAgent] =
    useState<AgentRecord | null>(null);

  const [agentReservations, setAgentReservations] =
    useState<BudgetReservationResponse[]>([]);
  const [reservationsLoading, setReservationsLoading] =
    useState(false);
  const [reservationError, setReservationError] = useState('');

  const [agentPurchases, setAgentPurchases] =
    useState<Awaited<ReturnType<typeof fetchPurchases>>>([]);
  const [purchasesLoading, setPurchasesLoading] =
    useState(false);
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

    // Keep the selected agent details in sync with refreshed data.
    setSelectedAgent((current) => {
      if (!current) return null;

      return rows.find((agent) => agent.id === current.id) ?? null;
    });
  } catch (e) {
    setError(
      e instanceof Error ? e.message : 'Unable to load agents',
    );
  } finally {
    setLoading(false);
    setRefreshing(false);
  }
}, []);
  const loadAgentReservations = useCallback(
    async (agent: AgentRecord) => {
      setReservationsLoading(true);
      setReservationError('');
      setAgentReservations([]);

      try {
        const budgets: BudgetResponse[] = await fetchBudgets();

        const agentBudget = budgets.find(
          (item) => item.agent_id === agent.id && item.is_active,
        );

        if (!agentBudget) {
          setAgentReservations([]);
          return;
        }

        const reservations = await fetchBudgetReservations(
          agentBudget.id,
        );

        setAgentReservations(reservations);
      } catch (e) {
        setReservationError(
          e instanceof Error
            ? e.message
            : 'Unable to load reservation history',
        );
      } finally {
        setReservationsLoading(false);
      }
    },
    [],
  );

  const loadAgentPurchases = useCallback(
    async (agent: AgentRecord) => {
      setPurchasesLoading(true);
      setPurchaseError('');
      setAgentPurchases([]);

      try {
        const purchases = await fetchPurchases({
          skip: 0,
          limit: 100,
        });

        setAgentPurchases(
          purchases.filter(
            (purchase) => purchase.agent_id === agent.id,
          ),
        );
      } catch (e) {
        setPurchaseError(
          e instanceof Error
            ? e.message
            : 'Unable to load procurement activity',
        );
      } finally {
        setPurchasesLoading(false);
      }
    },
    [],
  );

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
        allowed_vendors: vendors
          .split(',')
          .map((vendor) => vendor.trim())
          .filter(Boolean),
      });

      setCreatedAgent(created.name);
      setRawKey(created.raw_api_key);

      await refresh();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'Agent provisioning failed',
      );
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
    <section className="space-y-6 pt-3">

      {/* PAGE HEADER */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-1 text-xs font-medium uppercase tracking-wider text-slate-500">
            AEON / Agent Management
          </p>

          <h2 className="text-2xl font-semibold tracking-tight text-white">
            Agent Directory
          </h2>

          <p className="mt-1 text-sm text-slate-400">
            Manage agent identities, spending limits, budgets and permissions.
          </p>
        </div>

        <span className="text-xs text-slate-500">
          {agents.length} registered agents
        </span>
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

      {/* CREATE AGENT */}
      <div className={cardClass}>
        <div className="mb-5 border-b border-slate-800 pb-4">
          <h3 className="text-base font-semibold text-white">
            Provision new agent
          </h3>
          <p className="mt-1 text-xs text-slate-400">
            Configure agent identity, budget limits and supplier permissions.
          </p>
        </div>

        <form onSubmit={submit} className="space-y-5">

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">

            <label className="block text-sm text-slate-400">
              Agent name
              <input
                required
                minLength={2}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputClass}
                placeholder="Enter agent name"
              />
            </label>

            <label className="block text-sm text-slate-400">
              Allocated budget (USD)
              <input
                required
                min="0.01"
                step="0.01"
                type="number"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                className={inputClass}
              />
            </label>

            <label className="block text-sm text-slate-400">
              Maximum single purchase (USD)
              <input
                required
                min="0.01"
                step="0.01"
                type="number"
                value={singleLimit}
                onChange={(e) => setSingleLimit(e.target.value)}
                className={inputClass}
              />
            </label>

            <label className="block text-sm text-slate-400">
              Allowed suppliers
              <input
                required
                value={vendors}
                onChange={(e) => setVendors(e.target.value)}
                className={inputClass}
                placeholder="supplier_a, supplier_b"
              />
            </label>

          </div>

          <div className="flex flex-col gap-3 border-t border-slate-800 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-slate-500">
              Agent identity, policy and budget are provisioned by the backend.
            </p>

            <button
              type="submit"
              disabled={busy}
              className="inline-flex h-11 items-center justify-center rounded-md bg-[#3C50E0] px-5 text-sm font-medium text-white transition-colors hover:bg-[#3045CF] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? 'Provisioning...' : 'Create agent + policy + budget'}
            </button>
          </div>

        </form>
      </div>

      {/* ONE-TIME API KEY */}
      {rawKey && (
        <div className="rounded-lg border border-amber-700/50 bg-[#1A222C] p-5">

          <h3 className="text-sm font-semibold text-amber-300">
            One-time agent API key created for {createdAgent}
          </h3>

          <p className="mt-2 text-xs leading-5 text-slate-400">
            The FastAPI backend returns this raw key only once.
            Copy it to your secure agent configuration now.
            It cannot be recovered from the backend.
          </p>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">

            <code className="min-w-0 flex-1 break-all rounded-md border border-slate-700 bg-[#0B1220] p-3 font-mono text-xs text-emerald-300">
              {rawKey}
            </code>

            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                onClick={() => void navigator.clipboard.writeText(rawKey)}
                className="h-10 rounded-md border border-amber-700 px-4 text-xs font-medium text-amber-300 transition-colors hover:bg-amber-950/30"
              >
                Copy key
              </button>

              <button
                type="button"
                onClick={() => setRawKey('')}
                className="h-10 rounded-md border border-slate-700 px-4 text-xs text-slate-300 hover:bg-slate-800"
              >
                Hide
              </button>
            </div>

          </div>
        </div>
      )}

      {/* REGISTERED AGENTS */}
      <div className="flex flex-col gap-3 border-b border-slate-800 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-base font-semibold text-white">
            Registered agents
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            Identity, budget allocation and policy configuration
          </p>
        </div>

        <button
          type="button"
          onClick={() => void refresh()}
          disabled={refreshing}
          className="inline-flex h-9 items-center justify-center rounded-md border border-slate-700 px-4 text-xs font-medium text-slate-300 transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* LOADING AND EMPTY STATES */}
      {loading ? (
        <p className="py-8 text-center text-sm text-slate-400">
          Loading agent registry...
        </p>
      ) : agents.length === 0 ? (
        <div className="rounded-lg border border-slate-700/60 bg-[#1A222C] p-10 text-center">
          <h3 className="text-sm font-medium text-white">
            No agents registered
          </h3>
          <p className="mt-2 text-xs text-slate-500">
            Create your first agent using the provisioning form above.
          </p>
        </div>
      ) : (

        /* AGENT CARDS */
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">

          {agents.map((agent) => {
            const used = Math.max(
              0,
              agent.spent_amount + agent.reserved_amount,
            );

            const pct =
              agent.budget > 0
                ? Math.min(100, (used / agent.budget) * 100)
                : 0;

            return (
              <article
                key={agent.id}
                className="rounded-lg border border-slate-700/60 bg-[#1A222C] p-5 transition-colors hover:border-slate-600"
              >

                {/* CARD HEADER */}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-base font-semibold text-white">
                      {agent.name}
                    </h3>

                    <p className="mt-1 break-all font-mono text-[10px] text-slate-500">
                      {agent.id}
                    </p>
                  </div>

                  <span
                    className={`shrink-0 rounded border px-2 py-1 text-[10px] font-medium ${
                      agent.is_active
                        ? 'border-emerald-700/50 bg-emerald-950/30 text-emerald-400'
                        : 'border-red-700/50 bg-red-950/30 text-red-400'
                    }`}
                  >
                    {agent.is_active ? 'ACTIVE' : 'INACTIVE'}
                  </span>
                </div>

                {/* BUDGET METRICS */}
                <div className="mt-5 grid grid-cols-2 gap-3">

                  <div className="rounded-md border border-slate-700/50 bg-[#0B1220] p-3">
                    <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">
                      Allocated
                    </p>

                    <p className="mt-2 font-mono text-lg font-semibold text-white">
                      {money(agent.budget, agent.currency)}
                    </p>
                  </div>

                  <div className="rounded-md border border-slate-700/50 bg-[#0B1220] p-3">
                    <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">
                      Available
                    </p>

                    <p className="mt-2 font-mono text-lg font-semibold text-emerald-400">
                      {money(agent.remaining_budget, agent.currency)}
                    </p>
                  </div>

                </div>

                {/* BUDGET UTILIZATION */}
                <div className="mt-5">

                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs text-slate-400">
                      Spent + reserved
                    </span>

                    <span className="font-mono text-xs text-slate-300">
                      {pct.toFixed(1)}%
                    </span>
                  </div>

                  <div className="h-1.5 overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="h-full rounded-full bg-[#3C50E0] transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  <div className="mt-2 flex justify-between text-[10px] text-slate-500">
                    <span>
                      {money(used, agent.currency)} used
                    </span>
                    <span>
                      {money(agent.remaining_budget, agent.currency)} remaining
                    </span>
                  </div>

                </div>

                {/* SUPPLIERS AND POLICY */}
                <div className="mt-5 border-t border-slate-700/50 pt-4">

                  <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">
                    Allowed suppliers
                  </p>

                  <div className="mt-2 flex flex-wrap gap-2">
                    {agent.allowed_vendors.length > 0 ? (
                      agent.allowed_vendors.map((vendor) => (
                        <span
                          key={vendor}
                          className="rounded border border-slate-700 bg-[#0B1220] px-2 py-1 text-[10px] text-slate-300"
                        >
                          {vendor}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-slate-500">
                        No suppliers assigned
                      </span>
                    )}
                  </div>

                  <div className="mt-3">
                    <p className="text-[10px] uppercase tracking-wide text-slate-500">
                      Assigned policy
                    </p>

                    <p className="mt-1 text-xs text-slate-300">
                      {agent.assigned_policy_name ?? 'Not assigned'}
                    </p>
                  </div>

                </div>

                {/* REGISTRATION DATE */}
                <div className="mt-4 border-t border-slate-700/50 pt-3">
                  <p className="text-[10px] text-slate-500">
                    Registered {new Date(agent.created_at).toLocaleString()}
                  </p>
                </div>

                {/* DETAILS BUTTON */}
                <button
                  type="button"
                  onClick={() => openAgentDetails(agent)}
                  className="mt-4 inline-flex h-10 w-full items-center justify-center rounded-md border border-slate-700 px-3 text-sm font-medium text-slate-300 transition-colors hover:border-indigo-500/50 hover:bg-slate-800 hover:text-white"
                >
                  View agent details
                </button>

              </article>
            );
          })}

        </div>
      )}

      {/* AGENT DETAILS DRAWER */}
      {selectedAgent && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/65"
            onClick={() => setSelectedAgent(null)}
          />

          <aside
            className="fixed right-0 top-0 z-50 flex h-full w-full max-w-xl flex-col overflow-y-auto border-l border-slate-700/60 bg-[#101923] shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-label={`${selectedAgent.name} details`}
          >

            {/* DRAWER HEADER */}
            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-700/60 bg-[#101923] p-5">

              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                  Agent Registry / Details
                </p>

                <h2 className="mt-2 text-xl font-semibold text-white">
                  {selectedAgent.name}
                </h2>

                <p className="mt-1 break-all font-mono text-[10px] text-slate-500">
                  {selectedAgent.id}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedAgent(null)}
                className="shrink-0 rounded-md border border-slate-700 px-3 py-2 text-xs text-slate-300 transition-colors hover:bg-slate-800"
              >
                Close
              </button>

            </div>

            <div className="space-y-4 p-5">

              {/* STATUS */}
              <div className={cardClass}>
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Agent status
                </p>

                <p
                  className={`mt-2 text-sm font-semibold ${
                    selectedAgent.is_active
                      ? 'text-emerald-400'
                      : 'text-red-400'
                  }`}
                >
                  {selectedAgent.is_active ? 'ACTIVE' : 'INACTIVE'}
                </p>
              </div>

              {/* BUDGET SUMMARY */}
              <div className="grid grid-cols-2 gap-3">

                <div className={cardClass}>
                  <p className="text-xs text-slate-500">Allocated</p>
                  <p className="mt-2 font-mono text-lg font-semibold text-white">
                    {money(selectedAgent.budget, selectedAgent.currency)}
                  </p>
                </div>

                <div className={cardClass}>
                  <p className="text-xs text-slate-500">Available</p>
                  <p className="mt-2 font-mono text-lg font-semibold text-emerald-400">
                    {money(selectedAgent.remaining_budget, selectedAgent.currency)}
                  </p>
                </div>

                <div className={cardClass}>
                  <p className="text-xs text-slate-500">Spent</p>
                  <p className="mt-2 font-mono text-lg font-semibold text-amber-300">
                    {money(selectedAgent.spent_amount, selectedAgent.currency)}
                  </p>
                </div>

                <div className={cardClass}>
                  <p className="text-xs text-slate-500">Reserved</p>
                  <p className="mt-2 font-mono text-lg font-semibold text-orange-300">
                    {money(selectedAgent.reserved_amount, selectedAgent.currency)}
                  </p>
                </div>

              </div>

              {/* UTILIZATION */}
              <div className={cardClass}>
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold text-white">
                    Budget utilization
                  </h3>

                  <span className="font-mono text-sm text-slate-300">
                    {selectedAgent.budget > 0
                      ? (
                          ((selectedAgent.spent_amount +
                            selectedAgent.reserved_amount) /
                            selectedAgent.budget) *
                          100
                        ).toFixed(1)
                      : '0.0'}
                    %
                  </span>
                </div>

                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full bg-[#3C50E0] transition-all"
                    style={{
                      width: `${
                        selectedAgent.budget > 0
                          ? Math.min(
                              100,
                              ((selectedAgent.spent_amount +
                                selectedAgent.reserved_amount) /
                                selectedAgent.budget) *
                                100,
                            )
                          : 0
                      }%`,
                    }}
                  />
                </div>

                <p className="mt-2 text-xs text-slate-500">
                  Spent and reserved against total allocated budget.
                </p>
              </div>

              {/* POLICY CONFIGURATION */}
              <div className={cardClass}>
                <h3 className="text-sm font-semibold text-white">
                  Policy configuration
                </h3>

                <p className="mt-4 text-xs text-slate-500">
                  Assigned policy
                </p>

                <p className="mt-1 text-sm text-slate-200">
                  {selectedAgent.assigned_policy_name ?? 'Not assigned'}
                </p>

                <p className="mt-4 text-xs text-slate-500">
                  Allowed suppliers
                </p>

                <div className="mt-2 flex flex-wrap gap-2">
                  {selectedAgent.allowed_vendors.length > 0 ? (
                    selectedAgent.allowed_vendors.map((vendor) => (
                      <span
                        key={vendor}
                        className="rounded border border-slate-700 bg-[#0B1220] px-2 py-1 text-xs text-slate-300"
                      >
                        {vendor}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-500">
                      No suppliers assigned
                    </span>
                  )}
                </div>
              </div>

              {/* RESERVATION HISTORY */}
              <div className={cardClass}>
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold text-white">
                    Reservation history
                  </h3>

                  <span className="text-xs text-slate-500">
                    {agentReservations.length} records
                  </span>
                </div>

                {reservationsLoading ? (
                  <p className="mt-4 text-xs text-slate-400">
                    Loading reservations...
                  </p>
                ) : reservationError ? (
                  <p className="mt-4 text-xs text-red-400">
                    {reservationError}
                  </p>
                ) : agentReservations.length === 0 ? (
                  <p className="mt-4 text-xs text-slate-500">
                    No reservations found for this agent.
                  </p>
                ) : (
                  <div className="mt-4 space-y-3">
                    {agentReservations.map((reservation) => (
                      <div
                        key={reservation.id}
                        className="rounded-md border border-slate-700/50 bg-[#0B1220] p-3"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-semibold text-white">
                            {money(
                              Number(reservation.amount),
                              reservation.currency,
                            )}
                          </span>

                          <span
                            className={`rounded border px-2 py-1 text-[10px] font-semibold ${
                              reservation.status === 'ACTIVE'
                                ? 'border-amber-700/50 bg-amber-950/30 text-amber-300'
                                : reservation.status === 'SETTLED'
                                  ? 'border-emerald-700/50 bg-emerald-950/30 text-emerald-300'
                                  : 'border-slate-700 bg-slate-900 text-slate-300'
                            }`}
                          >
                            {reservation.status}
                          </span>
                        </div>

                        <p className="mt-3 break-all font-mono text-[10px] text-slate-500">
                          Reservation: {reservation.id}
                        </p>

                        <p className="mt-1 break-all font-mono text-[10px] text-slate-500">
                          Purchase: {reservation.purchase_request_id}
                        </p>

                        <p className="mt-2 text-[10px] text-slate-500">
                          Created: {new Date(
                            reservation.created_at,
                          ).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* PROCUREMENT ACTIVITY */}
              <div className={cardClass}>
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold text-white">
                    Procurement activity
                  </h3>

                  <span className="text-xs text-slate-500">
                    {agentPurchases.length} requests
                  </span>
                </div>

                {purchasesLoading ? (
                  <p className="mt-4 text-xs text-slate-400">
                    Loading procurement activity...
                  </p>
                ) : purchaseError ? (
                  <p className="mt-4 text-xs text-red-400">
                    {purchaseError}
                  </p>
                ) : agentPurchases.length === 0 ? (
                  <p className="mt-4 text-xs text-slate-500">
                    No procurement requests found for this agent.
                  </p>
                ) : (
                  <div className="mt-4 space-y-3">
                    {agentPurchases.map((purchase) => (
                      <div
                        key={purchase.id}
                        className="rounded-md border border-slate-700/50 bg-[#0B1220] p-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-white">
                              {purchase.item_description}
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                              {purchase.category}
                            </p>
                          </div>

                          <span className="shrink-0 rounded border border-slate-700 px-2 py-1 text-[10px] text-slate-300">
                            {purchase.status}
                          </span>
                        </div>

                        <div className="mt-3 flex items-center justify-between gap-2">
                          <span className="text-sm font-semibold text-white">
                            {money(
                              Number(purchase.max_budget),
                              purchase.currency,
                            )}
                          </span>

                          <span className="text-[10px] text-slate-500">
                            {purchase.fulfillment_status}
                          </span>
                        </div>

                        <p className="mt-2 break-all font-mono text-[10px] text-slate-500">
                          {purchase.id}
                        </p>

                        <p className="mt-1 text-[10px] text-slate-500">
                          {new Date(purchase.created_at).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* REGISTRATION DETAILS */}
              <div className={cardClass}>
                <h3 className="text-sm font-semibold text-white">
                  Registration details
                </h3>

                <p className="mt-3 text-xs text-slate-500">
                  Registered
                </p>

                <p className="mt-1 text-sm text-slate-300">
                  {new Date(
                    selectedAgent.created_at,
                  ).toLocaleString()}
                </p>
              </div>

            </div>
          </aside>
        </>
      )}

    </section>
  );
}
