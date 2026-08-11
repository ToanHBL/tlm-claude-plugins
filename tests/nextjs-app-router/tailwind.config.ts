import type { Config } from 'tailwindcss';

// Tailwind CSS is the SOLE styling system — no HeroUI/NextUI/any external UI kit.
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#2563eb',
        secondary: '#475569',
        danger: '#dc2626',
        success: '#16a34a',
      },
      borderRadius: {
        small: '0.375rem',
      },
    },
  },
  plugins: [],
};

export default config;
