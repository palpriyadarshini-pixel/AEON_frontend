import path from 'node:path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const rootEnvDir = path.resolve(__dirname, '..');
  // Load env from repository root, plus any local frontend overrides
  const env = {
    ...loadEnv(mode, rootEnvDir, ''),
    ...loadEnv(mode, process.cwd(), ''),
  };
  const apiTarget = env.AEON_API_PROXY_TARGET || 'http://127.0.0.1:8000';

  return {
    envDir: rootEnvDir,
    plugins: [react()],
    server: {
      host: '127.0.0.1',
      port: 5173,
      strictPort: true,
      proxy: {
        '/health': { target: apiTarget, changeOrigin: true },
        '/live': { target: apiTarget, changeOrigin: true },
        '/ready': { target: apiTarget, changeOrigin: true },
        '/api': { target: apiTarget, changeOrigin: true },
      },
    },
  };
});
