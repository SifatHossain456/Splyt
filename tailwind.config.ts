import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        sp: {
          bg:      '#060C18',
          card:    'rgba(10,20,40,0.75)',
          green:   '#10B981',
          'green-light': '#34D399',
          'green-dim':   'rgba(16,185,129,0.1)',
          'green-border':'rgba(16,185,129,0.2)',
          blue:    '#3B82F6',
          text:    '#E2E8F0',
          muted:   '#64748B',
          border:  'rgba(255,255,255,0.07)',
          success: '#22C55E',
          warn:    '#F59E0B',
          danger:  '#EF4444',
        },
      },
      fontFamily: {
        sans:    ['Inter', 'system-ui', 'sans-serif'],
        display: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        mono:    ['"JetBrains Mono"', 'monospace'],
      },
      animation: {
        'fade-up':  'fadeUp 0.45s ease-out both',
        'scale-in': 'scaleIn 0.3s ease-out both',
        'pulse-slow':'pulse 3s ease-in-out infinite',
      },
      keyframes: {
        fadeUp:  { from: { opacity:'0', transform:'translateY(14px)' }, to: { opacity:'1', transform:'translateY(0)' } },
        scaleIn: { from: { opacity:'0', transform:'scale(0.95)' },      to: { opacity:'1', transform:'scale(1)' } },
      },
    },
  },
  plugins: [],
};

export default config;
