/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        gov: {
          dark: '#071a2f',
          navy: '#0b2545',
          slate: '#134074',
          subtle: '#f1f5f9',
          border: '#cbd5e1',
          accent: '#d97706',
          green: '#1b4332',
        },
        risk: {
          high: '#dc2626',
          'high-bg': '#fef2f2',
          'high-border': '#fecaca',
          med: '#d97706',
          'med-bg': '#fffbeb',
          'med-border': '#fde68a',
          low: '#059669',
          'low-bg': '#ecfdf5',
          'low-border': '#a7f3d0',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        'gov-card': '0 1px 3px 0 rgba(15, 23, 42, 0.08), 0 1px 2px -1px rgba(15, 23, 42, 0.06)',
        'gov-hover': '0 4px 6px -1px rgba(15, 23, 42, 0.1), 0 2px 4px -2px rgba(15, 23, 42, 0.08)',
        'gov-modal': '0 20px 25px -5px rgba(15, 23, 42, 0.2), 0 8px 10px -6px rgba(15, 23, 42, 0.1)',
      }
    },
  },
  plugins: [],
}
