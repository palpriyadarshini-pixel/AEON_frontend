
const isBrowser = typeof window !== 'undefined';
const isLocalhost =
  isBrowser &&
  (window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1');

// Check if user explicitly asked for demo mode via URL query (?demo=true)
const urlParams = isBrowser ? new URLSearchParams(window.location.search) : null;
const isExplicitDemo = urlParams?.get('demo') === 'true';

// In production / hosted environments, always connect to the live backend
// unless explicitly toggled with ?demo=true
export const API_MODE: 'demo' | 'backend' = isExplicitDemo ? 'demo' : 'backend';

// Clean configured base URL from environment
const rawEnvUrl = (import.meta.env.VITE_API_BASE_URL || '')
  .toString()
  .trim()
  .replace(/^["']|["']$/g, '');

// If running in browser on a remote host (e.g. vercel.app) and env is localhost or unset,
// automatically use the production Render backend URL
const resolvedBaseUrl =
  !isLocalhost && isBrowser && (!rawEnvUrl || rawEnvUrl.includes('127.0.0.1') || rawEnvUrl.includes('localhost'))
    ? 'https://aeon-m136.onrender.com'
    : (rawEnvUrl || (isLocalhost ? 'http://127.0.0.1:8000' : 'https://aeon-m136.onrender.com'));

export const API_BASE_URL = resolvedBaseUrl.replace(/\/+$/, '');
