import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0e7ff',
          100: '#d4bbff',
          200: '#b78dff',
          300: '#9a5fff',
          400: '#7c31ff',
          500: '#6d28d9',
          600: '#5b21b6',
          700: '#4c1d95',
          800: '#3b1777',
          900: '#2e1065',
        },
      },
      backgroundImage: {
        'gradient-brand': 'linear-gradient(135deg, #6d28d9 0%, #3b82f6 100%)',
        'gradient-card': 'linear-gradient(135deg, rgba(109,40,217,0.1) 0%, rgba(59,130,246,0.1) 100%)',
      },
    },
  },
  plugins: [],
}
export default config
