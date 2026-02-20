/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', 'Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        expert: {
          navy: {
            DEFAULT: '#0f172a',
            deep: '#020617',
            light: '#1e293b',
            muted: '#334155',
          },
          sage: {
            DEFAULT: '#84cc16',
            soft: '#a3e635',
            muted: 'rgba(132, 204, 22, 0.2)',
          },
          amber: {
            warning: '#f59e0b',
            soft: '#fbbf24',
            muted: 'rgba(245, 158, 11, 0.2)',
          },
          frost: {
            DEFAULT: 'rgba(255, 255, 255, 0.08)',
            border: 'rgba(255, 255, 255, 0.12)',
            strong: 'rgba(255, 255, 255, 0.15)',
          },
        },
      },
      borderRadius: {
        bento: '24px',
        bento-sm: '16px',
        card: '20px',
      },
      backdropBlur: {
        xs: '2px',
        glass: '12px',
        'glass-deep': '20px',
      },
      boxShadow: {
        'glass-soft': '0 8px 32px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(255,255,255,0.08)',
        'glass-glow': '0 20px 40px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(255,255,255,0.06), 0 0 60px -12px rgba(74, 158, 255, 0.15)',
        'float': '0 24px 48px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255,255,255,0.06)',
        'glow-sage': '0 0 24px -4px rgba(132, 204, 22, 0.25)',
        'glow-amber': '0 0 24px -4px rgba(245, 158, 11, 0.25)',
      },
      animation: {
        'pulse-slow': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'breathing': 'breathing 2.5s ease-in-out infinite',
        glow: 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        breathing: {
          '0%, 100%': { opacity: '0.7', transform: 'scale(1)' },
          '50%': { opacity: '1', transform: 'scale(1.01)' },
        },
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(74, 158, 255, 0.5)' },
          '100%': { boxShadow: '0 0 20px rgba(74, 158, 255, 0.8)' },
        },
      },
    },
  },
  plugins: [],
};
