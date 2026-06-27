/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Palette syndic : bleu nuit institutionnel + sable chaleureux + vert validation
        brand: {
          50:  '#eef2f7',
          100: '#d4dfec',
          500: '#2c5282',
          600: '#234166',
          700: '#1a3150',
          900: '#0f1d30',
        },
        sand: {
          50:  '#faf7f2',
          100: '#f0e9dd',
          200: '#e2d5bf',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        arabic: ['Tajawal', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
