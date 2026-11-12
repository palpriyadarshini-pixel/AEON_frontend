import { useEffect, useState } from 'react';
import { capturePayPalOrder, fetchPayPalStatus, reconcilePayPalOrder } from '../services/api';
import { StatusBadge } from './StatusBadge';
import { IconCheck, IconAlertCircle, IconRefresh, IconCreditCard } from './icons';

export function PaymentReturnPanel() {
  const successRoute = window.location.pathname.replace(/\/$/, '') === '/payments/success';
  const cancelRoute = window.location.pathname.replace(/\/$/, '') === '/payments/cancel';
  const params = new URLSearchParams(window.location.search);
  const orderId = params.get('token') || params.get('order_id');
  const [payment, setPayment] = useState<any>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!successRoute || !orderId) return;
    let active = true;
    let timer: number | undefined;

    const refresh = async () => {
      try {
        const next = await fetchPayPalStatus(orderId);
        if (!active) return;
        setPayment(next);
        setError('');
        const terminalStatuses = ['COMPLETED', 'FAILED', 'REFUNDED'];

        if (!terminalStatuses.includes(next.status)) {
          timer = window.setTimeout(refresh, 4000);
        }
      } catch (e) {
        if (active) {
          setError(e instanceof Error ? e.message : 'Unable to retrieve payment status');
          timer = window.setTimeout(refresh, 5000);
        }
      }
    };

    const capture = async () => {
      try {
        // Read persisted attempt before capturing: a browser refresh must never blindly re-submit
        const prior = await fetchPayPalStatus(orderId);
        if (!active) return;
        setPayment(prior);

        if (prior.status === 'COMPLETED') {
          setMessage('Verified Settlement: PayPal reports an authoritatively completed capture.');
          return;
        }

        if (prior.status === 'CAPTURE_PENDING') {
          setMessage(
            'Capture Pending Review: AEON is maintaining the escrow reservation and polling authoritative settlement.',
          );
          await refresh();
          return;
        }

        if (!['ORDER_CREATED', 'BUYER_APPROVAL_PENDING'].includes(prior.status)) {
          setMessage(`Payment state is ${prior.status}. No duplicate capture request was submitted.`);
          return;
        }

        setMessage('Buyer return received. AEON backend is executing cryptographic server-side capture…');
        try {
          const result = await capturePayPalOrder(orderId);
          if (!active) return;
          setPayment(result);
          setMessage('Capture response received. Synchronizing authoritative payment ledger…');
        } catch (e) {
          if (!active) return;
          setMessage('Capture is awaiting reconciliation. Budget reservation remains locked in escrow.');
          setError(e instanceof Error ? e.message : 'Capture is pending or review required');
        }
        await refresh();
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : 'Unable to inspect payment attempt');
      }
    };

    void capture();
    return () => {
      active = false;
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [successRoute, orderId]);

  if (!successRoute && !cancelRoute) return null;

  if (cancelRoute) {
    return (
      <section className="mx-auto max-w-2xl rounded-2xl border border-[rgba(245,185,66,0.3)] bg-[#181818] p-8 shadow-2xl">
        <div className="flex items-center gap-3 border-b border-[rgba(255,255,255,0.06)] pb-4">
          <IconAlertCircle className="h-6 w-6 text-[#F5B942]" />
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-[#EBEBEB]">
              PayPal Checkout Cancelled
            </h2>
            <p className="text-xs text-[#9EA1A5]">
              Buyer returned from PayPal without authorizing checkout.
            </p>
          </div>
        </div>

        <p className="mt-4 text-xs leading-relaxed text-[#9EA1A5]">
          AEON does not infer completion from browser navigation. The reserved budget funds will remain in escrow or be released according to policy timeout.
        </p>

        {orderId && (
          <div className="mt-4 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#121212] p-3 text-xs font-mono">
            <span className="text-[#777777]">Order Reference: </span>
            <span className="text-[#EBEBEB]">{orderId}</span>
          </div>
        )}

        <div className="mt-6 border-t border-[rgba(255,255,255,0.06)] pt-4">
          <a
            href="/"
            className="inline-flex items-center gap-2 rounded-xl bg-[#202020] px-4 py-2 font-mono text-xs font-medium text-[#EBEBEB] hover:bg-[#282828]"
          >
            ← Return to Control Plane Dashboard
          </a>
        </div>
      </section>
    );
  }

  const status = payment?.status;
  const completed = status === 'COMPLETED';
  const failed = ['FAILED', 'DENIED', 'VOIDED', 'CANCELLED'].includes(status);

  const reconcile = async () => {
    if (!orderId) return;
    setBusy(true);
    setError('');
    try {
      const result = await reconcilePayPalOrder(orderId);
      setPayment(result);
      setMessage('PayPal reconciliation completed against authoritative API.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Reconciliation failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section
      className={`mx-auto max-w-2xl rounded-2xl border p-8 shadow-2xl transition-all ${
        completed
          ? 'border-[rgba(29,185,84,0.3)] bg-[#181818]'
          : failed
            ? 'border-[rgba(239,68,68,0.3)] bg-[#181818]'
            : 'border-[rgba(0,240,255,0.3)] bg-[#181818]'
      }`}
      aria-live="polite"
    >
      <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.06)] pb-4">
        <div className="flex items-center gap-3">
          {completed ? (
            <IconCheck className="h-6 w-6 text-[#1DB954]" />
          ) : failed ? (
            <IconAlertCircle className="h-6 w-6 text-[#EF4444]" />
          ) : (
            <IconRefresh className="h-6 w-6 text-[#00F0FF] animate-spin" />
          )}
          <div>
            <h2 className="text-base font-semibold tracking-tight text-[#EBEBEB]">
              {completed
                ? 'VERIFIED SETTLEMENT CONFIRMED'
                : failed
                  ? 'PAYMENT CAPTURE DENIED'
                  : 'VERIFYING SETTLEMENT WITH PAYPAL'}
            </h2>
            <p className="text-xs text-[#9EA1A5]">
              {completed
                ? 'Backend confirms matching capture with settled ledger balance.'
                : failed
                  ? 'PayPal returned terminal denial. Escrow release initiated.'
                  : 'Buyer return is not proof of payment. Checking server-side capture.'}
            </p>
          </div>
        </div>

        <StatusBadge
          value={completed ? 'SETTLED' : failed ? 'FAILED' : 'PENDING'}
        />
      </div>

      {message && (
        <div className="mt-4 rounded-xl border border-[rgba(0,240,255,0.2)] bg-[rgba(0,240,255,0.04)] p-3 text-xs font-mono text-[#00F0FF]">
          ⚡ {message}
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-xl border border-[rgba(239,68,68,0.3)] bg-[rgba(239,68,68,0.08)] p-3 text-xs font-mono text-[#EF4444]">
          ⚠ {error}
        </div>
      )}

      {payment && (
        <div className="mt-5 grid grid-cols-2 gap-3 text-xs font-mono">
          <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#141414] p-3.5">
            <span className="text-[10px] uppercase text-[#777777]">Payment Status</span>
            <p className="mt-1 font-bold text-[#EBEBEB]">{payment.status ?? 'UNKNOWN'}</p>
          </div>
          <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#141414] p-3.5">
            <span className="text-[10px] uppercase text-[#777777]">PayPal Capture ID</span>
            <p className="mt-1 font-bold text-[#EBEBEB] truncate">{payment.provider_capture_id ?? 'Pending Verification'}</p>
          </div>
        </div>
      )}

      {orderId && (
        <div className="mt-4 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#121212] p-3 text-xs font-mono text-[#777777]">
          <span>PayPal Order: </span>
          <span className="text-[#EBEBEB]">{orderId}</span>
        </div>
      )}

      <div className="mt-6 flex items-center justify-between border-t border-[rgba(255,255,255,0.06)] pt-4">
        {!completed && !failed && orderId && (
          <button
            type="button"
            disabled={busy}
            onClick={() => void reconcile()}
            className="rounded-xl border border-[rgba(0,240,255,0.3)] bg-[rgba(0,240,255,0.08)] px-4 py-2 font-mono text-xs font-medium text-[#00F0FF] hover:bg-[rgba(0,240,255,0.16)] disabled:opacity-50"
          >
            {busy ? 'Reconciling…' : 'Reconcile with PayPal Now'}
          </button>
        )}
        <a
          href="/"
          className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#202020] px-4 py-2 font-mono text-xs text-[#EBEBEB] hover:bg-[#282828]"
        >
          Return to Dashboard
        </a>
      </div>
    </section>
  );
}
