/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          gold: '#f59e0b',
          amber: '#d97706',
          dark: '#0f1117',
          surface: '#181c24'
        }
      }
    },
  },
  plugins: [],
}
