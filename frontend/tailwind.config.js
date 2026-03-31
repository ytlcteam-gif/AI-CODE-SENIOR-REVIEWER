/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Menlo', 'monospace'],
      },
      colors: {
        brand: {
          DEFAULT: '#4f46e5',
          light:   '#818cf8',
          dark:    '#3730a3',
        },
      },
    },
  },
  plugins: [],
};
