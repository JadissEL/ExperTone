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
            DEFAULT: '#0A192F',
            deep: '#020617',
            light: '#1e293b',
            muted: '#334155',
          },
          emerald: {
            DEFAULT: '#10B981',
            muted: 'rgba(16, 185, 129, 0.2)',
            glow: 'rgba(16, 185, 129, 0.15)',
          },
          amber: {
            warning: '#F59E0B',
            soft: '#fbbf24',
            muted: 'rgba(245, 158, 11, 0.2)',
          },
          frost: {
            DEFAULT: 'rgba(255, 255, 255, 0.03)',
            elevated: 'rgba(255, 255, 255, 0.06)',
            border: 'rgba(255, 255, 255, 0.08)',
            strong: 'rgba(255, 255, 255, 0.12)',
          },
        },
        aether: {
          base: '#020617',
          indigo: '#3730a3',
          violet: '#a855f7',
          emerald: '#10b981',
          sky: '#0ea5e9',
          text: '#94a3b8',
        },
      },
      borderRadius: {
        sm: '6px',
        md: '8px',
        lg: '12px',
        bento: '24px',
        'bento-sm': '16px',
        card: '20px',
      },
      backdropBlur: {
        xs: '2px',
        glass: '20px',
        'glass-deep': '28px',
        vanguard: '24px',
      },
      boxShadow: {
        'glass-soft': '0 8px 32px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(255,255,255,0.08)',
        'glass-glow': '0 20px 40px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(255,255,255,0.06), 0 0 60px -12px rgba(168, 85, 247, 0.2)',
        float: '0 24px 48px -12px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(255,255,255,0.06)',
        'glow-sage': '0 0 24px -4px rgba(16, 185, 129, 0.25)',
        'glow-amber': '0 0 24px -4px rgba(245, 158, 11, 0.25)',
        'glow-indigo': '0 0 40px -8px rgba(99, 102, 241, 0.4)',
        'glow-violet': '0 0 40px -8px rgba(168, 85, 247, 0.4)',
        'glow-emerald': '0 0 32px -6px rgba(16, 185, 129, 0.5)',
        'glow-emerald-strong': '0 0 48px -8px rgba(16, 185, 129, 0.6)',
      },
      spacing: {
        'nav-collapsed': '56px',
        'nav-expanded': '220px',
        'filter-bar': '56px',
        'inspector': '450px',
      },
      zIndex: {
        base: '0',
        float: '10',
        overlay: '20',
        modal: '30',
        toast: '40',
        nav: '50',
      },
      animation: {
        'pulse-slow': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        breathing: 'breathing 2.5s ease-in-out infinite',
        glow: 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        breathing: {
          '0%, 100%': { opacity: '0.97', transform: 'scale(1)' },
          '50%': { opacity: '1.03', transform: 'scale(1.005)' },
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
