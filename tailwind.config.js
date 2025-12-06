/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          bg: '#121212',
          surface: '#1E1E1E',
          card: '#2D2D2D',
          hover: '#383838',
          border: '#404040',
        }
      }
    },
  },
  plugins: [],
}