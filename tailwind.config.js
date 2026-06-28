/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Clash Display"', 'Syne', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      colors: {
        ink: {
          900: '#070707',
          800: '#0d0d0f',
          700: '#141417',
          600: '#1c1c21',
          500: '#26262d',
        },
        bone: '#ece7df',
        ash: '#8b8780',
        ember: '#ff5a3c',
        acid: '#c6ff4a',
        cobalt: '#3b5bff',
        gold: '#f5c542',
      },
      keyframes: {
        grain: {
          '0%, 100%': { transform: 'translate(0, 0)' },
          '10%': { transform: 'translate(-5%, -10%)' },
          '20%': { transform: 'translate(-15%, 5%)' },
          '30%': { transform: 'translate(7%, -25%)' },
          '40%': { transform: 'translate(-5%, 25%)' },
          '50%': { transform: 'translate(-15%, 10%)' },
          '60%': { transform: 'translate(15%, 0%)' },
          '70%': { transform: 'translate(0%, 15%)' },
          '80%': { transform: 'translate(3%, -25%)' },
          '90%': { transform: 'translate(-10%, 10%)' },
        },
        floaty: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        spin: {
          to: { transform: 'rotate(360deg)' },
        },
      },
      animation: {
        grain: 'grain 8s steps(10) infinite',
        floaty: 'floaty 6s ease-in-out infinite',
        'spin-slow': 'spin 3.5s linear infinite',
      },
    },
  },
  plugins: [],
}
