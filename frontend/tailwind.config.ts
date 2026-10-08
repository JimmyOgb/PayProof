import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f6ff',
          100: '#dbeafe',
          500: '#0066FF',
          600: '#0052CC',
          700: '#003d99',
          900: '#001a4d',
        },
        arc: {
          blue: '#0052FF',
          dark: '#0D1117',
          card: '#FFFFFF',
          border: '#E5E7EB',
        },
      },
    },
  },
  plugins: [],
};

export default config;
