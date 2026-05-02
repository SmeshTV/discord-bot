/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      screens: {
        'xs': '375px',
        'xxs': '320px',
      },
      colors: {
        discord: {
          DEFAULT: '#5865F2',
          dark: '#4752C4',
        },
        mushroom: {
          neon: '#00FF87',
          glow: '#00cc6a',
          purple: '#6366f1',
          pink: '#db2777',
          dark: '#0a0a0f',
        }
      },
      minWidth: {
        '44': '44px',
        '48': '48px',
      },
      minHeight: {
        '44': '44px',
        '48': '48px',
      },
      backgroundImage: {
        'mushroom-gradient': 'linear-gradient(135deg, #0a0a0f 0%, #0f0f1a 50%, #12121f 100%)',
        'neon-gradient': 'linear-gradient(135deg, #00ff87 0%, #6366f1 50%, #db2777 100%)',
        'page-gradient': 'linear-gradient(180deg, rgba(17,24,39,0.9) 0%, rgba(31,41,55,0.9) 100%)',
      },
      animation: {
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
        'float': 'float 3s ease-in-out infinite',
      },
      keyframes: {
        'glow-pulse': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(99,102,241,0.3)' },
          '50%': { boxShadow: '0 0 40px rgba(99,102,241,0.6)' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
    },
  },
  plugins: [],
}