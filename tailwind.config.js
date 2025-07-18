/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'ipli-purple': {
          50: '#faf9fc',
          100: '#f3e5f5',
          200: '#e1bee7',
          300: '#ce93d8',
          400: '#ba68c8',
          500: '#9c27b0',
          600: '#7b1fa2',
          700: '#6a1b9a',
          800: '#4a148c',
          900: '#3d1181',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'bounce-gentle': 'bounce 2s infinite',
      }
    },
  },
  plugins: [],
}