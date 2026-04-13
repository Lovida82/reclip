import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'reclip-bg': '#f4f1eb',
        'reclip-fg': '#3a3a38',
        'reclip-accent': '#e85d2a',
      },
      fontFamily: {
        'instrument-serif': ['Instrument Serif', 'Georgia', 'serif'],
        'dm-mono': ['DM Mono', 'Menlo', 'monospace'],
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-down': {
          '0%': { opacity: '0', transform: 'translateY(-6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.3s ease-out forwards',
        'slide-down': 'slide-down 0.25s ease-out forwards',
      },
    },
  },
  plugins: [],
}

export default config
