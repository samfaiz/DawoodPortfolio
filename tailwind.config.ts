import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        raise: 'var(--bg-raise)',
        line: 'var(--line)',
        ink: 'var(--ink)',
        muted: 'var(--muted)',
        amber: 'var(--amber)',
        'amber-hot': 'var(--amber-hot)',
        hassel: 'var(--hassel-red)',
      },
      fontFamily: {
        display: ['var(--font-display)'],
        body: ['var(--font-body)'],
        exif: ['var(--font-exif)'],
      },
      transitionTimingFunction: {
        'out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
        'out-quart': 'cubic-bezier(0.25, 1, 0.5, 1)',
      },
    },
  },
  plugins: [],
};

export default config;
