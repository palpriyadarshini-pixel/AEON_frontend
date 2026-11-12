
const configuredMode = import.meta.env.VITE_API_MODE;

export const API_MODE: 'demo' | 'backend' =
  configuredMode === 'demo' ? 'demo' : 'backend';

export const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'
).replace(/\/+$/, '');
