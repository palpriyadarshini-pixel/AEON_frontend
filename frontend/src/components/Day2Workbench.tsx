import { FormEvent, useEffect, useState } from 'react';
import {
  AgentRecord,
  approvePurchase,
  createPayPalOrder,
  fetchAgents,
  PurchaseResult,
  submitPurchase,
  hasAgentApiKey,
  setAgentApiKey,
  rotateAgentKey,
} from '../services/api';
import { StatusBadge } from './StatusBadge';
import { IconBot, IconFileText, IconScale, IconCreditCard, IconLock, IconRefresh } from './icons';

export function Day2Workbench() {
  const [agents, setAgents] = useState<AgentRecord[]>([]);
  const [agentId, setAgentId] = useState('');
  const [amount, setAmount] = useState('4.00');
  const [description, setDescription] = useState('High-throughput inference cluster compute');
  const [category, setCategory] = useState('compute');
  const [result, setResult] = useState<PurchaseResult | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [checkoutMessage, setCheckoutMessage] = useState('');
  const [refreshingAgents, setRefreshingAgents] = useState(false);
  const [agentRefreshMessage, setAgentRefreshMessage] = useState('');

  const [hasKey, setHasKey] = useState(false);
  const [rotatingKey, setRotatingKey] = useState(false);
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [customKeyInput, setCustomKeyInput] = useState('');
  const [keySuccessMessage, setKeySuccessMessage] = useState('');

  const updateKeyStatus = (id: string) => {
    if (!id) {
      setHasKey(false);
      return;
    }
    setHasKey(hasAgentApiKey(id));
  };

  const handleSelectAgent = (id: string) => {
    setAgentId(id);
    updateKeyStatus(id);
    setKeySuccessMessage('');
    setShowKeyInput(false);
  };

  const handleRotateKey = async () => {
    if (!agentId || rotatingKey) return;
    setRotatingKey(true);
    setError('');
    setKeySuccessMessage('');
    try {
      const res = await rotateAgentKey(agentId);
      setHasKey(true);
      setKeySuccessMessage(
        `New API key generated and loaded into this session (${res.key_prefix || res.raw_api_key.slice(0, 12)}…)`,
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to generate/rotate agent key',
      );
    } finally {
      setRotatingKey(false);
    }
  };

  const handleSaveCustomKey = () => {
    if (!agentId || !customKeyInput.trim()) return;
    setAgentApiKey(agentId, customKeyInput.trim());
    setHasKey(true);
    setShowKeyInput(false);
    setCustomKeyInput('');
    setKeySuccessMessage('Agent API key stored in this browser session.');
  };

  const refreshAgents = async () => {
    setRefreshingAgents(true);
    setError('');
    setAgentRefreshMessage('');

    try {
      const rows = await fetchAgents();
      setAgents(rows);

      const selectedAgentExists = rows.some((agent) => agent.id === agentId);
      if (!selectedAgentExists) {
        const nextId = rows.length > 0 ? rows[0].id : '';
        setAgentId(nextId);
        updateKeyStatus(nextId);
      } else {
        updateKeyStatus(agentId);
      }

      setAgentRefreshMessage(
        rows.length > 0
          ? `${rows.length} agent(s) ready.`
          : 'No agents currently provisioned.',
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load agents');
    } finally {
      setRefreshingAgents(false);
    }
  };

  useEffect(() => {
    void refreshAgents();
  }, []);

  const selectedAgent = agents.find((a) => a.id === agentId);

  const purchase = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    setResult(null);
    setCheckoutMessage('');
    try {
      const response = await submitPurchase({
        agent_id: agentId,
        amount: Number(amount),
        item_description: description,
        category,
      });
      setResult(response);
      await refreshAgents();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Purchase request failed');
    } finally {
      setBusy(false);
    }
  };

  const approveAndPay = async () => {
    if (!result || busy) return;

    // Hard policy block must NEVER be overridable
    if (result.decision === 'BLOCKED') {
      setError('Hard Policy Violation: Blocked purchases cannot be approved or forwarded to PayPal.');
      return;
    }

    setBusy(true);
    setError('');

    try {
      if (result.decision === 'REQUIRES_APPROVAL') {
        setCheckoutMessage('Recording human authorization verdict…');
        await approvePurchase(result.transaction.id);
        setCheckoutMessage('Human approval confirmed. Generating PayPal order…');
      } else if (result.decision === 'AUTHORIZED') {
        setCheckoutMessage('Policy authorization active. Generating PayPal order…');
      } else {
        throw new Error('Unknown procurement decision. Checkout halted.');
      }

      const order = await createPayPalOrder(result.transaction.id);
      setCheckoutMessage(`PayPal Order ${order.orderID} created. Redirecting to PayPal Sandbox…`);
      window.location.assign(order.approvalUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start PayPal checkout.');
      setCheckoutMessage('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col justify-between gap-4 border-b border-[rgba(255,255,255,0.06)] pb-5 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-[#777777]">
              CONTROL PLANE
            </span>
            <span className="text-[10px] text-[#55585D]">/</span>
            <span className="text-[10px] font-mono text-[#00F0FF] uppercase tracking-wider">
              AGENT PURCHASE INTENT
            </span>
          </div>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-[#EBEBEB]">
            Autonomous Procurement Dispatcher
          </h2>
          <p className="mt-1 text-xs text-[#9EA1A5]">
            Dispatch agent purchasing intents through quote gathering, ML supplier recommendation, deterministic policy verification, and budget escrow.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => void refreshAgents()}
            disabled={refreshingAgents}
            className="inline-flex items-center gap-2 rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#202020] px-3.5 py-2 text-xs font-medium text-[#EBEBEB] transition-colors hover:border-[#00F0FF]/40 hover:text-[#00F0FF] disabled:opacity-50"
          >
            <IconRefresh className={`h-3.5 w-3.5 ${refreshingAgents ? 'animate-spin text-[#00F0FF]' : ''}`} />
            <span>{refreshingAgents ? 'Syncing…' : 'Refresh Agents'}</span>
          </button>
        </div>
      </div>

      {error && (
        <div role="alert" className="rounded-xl border border-[rgba(239,68,68,0.3)] bg-[rgba(239,68,68,0.08)] p-4 text-xs text-[#EF4444]">
          <span className="font-mono font-bold mr-2">EXECUTION ERROR:</span>
          {error}
        </div>
      )}

      {agentRefreshMessage && (
        <p className="text-xs font-mono text-[#1DB954]" role="status">
          ✓ {agentRefreshMessage}
        </p>
      )}

      {/* Main Grid: Left Intent Form & Right Decision Stream */}
      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-2">
        {/* Form Panel: Agent Intent Formulation */}
        <div className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#181818] p-6 space-y-6">
          <div className="border-b border-[rgba(255,255,255,0.06)] pb-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-[#EBEBEB] font-mono flex items-center gap-2">
                <IconFileText className="h-4 w-4 text-[#00F0FF]" />
                Formulate Agent Purchase Intent
              </h3>
              <span className="rounded border border-[rgba(255,255,255,0.06)] bg-[#121212] px-2 py-0.5 text-[10px] font-mono text-[#777777]">
                POST /api/v1/purchases
              </span>
            </div>
            <p className="mt-1 text-xs text-[#9EA1A5]">
              Simulates or triggers an autonomous agent intent. The backend evaluates deterministic rules and locks budget rows.
            </p>
          </div>

          <form onSubmit={purchase} className="space-y-5">
            {/* Agent Select & Credential State */}
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-[#9EA1A5] font-mono mb-2">
                Authorized Purchasing Agent
              </label>
              <select
                required
                value={agentId}
                onChange={(e) => handleSelectAgent(e.target.value)}
                className="h-10 w-full rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#121212] px-3 font-mono text-xs text-[#EBEBEB] outline-none transition-colors focus:border-[#00F0FF]/50"
              >
                <option value="">Select an active agent…</option>
                {agents.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} · Available Liquidity: ${a.remaining_budget.toFixed(2)} {a.currency || 'USD'}
                  </option>
                ))}
              </select>

              {/* Agent Telemetry & Key Vault Banner */}
              {agentId && (
                <div className="mt-3 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#141414] p-3.5 space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="text-[#777777]">Agent ID:</span>
                    <span className="text-[#EBEBEB] truncate max-w-[200px]">{agentId}</span>
                  </div>

                  {selectedAgent && (
                    <div className="grid grid-cols-2 gap-2 text-[11px] font-mono border-t border-[rgba(255,255,255,0.04)] pt-2">
                      <div>
                        <span className="text-[#777777]">Assigned Policy: </span>
                        <span className="text-[#00F0FF]">{selectedAgent.assigned_policy_name || 'Default Tier-1'}</span>
                      </div>
                      <div>
                        <span className="text-[#777777]">Available Budget: </span>
                        <span className="text-[#1DB954] tabular-nums">${selectedAgent.remaining_budget.toFixed(2)}</span>
                      </div>
                    </div>
                  )}

                  <div className="border-t border-[rgba(255,255,255,0.04)] pt-2">
                    {hasKey ? (
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-xs text-[#1DB954] font-mono">
                          <span className="h-1.5 w-1.5 rounded-full bg-[#1DB954]" />
                          Agent API Key Active in Vault
                        </span>
                        <button
                          type="button"
                          onClick={handleRotateKey}
                          disabled={rotatingKey || busy}
                          className="text-[11px] font-mono text-[#00F0FF] hover:underline disabled:opacity-50"
                        >
                          {rotatingKey ? 'Rotating…' : 'Rotate Key'}
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <span className="text-xs text-[#F5B942] font-mono">
                            ⚠ No session API key loaded for this agent.
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={handleRotateKey}
                              disabled={rotatingKey || busy}
                              className="rounded-md border border-[rgba(0,240,255,0.3)] bg-[rgba(0,240,255,0.1)] px-2.5 py-1 text-xs font-mono text-[#00F0FF] hover:bg-[rgba(0,240,255,0.2)] disabled:opacity-50"
                            >
                              {rotatingKey ? 'Issuing…' : 'Issue New Key'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setShowKeyInput(!showKeyInput)}
                              className="rounded-md border border-[rgba(255,255,255,0.08)] bg-[#202020] px-2.5 py-1 text-xs font-mono text-[#9EA1A5] hover:text-white"
                            >
                              {showKeyInput ? 'Cancel' : 'Paste Key'}
                            </button>
                          </div>
                        </div>

                        {showKeyInput && (
                          <div className="flex items-center gap-2 pt-1">
                            <input
                              type="password"
                              placeholder="Paste raw agent key (e.g. aeon_...)"
                              value={customKeyInput}
                              onChange={(e) => setCustomKeyInput(e.target.value)}
                              className="h-8 flex-1 rounded border border-[rgba(255,255,255,0.08)] bg-[#121212] px-2.5 font-mono text-xs text-[#EBEBEB] outline-none focus:border-[#00F0FF]"
                            />
                            <button
                              type="button"
                              onClick={handleSaveCustomKey}
                              disabled={!customKeyInput.trim()}
                              className="h-8 rounded bg-[#1DB954] px-3 font-mono text-xs font-medium text-black hover:bg-[#18A148] disabled:opacity-50"
                            >
                              Save
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {keySuccessMessage && (
                      <p className="mt-2 text-xs font-mono text-[#1DB954]">{keySuccessMessage}</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-[#9EA1A5] font-mono mb-2">
                Purchasing Scope & Specifications
              </label>
              <input
                required
                minLength={2}
                maxLength={255}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Item or service specification"
                className="h-10 w-full rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#121212] px-3 text-xs text-[#EBEBEB] outline-none transition-colors focus:border-[#00F0FF]/50"
              />
            </div>

            {/* Category and Maximum Budget */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-[#9EA1A5] font-mono mb-2">
                  Category
                </label>
                <input
                  required
                  minLength={2}
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="e.g. compute, api, data"
                  className="h-10 w-full rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#121212] px-3 font-mono text-xs text-[#EBEBEB] outline-none transition-colors focus:border-[#00F0FF]/50"
                />
              </div>

              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-[#9EA1A5] font-mono mb-2">
                  Maximum Authorized Cap (USD)
                </label>
                <input
                  required
                  min="0.01"
                  step="0.01"
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="h-10 w-full rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#121212] px-3 tabular-nums font-mono text-xs text-[#EBEBEB] outline-none transition-colors focus:border-[#00F0FF]/50"
                />
              </div>
            </div>

            <div className="border-t border-[rgba(255,255,255,0.06)] pt-5">
              <button
                type="submit"
                disabled={busy || !agents.length || !agentId}
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#00F0FF] px-6 text-xs font-mono font-bold uppercase tracking-wider text-[#121212] transition-colors hover:bg-[#38bdf8] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
              >
                <IconScale className="h-4 w-4" />
                {busy ? 'Evaluating Invariants…' : 'Execute Procurement Pipeline'}
              </button>
              <p className="mt-2 text-[11px] text-[#777777]">
                Triggers quote gathering, ML recommendation, deterministic policy verification, and row-level budget escrow.
              </p>
            </div>
          </form>
        </div>

        {/* Results Panel: Policy Verdict & Settlement Gate */}
        <div className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#181818] p-6 space-y-6">
          <div className="border-b border-[rgba(255,255,255,0.06)] pb-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-[#EBEBEB] font-mono flex items-center gap-2">
              <IconScale className="h-4 w-4 text-[#1DB954]" />
              Policy Evaluation & Authorization Verdict
            </h3>
            <p className="mt-1 text-xs text-[#9EA1A5]">
              Deterministic policy decision returned by the backend authorizer.
            </p>
          </div>

          {!result ? (
            <div className="flex min-h-[280px] flex-col items-center justify-center rounded-xl border border-[rgba(255,255,255,0.04)] bg-[#141414] p-8 text-center">
              <IconBot className="h-10 w-10 text-[#55585D] mb-3" />
              <p className="text-xs font-medium text-[#EBEBEB]">
                No Active Purchase Request In Evaluation
              </p>
              <p className="mt-1 max-w-xs text-[11px] text-[#777777]">
                Submit a procurement intent using the formulation panel to inspect live supplier quotes, policy verdict, and escrow state.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Verdict Banner */}
              <div
                className={`rounded-xl border p-5 ${
                  result.decision === 'BLOCKED'
                    ? 'border-[rgba(239,68,68,0.3)] bg-[rgba(239,68,68,0.06)]'
                    : result.decision === 'REQUIRES_APPROVAL'
                      ? 'border-[rgba(245,185,66,0.3)] bg-[rgba(245,185,66,0.06)]'
                      : 'border-[rgba(29,185,84,0.3)] bg-[rgba(29,185,84,0.06)]'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-[#9EA1A5]">
                    Engine Verdict
                  </span>
                  <StatusBadge
                    value={
                      result.decision === 'BLOCKED'
                        ? 'Hard Policy Violation'
                        : result.decision === 'REQUIRES_APPROVAL'
                          ? 'Human Approval Required'
                          : 'Policy Authorized'
                    }
                  />
                </div>

                <p className="mt-3 text-xs leading-relaxed text-[#EBEBEB]">
                  {result.message}
                </p>

                {result.audit_reason && (
                  <p className="mt-2 text-[11px] font-mono text-[#F5B942]">
                    Rationale: {result.audit_reason}
                  </p>
                )}

                <div className="mt-4 flex items-center justify-between rounded-lg bg-[#121212] px-3 py-2 text-[11px] font-mono">
                  <span className="text-[#777777]">Purchase ID:</span>
                  <span className="text-[#EBEBEB] tabular-nums">{result.transaction.id}</span>
                </div>
              </div>

              {/* Policy Decision Checks */}
              {result.policy_decision && (
                <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#141414] p-4 space-y-2">
                  <h4 className="text-[11px] font-mono uppercase tracking-wider text-[#777777]">
                    Deterministic Rule Matrix Checks
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                    <div className="flex items-center justify-between rounded bg-[#181818] p-2">
                      <span className="text-[#9EA1A5]">Policy ID:</span>
                      <span className="text-[#EBEBEB]">{result.policy_decision.policy_id || 'Global'}</span>
                    </div>
                    <div className="flex items-center justify-between rounded bg-[#181818] p-2">
                      <span className="text-[#9EA1A5]">Version:</span>
                      <span className="text-[#EBEBEB]">v{result.policy_decision.policy_version ?? 1}</span>
                    </div>
                    <div className="flex items-center justify-between rounded bg-[#181818] p-2">
                      <span className="text-[#9EA1A5]">Requires Human:</span>
                      <span className={result.policy_decision.requires_approval ? 'text-[#F5B942]' : 'text-[#1DB954]'}>
                        {result.policy_decision.requires_approval ? 'YES' : 'NO'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between rounded bg-[#181818] p-2">
                      <span className="text-[#9EA1A5]">Reason Code:</span>
                      <span className="text-[#00F0FF]">{result.policy_decision.reason_codes?.[0] || 'AUTHORIZED'}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Supplier Quote Comparison */}
              {result.quotes && result.quotes.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-mono uppercase tracking-wider text-[#EBEBEB]">
                      Multi-Quote Supplier Evaluation
                    </h4>
                    <span className="text-[10px] font-mono text-[#777777]">
                      {result.quotes.length} Quotes Normalized
                    </span>
                  </div>

                  <div className="space-y-2">
                    {result.quotes.map((q) => {
                      const isSelected = q.id === result.selected_quote_id;
                      return (
                        <div
                          key={q.id}
                          className={`flex items-center justify-between rounded-xl border p-3.5 transition-all ${
                            isSelected
                              ? 'border-[#00F0FF]/50 bg-[#00F0FF]/5'
                              : 'border-[rgba(255,255,255,0.06)] bg-[#141414]'
                          }`}
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-semibold text-[#EBEBEB]">
                                {q.provider}
                              </span>
                              {isSelected && (
                                <span className="rounded bg-[#00F0FF]/20 px-1.5 py-0.5 text-[9px] font-mono font-bold text-[#00F0FF]">
                                  RECOMMENDED
                                </span>
                              )}
                            </div>
                            <p className="mt-1 text-[11px] text-[#777777] font-mono">
                              Latency: {q.delivery_latency_hours}h · Quote ID: {q.id.slice(0, 8)}…
                            </p>
                          </div>
                          <div className="text-right">
                            <span className="tabular-nums font-mono text-sm font-bold text-[#EBEBEB]">
                              ${q.price.toFixed(2)}
                            </span>
                            <p className="text-[10px] font-mono text-[#9EA1A5]">{q.currency}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ML Recommendation Rationale */}
              {result.recommendation && (
                <div className="rounded-xl border border-[rgba(0,240,255,0.2)] bg-[rgba(0,240,255,0.04)] p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono uppercase tracking-wider text-[#00F0FF]">
                      ML Recommendation Engine
                    </span>
                    <span className="text-[10px] font-mono text-[#777777]">
                      Source: {result.recommendation.source}
                    </span>
                  </div>
                  <p className="text-xs text-[#EBEBEB]">
                    Recommended: <strong className="text-[#00F0FF]">{result.recommendation.recommended_vendor}</strong> at{' '}
                    <span className="tabular-nums font-mono font-bold">${result.recommendation.price.toFixed(2)}</span>
                  </p>
                  {result.recommendation.rationale && (
                    <ul className="list-disc pl-4 text-[11px] text-[#9EA1A5] space-y-1">
                      {result.recommendation.rationale.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {/* Action Buttons & Strict Invariants */}
              <div className="border-t border-[rgba(255,255,255,0.06)] pt-5 space-y-3">
                {checkoutMessage && (
                  <p className="text-xs font-mono text-[#00F0FF] animate-pulse">
                    ⚡ {checkoutMessage}
                  </p>
                )}

                {result.decision === 'BLOCKED' ? (
                  <div className="rounded-xl border border-[rgba(239,68,68,0.3)] bg-[rgba(239,68,68,0.1)] p-4 text-center">
                    <p className="text-xs font-mono font-bold text-[#EF4444]">
                      HARD POLICY VIOLATION: NO OVERRIDE PERMITTED
                    </p>
                    <p className="mt-1 text-[11px] text-[#9EA1A5]">
                      The AEON policy engine owns the final verdict. Blocked purchases cannot be overridden by administrators or forwarded to PayPal.
                    </p>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={approveAndPay}
                    disabled={busy}
                    className={`inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl text-xs font-mono font-bold uppercase tracking-wider text-[#121212] transition-colors disabled:opacity-50 ${
                      result.decision === 'REQUIRES_APPROVAL'
                        ? 'bg-[#F5B942] hover:bg-[#e0a738]'
                        : 'bg-[#1DB954] hover:bg-[#18A148]'
                    }`}
                  >
                    <IconCreditCard className="h-4 w-4" />
                    {busy
                      ? 'Processing…'
                      : result.decision === 'REQUIRES_APPROVAL'
                        ? 'Authorize As Human & Proceed to PayPal'
                        : 'Proceed to PayPal Orders v2 Sandbox'}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
