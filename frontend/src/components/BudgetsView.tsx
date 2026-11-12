import React, { useCallback, useEffect, useState } from 'react';
import { fetchBudgets, fetchBudgetReservations, releaseBudgetReservation, settleBudgetReservation } from '../services/api';
import type { BudgetResponse, BudgetReservationResponse } from '../types';
import { StatusBadge } from './StatusBadge';
import { EmptyState } from './EmptyState';
import { IconCreditCard, IconRefresh, IconScale, IconCheck, IconX } from './icons';

export function BudgetsView() {
  const [budgets, setBudgets] = useState<BudgetResponse[]>([]);
  const [selectedBudget, setSelectedBudget] = useState<BudgetResponse | null>(null);
  const [reservations, setReservations] = useState<BudgetReservationResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [resLoading, setResLoading] = useState(false);
  const [error, setError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');
  const [busyResId, setBusyResId] = useState<string | null>(null);

  const loadBudgets = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchBudgets();
      setBudgets(data);
      if (data.length > 0 && !selectedBudget) {
        setSelectedBudget(data[0]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to load budgets');
    } finally {
      setLoading(false);
    }
  }, [selectedBudget]);

  useEffect(() => {
    void loadBudgets();
  }, [loadBudgets]);

  const loadReservations = useCallback(async (budgetId: string) => {
    setResLoading(true);
    try {
      const data = await fetchBudgetReservations(budgetId);
      setReservations(data);
    } catch {
      setReservations([]);
    } finally {
      setResLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedBudget) {
      void loadReservations(selectedBudget.id);
    }
  }, [selectedBudget, loadReservations]);

  const handleSettle = async (reservationId: string) => {
    if (!selectedBudget) return;
    setBusyResId(reservationId);
    setError('');
    setActionSuccess('');
    try {
      await settleBudgetReservation(reservationId);
      setActionSuccess(`Reservation ${reservationId.slice(0, 8)}… settled.`);
      await loadBudgets();
      await loadReservations(selectedBudget.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to settle reservation');
    } finally {
      setBusyResId(null);
    }
  };

  const handleRelease = async (reservationId: string) => {
    if (!selectedBudget) return;
    setBusyResId(reservationId);
    setError('');
    setActionSuccess('');
    try {
      await releaseBudgetReservation(reservationId);
      setActionSuccess(`Reservation ${reservationId.slice(0, 8)}… released.`);
      await loadBudgets();
      await loadReservations(selectedBudget.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to release reservation');
    } finally {
      setBusyResId(null);
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
              FINANCIAL CONTROL
            </span>
            <span className="text-[10px] text-[#55585D]">/</span>
            <span className="text-[10px] font-mono text-[#00F0FF] uppercase tracking-wider">
              ROW-LOCKED ESCROW
            </span>
          </div>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-[#EBEBEB]">
            Budget Allocations & Reservations
          </h2>
          <p className="mt-1 text-xs text-[#9EA1A5]">
            Strict separation of Allocated, Available, Reserved, Settled, and Released capital. Governed with row-level locks on PostgreSQL transactions.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={loadBudgets}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#202020] px-3.5 py-2 text-xs font-medium text-[#EBEBEB] transition-colors hover:border-[#00F0FF]/40 hover:text-[#00F0FF] disabled:opacity-50"
          >
            <IconRefresh className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-[#00F0FF]' : ''}`} />
            <span>{loading ? 'Refreshing…' : 'Refresh Budgets'}</span>
          </button>
        </div>
      </div>

      {error && (
        <div role="alert" className="rounded-xl border border-[rgba(239,68,68,0.3)] bg-[rgba(239,68,68,0.08)] p-4 text-xs text-[#EF4444]">
          <span className="font-mono font-bold mr-2">BUDGET ERROR:</span>
          {error}
        </div>
      )}

      {actionSuccess && (
        <div className="rounded-xl border border-[rgba(29,185,84,0.3)] bg-[rgba(29,185,84,0.08)] p-4 text-xs font-mono text-[#1DB954]">
          ✓ {actionSuccess}
        </div>
      )}

      {/* Grid: Left Budgets Table, Right Selected Budget Reservations */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Left 2 Cols: Budgets List */}
        <div className="space-y-4 xl:col-span-2">
          <h3 className="text-xs font-mono uppercase tracking-wider text-[#777777]">
            Active Budget Accounts
          </h3>

          {loading ? (
            <div className="py-16 text-center text-xs text-[#777777] font-mono">
              Loading budget ledgers…
            </div>
          ) : budgets.length === 0 ? (
            <EmptyState
              title="No Budgets Provisioned"
              description="No organization or agent budgets have been allocated yet."
              illustration="ledger"
            />
          ) : (
            <div className="space-y-3">
              {budgets.map((b) => {
                const isSelected = selectedBudget?.id === b.id;
                const allocated = Number(b.allocated_amount);
                const spent = Number(b.spent_amount);
                const reserved = Number(b.reserved_amount);
                const available = Number(b.available_amount);
                const pctUsed = allocated > 0 ? ((spent + reserved) / allocated) * 100 : 0;

                return (
                  <div
                    key={b.id}
                    onClick={() => setSelectedBudget(b)}
                    className={`cursor-pointer rounded-2xl border p-5 transition-all ${
                      isSelected
                        ? 'border-[#00F0FF]/50 bg-[#1B1B1B] shadow-[0_0_20px_rgba(0,240,255,0.04)]'
                        : 'border-[rgba(255,255,255,0.08)] bg-[#181818] hover:border-[rgba(255,255,255,0.14)]'
                    }`}
                  >
                    <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-[#EBEBEB]">
                            {b.name}
                          </span>
                          <StatusBadge value={b.is_active ? 'ACTIVE' : 'INACTIVE'} />
                          {b.agent_id ? (
                            <span className="rounded bg-[#202020] px-1.5 py-0.5 text-[9px] font-mono text-[#00F0FF]">
                              AGENT BOUND
                            </span>
                          ) : (
                            <span className="rounded bg-[#202020] px-1.5 py-0.5 text-[9px] font-mono text-[#9EA1A5]">
                              ORG POOL
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-[11px] font-mono text-[#777777]">
                          ID: {b.id.slice(0, 8)}… {b.agent_id ? `· Agent: ${b.agent_id.slice(0, 8)}…` : ''}
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="tabular-nums font-mono text-lg font-bold text-[#EBEBEB]">
                          {money(b.allocated_amount, b.currency)}
                        </span>
                        <p className="text-[10px] font-mono text-[#777777]">
                          Allocated Total
                        </p>
                      </div>
                    </div>

                    {/* Breakdown 4 Pill Columns */}
                    <div className="mt-4 grid grid-cols-2 gap-2 text-xs font-mono sm:grid-cols-4">
                      <div className="rounded-lg bg-[#141414] p-2.5">
                        <p className="text-[10px] uppercase text-[#777777]">Available</p>
                        <p className="mt-1 tabular-nums font-bold text-[#1DB954]">{money(available, b.currency)}</p>
                      </div>
                      <div className="rounded-lg bg-[#141414] p-2.5">
                        <p className="text-[10px] uppercase text-[#777777]">Reserved</p>
                        <p className="mt-1 tabular-nums font-bold text-[#F5B942]">{money(reserved, b.currency)}</p>
                      </div>
                      <div className="rounded-lg bg-[#141414] p-2.5">
                        <p className="text-[10px] uppercase text-[#777777]">Spent</p>
                        <p className="mt-1 tabular-nums font-bold text-[#1657AD]">{money(spent, b.currency)}</p>
                      </div>
                      <div className="rounded-lg bg-[#141414] p-2.5">
                        <p className="text-[10px] uppercase text-[#777777]">Committed</p>
                        <p className="mt-1 tabular-nums font-bold text-[#EBEBEB]">{pctUsed.toFixed(1)}%</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Col: Reservations for Selected Budget */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-mono uppercase tracking-wider text-[#777777]">
              Escrow Reservations
            </h3>
            {selectedBudget && (
              <span className="text-[11px] font-mono text-[#00F0FF]">
                {selectedBudget.name}
              </span>
            )}
          </div>

          <div className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#181818] p-5">
            {!selectedBudget ? (
              <p className="text-xs text-[#777777] font-mono">Select a budget to inspect reservations</p>
            ) : resLoading ? (
              <div className="py-12 text-center text-xs text-[#777777] font-mono">Loading reservations…</div>
            ) : reservations.length === 0 ? (
              <EmptyState
                title="Zero Active Reservations"
                description="No funds are currently locked in escrow for this budget."
                illustration="approvals"
              />
            ) : (
              <div className="space-y-3">
                {reservations.map((r) => {
                  const isActive = r.status === 'ACTIVE';
                  const isBusy = busyResId === r.id;

                  return (
                    <div
                      key={r.id}
                      className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#141414] p-3.5 space-y-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-[#EBEBEB]">
                          {money(r.amount, r.currency)}
                        </span>
                        <StatusBadge value={r.status} />
                      </div>

                      <div className="text-[11px] font-mono text-[#777777] space-y-0.5">
                        <p>Purchase: <span className="text-[#9EA1A5]">{r.purchase_request_id.slice(0, 10)}…</span></p>
                        <p>Locked: <span className="text-[#9EA1A5]">{new Date(r.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span></p>
                      </div>

                      {isActive && (
                        <div className="flex items-center gap-2 border-t border-[rgba(255,255,255,0.04)] pt-2">
                          <button
                            type="button"
                            onClick={() => handleSettle(r.id)}
                            disabled={isBusy}
                            className="flex-1 rounded-md bg-[#1DB954] py-1 text-[11px] font-mono font-bold text-black hover:bg-[#18A148] disabled:opacity-50"
                          >
                            {isBusy ? '…' : 'Settle'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRelease(r.id)}
                            disabled={isBusy}
                            className="flex-1 rounded-md border border-[rgba(239,68,68,0.3)] bg-[rgba(239,68,68,0.08)] py-1 text-[11px] font-mono text-[#EF4444] hover:bg-[rgba(239,68,68,0.15)] disabled:opacity-50"
                          >
                            {isBusy ? '…' : 'Release'}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
