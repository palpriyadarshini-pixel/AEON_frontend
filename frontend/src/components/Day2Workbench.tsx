import { FormEvent, useEffect, useState } from 'react';
import { AgentRecord, approvePurchase, createPayPalOrder, fetchAgents, PurchaseResult, submitPurchase } from '../services/api';

export function Day2Workbench() {
  const [agents, setAgents] = useState<AgentRecord[]>([]);
  const [agentId, setAgentId] = useState('');
  const [amount, setAmount] = useState('4');
  const [description, setDescription] = useState('Standard cloud API data package');
  const [category, setCategory] = useState('compute');
  const [result, setResult] = useState<PurchaseResult | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [checkoutMessage, setCheckoutMessage] = useState('');
  const [refreshingAgents, setRefreshingAgents] = useState(false);
  const [agentRefreshMessage, setAgentRefreshMessage] = useState('');

  const refreshAgents = async () => {
  setRefreshingAgents(true);
  setError('');
  setAgentRefreshMessage('');

  try {
    const rows = await fetchAgents();

    setAgents(rows);

    // Preserve the selected agent if it still exists.
    const selectedAgentExists = rows.some(
      (agent) => agent.id === agentId
    );

    if (!selectedAgentExists) {
      setAgentId(rows.length > 0 ? rows[0].id : '');
    }

    setAgentRefreshMessage(
      rows.length > 0
        ? `${rows.length} agent(s) loaded successfully.`
        : 'No agents are currently available.'
    );
  } catch (e) {
    setError(
      e instanceof Error ? e.message : 'Could not load agents'
    );
  } finally {
    setRefreshingAgents(false);
  }
};
  useEffect(() => { void refreshAgents(); }, []);

  const purchase = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setError(''); setResult(null); setCheckoutMessage('');
    try {
      const response = await submitPurchase({ agent_id: agentId, amount: Number(amount), item_description: description, category });
      setResult(response); await refreshAgents();
    } catch (e) { setError(e instanceof Error ? e.message : 'Purchase request failed'); }
    finally { setBusy(false); }
  };

  const approveAndPay = async () => {
    if (!result || result.decision === 'BLOCKED') return;
    setBusy(true); setError(''); setCheckoutMessage('Submitting human approval, if required by policy…');
    try {
      await approvePurchase(result.transaction.id);
      setCheckoutMessage('Creating PayPal Orders v2 checkout…');
      const order = await createPayPalOrder(result.transaction.id);
      setCheckoutMessage(`PayPal order ${order.orderID} created. Redirecting to Sandbox…`);
      window.location.assign(order.approvalUrl);
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not start PayPal checkout'); setCheckoutMessage(''); }
    finally { setBusy(false); }
  };

  return <section className="space-y-6 pt-3">
    
<div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
  <div>
    <p className="mb-1 text-xs font-medium uppercase tracking-wider text-slate-500">
      AEON / Procurement
    </p>
    <h2 className="text-2xl font-semibold tracking-tight text-white">
      Procurement Management
    </h2>
    <p className="mt-2 text-sm text-slate-400">
      Manage procurement requests, supplier quotes and payment authorization.
    </p>
  </div>

  <div className="flex flex-col items-end gap-2">
  <button
    type="button"
    onClick={() => void refreshAgents()}
    disabled={refreshingAgents}
    className="inline-flex items-center justify-center rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:border-indigo-500 hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
  >
    {refreshingAgents ? 'Refreshing...' : 'Refresh agents'}
  </button>

  {agentRefreshMessage && (
    <p className="text-xs text-emerald-400" role="status">
      {agentRefreshMessage}
    </p>
  )}
</div>
</div>

    {error && <div role="alert" className="rounded-lg border border-red-800 bg-red-950/40 p-3 text-sm text-red-300">{error}</div>}
    <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-2">
      
<div className="rounded-lg border border-slate-700/60 bg-[#1A222C] p-5">
  <div className="mb-5 border-b border-slate-800 pb-4">
  <h3 className="text-base font-semibold text-white">
    New procurement request
  </h3>
  <p className="mt-1 text-sm text-slate-400">
    Create and submit a purchase request
  </p>
</div>

  <p className="mb-5 text-xs leading-5 text-slate-500">
  Supplier quotes and policy decisions are processed by the AEON backend.
</p>

  <form onSubmit={purchase} className="space-y-5">
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-300">
        Procurement agent
      </span>
      <select
        required
        value={agentId}
        onChange={(e) => setAgentId(e.target.value)}
        className="h-11 w-full rounded-md border border-slate-700 bg-[#0B1220] px-3 text-sm text-slate-200 outline-none transition-colors focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
        >
        <option value="">Select an agent</option>
        {agents.map((a) => (
          <option key={a.id} value={a.id}>
            {a.name} · ${a.remaining_budget.toFixed(2)} available
          </option>
        ))}
      </select>
    </label>

    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-300">
        Service / item description
      </span>
      <input
        required
        minLength={2}
        maxLength={255}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Enter the item or service description"
        className="h-11 w-full rounded-md border border-slate-700 bg-[#0B1220] px-3 text-sm text-slate-200 outline-none transition-colors placeholder:text-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
        />
    </label>

    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
      <label className="block">
        <span className="mb-2 block text-sm font-medium text-slate-300">
          Category
        </span>
        <input
          required
          minLength={2}
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder="e.g. compute"
          className="h-11 w-full rounded-md border border-slate-700 bg-[#0B1220] px-3 text-sm text-slate-200 outline-none transition-colors placeholder:text-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
      </label>

      <label className="block">
        <span className="mb-2 block text-sm font-medium text-slate-300">
          Maximum budget (USD)
        </span>
        <input
          required
          min="0.01"
          step="0.01"
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="h-11 w-full rounded-md border border-slate-700 bg-[#0B1220] px-3 text-sm text-slate-200 outline-none transition-colors placeholder:text-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
      </label>
    </div>

    <div className="border-t border-slate-800 pt-5">
      <button
        disabled={busy || !agents.length || !agentId}
        className="inline-flex h-11 w-full items-center justify-center rounded-md bg-[#3C50E0] px-5 text-sm font-medium text-white transition-colors hover:bg-[#3045CF] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"      
      >
        {busy ? 'Processing request…' : 'Submit procurement request'}
      </button>
      <p className="mt-3 text-xs text-slate-500">
        Requests are evaluated by the AEON backend policy engine.
      </p>
    </div>
  </form>
</div>

      
<div className="rounded-lg border border-slate-700/60 bg-[#1A222C] p-5">
  <div className="mb-6 border-b border-slate-800 pb-5">
    <div className="mb-5 border-b border-slate-800 pb-4">
  <h3 className="text-base font-semibold text-white">
    Procurement decision
  </h3>
  <p className="mt-1 text-sm text-slate-400">
    Policy evaluation and supplier recommendation
  </p>
</div>
  </div>

  {!result ? (
  <div className="flex min-h-[180px] flex-col justify-center px-2">
    <div className="mb-3 h-px w-full bg-slate-800" />
    <p className="text-sm font-medium text-slate-300">
      No procurement request selected
    </p>
    <p className="mt-2 max-w-sm text-xs leading-5 text-slate-500">
      Submit a procurement request to view its evaluation, supplier quotes
      and authorization status here.
    </p>
  </div>
) : (
    <div
      role="status"
      className={`rounded-lg border p-5 ${
        result.decision === 'BLOCKED'
          ? 'border-red-700/50 bg-red-950/20'
          : result.decision === 'REQUIRES_APPROVAL'
            ? 'border-amber-700/50 bg-amber-950/20'
            : 'border-emerald-700/50 bg-emerald-950/20'
      }`}
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <span
          className={`rounded-md px-3 py-1.5 text-xs font-bold ${
            result.decision === 'BLOCKED'
              ? 'bg-red-500/10 text-red-400'
              : result.decision === 'REQUIRES_APPROVAL'
                ? 'bg-amber-500/10 text-amber-400'
                : 'bg-emerald-500/10 text-emerald-400'
          }`}
        >
          {result.decision === 'BLOCKED'
            ? 'BLOCKED BY POLICY'
            : result.decision === 'REQUIRES_APPROVAL'
              ? 'REQUIRES HUMAN APPROVAL'
              : 'POLICY AUTHORIZED'}
        </span>
      </div>

      <p className="text-sm leading-6 text-slate-200">
        {result.message}
      </p>

      <div className="mt-4 rounded-lg border border-slate-800 bg-slate-950/60 p-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
          Purchase request ID
        </p>
        <p className="mt-1 break-all font-mono text-xs text-slate-300">
          {result.transaction.id}
        </p>
      </div>

      <div className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h4 className="text-sm font-semibold text-white">
            Supplier quote comparison
          </h4>
          <span className="text-[10px] text-slate-500">
            Backend supplied
          </span>
        </div>

        <div className="overflow-x-auto rounded-lg border border-slate-800">
          <table className="w-full min-w-[420px] text-left text-xs">
            <thead className="bg-slate-800/70 text-[10px] uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-3 py-3 font-semibold">Supplier</th>
                <th className="px-3 py-3 font-semibold">Price</th>
                <th className="px-3 py-3 font-semibold">Delivery</th>
                <th className="px-3 py-3 font-semibold">Currency</th>
              </tr>
            </thead>
            <tbody>
  {result.quotes.length > 0 ? (
    result.quotes.map((q) => (
      <tr
        key={q.id}
        className="border-t border-slate-800 text-slate-300"
      >
        <td className="px-3 py-3 font-medium text-white">
          {q.provider}
        </td>
        <td className="px-3 py-3">
          {q.price.toFixed(2)}
        </td>
        <td className="px-3 py-3">
          {q.delivery_latency_hours
            ? `${q.delivery_latency_hours / 24} days`
            : '—'}
        </td>
        <td className="px-3 py-3">{q.currency}</td>
      </tr>
    ))
  ) : (
    <tr>
      <td
        colSpan={4}
        className="px-3 py-6 text-center text-sm text-slate-500"
      >
        No supplier quotes returned for this request.
      </td>
    </tr>
  )}
</tbody>
          </table>
        </div>
      </div>

      {result.recommendation?.recommended_vendor?.trim() &&
        result.recommendation.price > 0 ? (
  <div className="mt-5 rounded-lg border border-slate-700 bg-[#0B1220] p-4">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h4 className="text-sm font-semibold text-white">
        Procurement recommendation
      </h4>
      <span className="rounded bg-slate-800 px-2 py-1 text-[10px] font-medium uppercase text-slate-400">
        {result.recommendation.source}
      </span>
    </div>

    <p className="mt-4 text-sm font-semibold text-slate-200">
      {result.recommendation.recommended_vendor}
    </p>

    <p className="mt-1 text-xl font-semibold text-white">
      ${result.recommendation.price.toFixed(2)}
    </p>

    {result.recommendation.rationale?.length > 0 && (
      <ul className="mt-3 list-disc space-y-2 pl-5 text-xs leading-5 text-slate-400">
        {result.recommendation.rationale.map((line, i) => (
          <li key={i}>{line}</li>
        ))}
      </ul>
    )}
  </div>
) : (
  <div className="mt-5 rounded-lg border border-slate-700 bg-[#0B1220] p-4">
    <h4 className="text-sm font-semibold text-white">
      Procurement recommendation
    </h4>
    <p className="mt-2 text-sm text-slate-400">
      No supplier recommendation is available for this request.
    </p>
  </div>
)}

      {result.decision !== 'BLOCKED' && (
        <button
          type="button"
          disabled={busy}
          onClick={() => void approveAndPay()}
          className="mt-6 w-full rounded-lg bg-[#0070BA] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#005EA6] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? 'Starting checkout…' : 'Human Review & Continue to PayPal'}
        </button>
      )}

      {checkoutMessage && (
        <div
          className="mt-4 rounded-lg border border-indigo-500/30 bg-indigo-500/5 p-3 text-xs leading-5 text-indigo-200"
          role="status"
        >
          {checkoutMessage}
        </div>
      )}
    </div>
  )}
</div>

    </div>
  </section>;
}
