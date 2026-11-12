
const isBrowser = typeof window !== 'undefined';
const isLocalhost =
  isBrowser &&
  (window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1');

const rawMode = (
  import.meta.env.VITE_API_MODE ||
  import.meta.env.VITE_MODE ||
  import.meta.env.MODE ||
  ''
)
  .toString()
  .trim()
  .replace(/^["']|["']$/g, '')
  .toLowerCase();

// Default to 'backend' mode unless explicitly configured as 'demo'
export const API_MODE: 'demo' | 'backend' =
  rawMode === 'demo' ? 'demo' : 'backend';

// In hosted environments (e.g. Vercel), default to the live Render backend URL
const fallbackBaseUrl = isLocalhost
  ? 'http://127.0.0.1:8000'
  : 'https://aeon-m136.onrender.com';

const rawBaseUrl = (
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_BACKEND_URL ||
  fallbackBaseUrl
)
  .toString()
  .trim()
  .replace(/^["']|["']$/g, '');

export const API_BASE_URL = rawBaseUrl.replace(/\/+$/, '');
