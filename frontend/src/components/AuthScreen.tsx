import { FormEvent, useState } from 'react';
import { login, registerAdmin, setAccessToken } from '../services/api';

export function AuthScreen({ onAuthenticated }: { onAuthenticated: () => void }) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const result =
        mode === 'login'
          ? await login({ email, password })
          : await registerAdmin({
              email,
              password,
              full_name: fullName,
              organization_name: organizationName,
            });
      setAccessToken(result.access_token);
      onAuthenticated();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Authentication failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="relative min-h-screen w-full flex items-center justify-center lg:justify-start bg-[#121212] overflow-hidden"
      style={{
        backgroundImage: `url('/assets/aeon/auth-atmosphere.jpeg'), url('/assets/aeon/auth-atmosphere.svg')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center right',
      }}
    >
      {/* Dark overlay for mobile/tablet to ensure contrast */}
      <div className="absolute inset-0 bg-[#121212]/80 lg:hidden pointer-events-none" />

      {/* Left-third institutional form container */}
      <div className="relative z-10 w-full max-w-md lg:max-w-lg lg:min-h-screen lg:flex lg:flex-col lg:justify-center border-r border-[rgba(255,255,255,0.08)] bg-[#121212]/95 backdrop-blur-md px-6 py-10 sm:px-10 lg:px-12">
        {/* Brand Header */}
        <div className="mb-8 flex items-center gap-3">
          <img
            src="/assets/aeon/aeon-mark-accent.svg"
            alt="AEON"
            width="40"
            height="40"
            className="h-10 w-10 shrink-0 rounded-xl"
          />
          <div>
            <h1 className="font-mono text-xl font-bold tracking-wider text-[#EBEBEB]">
              AEON
            </h1>
            <p className="text-[10px] font-mono uppercase tracking-widest text-[#777777]">
              CONTROL PLANE · AUTHENTICATION
            </p>
          </div>
        </div>

        {/* Title */}
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-[#EBEBEB]">
            {mode === 'login' ? 'Administrator Authorization' : 'Register Organization Control Plane'}
          </h2>
          <p className="mt-1 text-xs text-[#9EA1A5] leading-relaxed">
            {mode === 'login'
              ? 'Sign in to access real-time agent telemetry, deterministic rule matrices, and PayPal settlement.'
              : 'Initialize your organization root administrator account backed by Argon2id cryptographic password hashing.'}
          </p>
        </div>

        {/* Form */}
        <form className="mt-6 space-y-4" onSubmit={submit}>
          {mode === 'register' && (
            <>
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-[#9EA1A5] mb-1.5">
                  Full Name
                </label>
                <input
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Elena Rostova"
                  className="h-10 w-full rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#181818] px-3 font-mono text-xs text-[#EBEBEB] outline-none transition-colors focus:border-[#00F0FF]/50"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-[#9EA1A5] mb-1.5">
                  Organization Legal Name
                </label>
                <input
                  required
                  value={organizationName}
                  onChange={(e) => setOrganizationName(e.target.value)}
                  placeholder="e.g. Apex Global Logistics"
                  className="h-10 w-full rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#181818] px-3 font-mono text-xs text-[#EBEBEB] outline-none transition-colors focus:border-[#00F0FF]/50"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-[#9EA1A5] mb-1.5">
              Operator Email
            </label>
            <input
              type="email"
              required
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@aeon.internal"
              className="h-10 w-full rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#181818] px-3 font-mono text-xs text-[#EBEBEB] outline-none transition-colors focus:border-[#00F0FF]/50"
            />
          </div>

          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-[#9EA1A5] mb-1.5">
              Argon2id Master Password
            </label>
            <input
              type="password"
              required
              minLength={8}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="h-10 w-full rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#181818] px-3 font-mono text-xs text-[#EBEBEB] outline-none transition-colors focus:border-[#00F0FF]/50"
            />
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-lg border border-[rgba(239,68,68,0.3)] bg-[rgba(239,68,68,0.08)] p-3 text-xs font-mono text-[#EF4444]"
            >
              ⚠ {error}
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="mt-2 inline-flex h-11 w-full items-center justify-center rounded-xl bg-[#00F0FF] font-mono text-xs font-bold uppercase tracking-wider text-[#121212] transition-colors hover:bg-[#38bdf8] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? 'Authenticating Session…' : mode === 'login' ? 'Authorize Session' : 'Register Organization'}
          </button>
        </form>

        <div className="mt-5 text-center">
          <button
            type="button"
            onClick={() => {
              setMode(mode === 'login' ? 'register' : 'login');
              setError('');
            }}
            className="text-xs font-mono text-[#00F0FF] hover:underline"
          >
            {mode === 'login'
              ? 'New deployment? Register root organization →'
              : '← Existing organization? Sign in'}
          </button>
        </div>

        {/* Security Disclaimers */}
        <div className="mt-8 border-t border-[rgba(255,255,255,0.06)] pt-5 text-[11px] font-mono text-[#777777] leading-relaxed space-y-1">
          <p>
            • Admin credentials authenticate against the live AEON FastAPI backend.
          </p>
          <p>
            • JWT tokens are maintained in session storage only. Never stored in local storage.
          </p>
        </div>
      </div>
    </div>
  );
}
