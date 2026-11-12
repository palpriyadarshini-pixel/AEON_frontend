/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        aeon: {
          canvas: '#121212',
          surface: '#181818',
          nested: '#202020',
          border: 'rgba(255, 255, 255, 0.08)',
          borderStrong: 'rgba(255, 255, 255, 0.14)',
          textPrimary: '#EBEBEB',
          textSecondary: '#9EA1A5',
          textMuted: '#777777',
          emerald: '#1DB954',
          cyan: '#00F0FF',
          amber: '#F5B942',
          crimson: '#EF4444',
          deepBlue: '#0E265F',
          navyAccent: '#1657AD',
          // Backwards-compatible aliases
          bg: '#121212',
          card: '#181818',
          surfaceHover: '#202020',
          borderSubtle: 'rgba(255, 255, 255, 0.05)',
          accent: '#1657AD',
          success: '#1DB954',
          danger: '#EF4444',
          warning: '#F5B942',
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        card: '16px',
        control: '8px',
      }
    },
  },
  plugins: [],
}
