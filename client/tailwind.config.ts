import type { Config } from 'tailwindcss';

function withOpacity(variable: string) {
  return ({ opacityValue }: { opacityValue?: string }) => {
    if (opacityValue !== undefined) return `rgba(var(${variable}), ${opacityValue})`;
    return `rgb(var(${variable}))`;
  };
}

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        bg: withOpacity('--color-bg'),
        surface: withOpacity('--color-surface'),
        surface2: withOpacity('--color-surface2'),
        line: withOpacity('--color-line'),
        ink: withOpacity('--color-ink'),
        muted: withOpacity('--color-muted'),
        indigo: withOpacity('--color-indigo'),
        cyan: withOpacity('--color-cyan'),
        amber: withOpacity('--color-amber'),
        rose: withOpacity('--color-rose'),
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
