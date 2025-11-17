/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#1E40AF',
        'text-primary-light': '#131416',
        'text-primary-dark': '#FFFFFF',
        'text-secondary-light': '#6b7180',
        'text-secondary-dark': '#9CA3AF',
        'background-light': '#f1f2f3',
        'background-dark': '#1F2937',
      },
      fontFamily: {
        'inter': ['Inter', '"Noto Sans"', 'sans-serif'],
      },
    },
  },
  plugins: [],
  darkMode: 'class',
}
