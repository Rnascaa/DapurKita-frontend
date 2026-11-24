import forms from '@tailwindcss/forms';

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        forest: '#233000',
        olive: '#5E6600',
        lime: '#9CAA00',
        sage: '#EBF0E4',
        graphite: '#4D4D4D',
        silver: '#B0B0B0',
      },
      fontFamily: {
        serif: ['Rufina', 'Georgia', 'serif'],
        sans: ['Lato', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [forms],
};
