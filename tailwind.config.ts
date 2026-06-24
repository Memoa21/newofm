import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: '#F8FAFC',
        card: '#FFFFFF',
        panel: '#F1F5F9',
        accent: '#4F46E5'
      }
    }
  },
  plugins: []
};

export default config;
