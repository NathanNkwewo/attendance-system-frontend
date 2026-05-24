/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50:  '#e8edf5',
          100: '#c5d0e6',
          200: '#9fb0d5',
          300: '#7890c4',
          400: '#5a77b8',
          500: '#1a3a6b',
          600: '#163261',
          700: '#112856',
          800: '#0c1f45',
          900: '#071233',
        },
        accent: {
          DEFAULT: '#c8a951',
          light: '#e2c97e',
          dark: '#a88930',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
