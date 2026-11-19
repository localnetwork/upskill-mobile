/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: '#0056D2',
        background: '#F6F6F6',
        surface: '#FFFFFF',
        text: '#0F172A',
        'text-secondary': '#475569',
        danger: '#DC2626',
        success: '#16A34A',
      },
    },
  },
  plugins: [],
};
