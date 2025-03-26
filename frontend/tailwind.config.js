/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        montserrat: ['Montserrat', 'sans-serif'],
        mono: ['Montserrat', 'monospace'],
      },
      colors: {
        background: '#000000',
        border: '#333333',
        'text-primary': '#FFFFFF',
        'text-secondary': '#A0AEC0',
        accent: '#3B82F6',
      },
      borderRadius: {
        card: '0.5rem',
      },
      boxShadow: {
        card: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      },
    },
  },
  plugins: [],
} 