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
import { ApprovalsQueue } from './components/ApprovalsQueue';
import { BudgetsView } from './components/BudgetsView';
import { PaymentReturnPanel } from './components/PaymentReturnPanel';
import { IconShield, IconBot, IconScale, IconCreditCard } from './components/icons';

export function App() {
  const [activeTab, setActiveTab] = useState<NavigationTab>('overview');
  const [health, setHealth] = useState<ServiceHealthResponse | null>(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [healthLoading, setHealthLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  const loadHealth = useCallback(async () => {
    setHealthLoading(true);
    setError(null);
    try {
      const data = await fetchHealth();
      setHealth(data);
      setLastSyncTime(new Date());
    } catch (err) {
      setHealth(null);
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to connect to AEON FastAPI control plane backend',
      );
    } finally {
      setHealthLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadHealth();
    const token = getAccessToken();
    if (!token) {
      setAuthLoading(false);
      return;
    }
    fetchCurrentUser()
      .then(() => setAuthenticated(true))
      .catch(() => {
        clearSession();
        setAuthenticated(false);
      })
      .finally(() => setAuthLoading(false));
  }, [loadHealth]);

  const onAuthenticated = () => {
    setAuthenticated(true);
    void loadHealth();
  };

  const logout = () => {
    clearSession();
    setAuthenticated(false);
    setActiveTab('overview');
  };

  const paymentRoute = ['/payments/success', '/payments/cancel'].includes(
    window.location.pathname.replace(/\/$/, ''),
  );

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#121212] font-mono text-xs text-[#777777]">
        <div className="flex items-center gap-3">
          <span className="h-2 w-2 rounded-full bg-[#00F0FF] telemetry-pulse" />
          <span>Verifying AEON administrator session token…</span>
        </div>
      </div>
    );
  }

  if (!authenticated) {
    return <AuthScreen onAuthenticated={onAuthenticated} />;
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#121212] text-[#EBEBEB] font-sans antialiased">
      {/* Desktop Sidebar (Fixed 248px) */}
      <div className="hidden h-full shrink-0 lg:flex">
        <Sidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          health={health}
          loading={healthLoading}
        />
      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setMobileSidebarOpen(false)}
            className="fixed inset-0 h-full w-full bg-black/80 backdrop-blur-sm"
          />
          <div className="relative z-10 h-full w-[248px] max-w-[85vw] shadow-2xl">
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

      {/* Main App Canvas */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header
          health={health}
          loading={healthLoading}
          onRefresh={loadHealth}
          onLogout={logout}
          onMenuClick={() => setMobileSidebarOpen(true)}
          lastSyncTime={lastSyncTime}
        />

        <main className="flex-1 min-w-0 overflow-y-auto bg-[#121212] bg-grid-texture px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-[1600px] space-y-6">
            {/* Backend Connectivity Warning Banner */}
            {error && (
              <div
                role="alert"
                className="rounded-2xl border border-[rgba(239,68,68,0.3)] bg-[rgba(239,68,68,0.08)] p-4 text-xs font-mono text-[#EF4444] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg"
              >
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[#EF4444]" />
                  <span>Backend connection failure: {error}</span>
                </div>
                <button
                  type="button"
                  onClick={loadHealth}
                  className="rounded-lg border border-[rgba(239,68,68,0.4)] bg-[#181818] px-3 py-1 font-mono text-xs text-white hover:bg-[rgba(239,68,68,0.15)]"
                >
                  Retry Connection
                </button>
              </div>
            )}

            {/* View Dispatcher */}
            {paymentRoute ? (
              <PaymentReturnPanel />
            ) : activeTab === 'procurement' ? (
              <Day2Workbench />
            ) : activeTab === 'approvals' ? (
              <ApprovalsQueue />
            ) : activeTab === 'budgets' ? (
              <BudgetsView />
            ) : activeTab === 'agents' ? (
              <AgentDirectory />
            ) : activeTab === 'policies' ? (
              <PoliciesDirectory />
            ) : activeTab === 'transactions' ? (
              <TransactionLedger mode="transactions" />
            ) : activeTab === 'audit' ? (
              <TransactionLedger mode="audit" />
            ) : (
              /* Overview View: Autonomous Procurement Overview */
              <div className="space-y-6">
                {/* Hero Editorial Banner Strip */}
                <div className="relative overflow-hidden rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#181818] p-6 sm:p-8">
                  {/* Background filament strip graphic */}
                  <div
                    className="absolute inset-0 opacity-20 pointer-events-none"
                    style={{
                      backgroundImage: `url('/assets/aeon/overview-strip.svg')`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                    }}
                  />

                  <div className="relative z-10 flex flex-col justify-between gap-4 md:flex-row md:items-end">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="rounded border border-[rgba(0,240,255,0.3)] bg-[rgba(0,240,255,0.08)] px-2 py-0.5 text-[10px] font-mono text-[#00F0FF] uppercase tracking-wider">
                          GOVERNANCE ACTIVE
                        </span>
                        <span className="text-[11px] font-mono text-[#777777]">
                          AEON CONTROL PLANE
                        </span>
                      </div>
                      <h2 className="mt-2 text-2xl font-bold tracking-tight text-[#EBEBEB] sm:text-3xl">
                        Autonomous Procurement Overview
                      </h2>
                      <p className="mt-2 max-w-2xl text-xs sm:text-sm text-[#9EA1A5] leading-relaxed">
                        ML recommends. Policies govern. Humans oversee. AEON authorizes.
                        Continuous telemetry and reconciliation for PayPal Orders v2 captures.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 font-mono text-xs">
                      <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#121212]/90 px-3.5 py-2">
                        <span className="text-[#777777]">INVARIANT: </span>
                        <span className="text-[#1DB954]">PostgreSQL Locks</span>
                      </div>
                      <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#121212]/90 px-3.5 py-2">
                        <span className="text-[#777777]">SETTLEMENT: </span>
                        <span className="text-[#00F0FF]">PayPal v2</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Dashboard Metrics: 4-KPI strip + Capital Breakdown */}
                <DashboardMetrics />

                {/* Recent Activity: Chronological Telemetry Feed */}
                <RecentActivity />
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
