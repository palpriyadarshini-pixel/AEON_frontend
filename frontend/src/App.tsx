import { useCallback, useEffect, useState } from 'react';
import type { NavigationTab, ServiceHealthResponse } from './types';
import { clearSession, fetchCurrentUser, fetchHealth, getAccessToken } from './services/api';
import { AuthScreen } from './components/AuthScreen';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { DashboardMetrics } from './components/DashboardMetrics';
import { TransactionLedger } from './components/TransactionLedger';
import { AgentDirectory } from './components/AgentDirectory';
import { RecentActivity } from './components/RecentActivity';
import { Day2Workbench } from './components/Day2Workbench';
import { PoliciesDirectory } from './components/PoliciesDirectory';
import { PaymentReturnPanel } from './components/PaymentReturnPanel';
import { IconShield } from './components/icons';

export function App() {
  const [activeTab, setActiveTab] = useState<NavigationTab>('overview');
  const [health, setHealth] = useState<ServiceHealthResponse | null>(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [healthLoading, setHealthLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadHealth = useCallback(async () => {
    setHealthLoading(true); setError(null);
    try { setHealth(await fetchHealth()); }
    catch (err) { setHealth(null); setError(err instanceof Error ? err.message : 'Unable to connect to FastAPI'); }
    finally { setHealthLoading(false); }
  }, []);

  useEffect(() => {
    void loadHealth();
    const token = getAccessToken();
    if (!token) { setAuthLoading(false); return; }
    fetchCurrentUser().then(() => setAuthenticated(true)).catch(() => { clearSession(); setAuthenticated(false); }).finally(() => setAuthLoading(false));
  }, [loadHealth]);

  const onAuthenticated = () => { setAuthenticated(true); void loadHealth(); };
  const logout = () => { clearSession(); setAuthenticated(false); setActiveTab('overview'); };
  const paymentRoute = ['/payments/success', '/payments/cancel'].includes(window.location.pathname.replace(/\/$/, ''));

  if (authLoading) return <div className="flex min-h-screen items-center justify-center bg-aeon-bg text-xs text-aeon-textMuted">Checking AEON administrator session…</div>;
  if (!authenticated) return <AuthScreen onAuthenticated={onAuthenticated}/>;

  return <div className="flex h-screen w-screen overflow-hidden bg-aeon-bg text-slate-100 font-sans">
    {/* Desktop sidebar */}
<div className="hidden h-full shrink-0 lg:flex">
  <Sidebar
    activeTab={activeTab}
    onTabChange={setActiveTab}
    health={health}
    loading={healthLoading}
  />
</div>

{/* Mobile sidebar overlay */}
{mobileSidebarOpen && (
  <div className="fixed inset-0 z-[60] lg:hidden">
    {/* Dark backdrop */}
    <button
      type="button"
      aria-label="Close navigation"
      onClick={() => setMobileSidebarOpen(false)}
      className="absolute inset-0 h-full w-full bg-black/60"
    />

    {/* Sidebar drawer */}
    <div className="relative z-10 h-full w-64 max-w-[85vw] shadow-2xl">
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        health={health}
        loading={healthLoading}
        onClose={() => setMobileSidebarOpen(false)}
      />
    </div>
  </div>
)}
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header
        health={health}
        loading={healthLoading}
        onRefresh={loadHealth}
        onLogout={logout}
        onMenuClick={() => setMobileSidebarOpen(true)}
      />
      <main className="flex-1 min-w-0 overflow-y-auto bg-aeon-bg px-4 py-5 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-[1600px] space-y-6">
        {error && <div className="rounded-lg border border-red-800 bg-red-950/40 p-3 text-xs text-red-300 flex items-center justify-between"><span>Backend connection warning: {error}</span><button onClick={loadHealth} className="rounded border border-red-700 px-2.5 py-1 text-white">Retry</button></div>}
        {paymentRoute ? <PaymentReturnPanel/> : activeTab === 'transactions' ? <TransactionLedger mode="transactions"/> : activeTab === 'audit' ? <TransactionLedger mode="audit"/> : activeTab === 'agents' ? <AgentDirectory/> : activeTab === 'procurement' ? <Day2Workbench/> : activeTab === 'policies' ? <PoliciesDirectory/> : <div className="space-y-6">
          <div className="rounded-xl border border-aeon-border bg-aeon-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"><div className="flex items-center gap-3"><div className="rounded-lg border border-aeon-border bg-aeon-surface p-2 text-aeon-cyan"><IconShield className="h-4 w-4"/></div><div><h2 className="text-xs font-bold uppercase tracking-wider text-white font-mono">AEON · FastAPI + PostgreSQL Control Plane</h2><p className="mt-0.5 text-[11px] text-aeon-textMuted">AI recommends. Deterministic policy authorizes. PayPal executes. The backend ledger is authoritative.</p></div></div><span className="rounded border border-emerald-700/50 bg-emerald-950/30 px-2 py-1 text-[10px] font-mono text-emerald-300">Authenticated dashboard</span></div>
          <div className="space-y-6">
  {/* Dashboard heading */}
  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
    <div>
      <h2 className="text-2xl font-semibold tracking-tight text-white">
        Overview
      </h2>
      <p className="mt-1 text-sm text-slate-400">
        Monitor your agents, procurement activity and financial performance.
      </p>
    </div>

    <div className="flex items-center gap-2">
      <span className="h-2 w-2 rounded-full bg-emerald-400" />
      <span className="text-xs font-medium text-emerald-400">
        System operational
      </span>
    </div>
  </div>

  <DashboardMetrics />

  <RecentActivity />
</div>
        </div>}
        </div>
      </main>
    </div>
  </div>;
}
