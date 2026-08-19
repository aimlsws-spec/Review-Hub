/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
    '../../packages/shared-ui/src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#172554',
        },
        brand: {
          50: '#fdf4ff',
          100: '#fae8ff',
          200: '#f5d0fe',
          300: '#f0abfc',
          400: '#e879f9',
          500: '#d946ef',
          600: '#c026d3',
          700: '#a21caf',
          800: '#86198f',
          900: '#701a75',
        },
        // Orange brand palette for login page
        rh: {
          50:  '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#f97316',
          600: '#FF6B35',
          700: '#FF4D4F',
          800: '#c2410c',
          900: '#7c2d12',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card:        '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        'card-hover':'0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        'auth-card': '0 0 0 1px rgba(0,0,0,0.04), 0 24px 48px -8px rgba(0,0,0,0.10), 0 8px 16px -4px rgba(0,0,0,0.06)',
        'float-card':'0 8px 32px -4px rgba(0,0,0,0.12), 0 2px 8px -2px rgba(0,0,0,0.08)',
        'float-sm':  '0 4px 16px -2px rgba(0,0,0,0.10)',
        'btn-orange':'0 4px 20px rgba(255,107,53,0.40)',
      },
      keyframes: {
        'fade-up': {
          '0%':   { opacity: '0', transform: 'translateY(14px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'float-a': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':      { transform: 'translateY(-10px)' },
        },
        'float-b': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':      { transform: 'translateY(8px)' },
        },
        'float-c': {
          '0%, 100%': { transform: 'translateY(0px) rotate(0deg)' },
          '50%':      { transform: 'translateY(-6px) rotate(2deg)' },
        },
      },
      animation: {
        'fade-up':          'fade-up 0.55s ease-out both',
        'fade-up-1':        'fade-up 0.55s 0.08s ease-out both',
        'fade-up-2':        'fade-up 0.55s 0.16s ease-out both',
        'fade-up-3':        'fade-up 0.55s 0.24s ease-out both',
        'fade-up-4':        'fade-up 0.55s 0.32s ease-out both',
        'fade-in':          'fade-in 0.7s ease-out both',
        'float-a':          'float-a 5s ease-in-out infinite',
        'float-b':          'float-b 6.5s ease-in-out infinite',
        'float-c':          'float-c 4.5s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
