import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0A0A0F',
        surface: '#121218',
        surface2: '#181820',
        line: '#242430',
        ink: '#E7E7EC',
        muted: '#8B8B98',
        indigo: '#6C63F5',
        cyan: '#22D3EE',
        amber: '#F5A524',
        rose: '#FB6A8A',
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
} satisfies Config;
