const defaultTheme = require('tailwindcss/defaultTheme')

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Poppins', ...defaultTheme.fontFamily.sans], // Main font
        heading: ['Poppins', ...defaultTheme.fontFamily.sans], // Headings
        body: ['Poppins', ...defaultTheme.fontFamily.sans], // Body text
        ui: ['Inter', ...defaultTheme.fontFamily.sans], // UI components, labels, small text
        brand: ['Nunito', ...defaultTheme.fontFamily.sans], // Brand text, logo, soft headings
      },
      colors: {
        // Monochrome theme for user-facing pages
        primary: {
          DEFAULT: '#111827', // near black
          50: '#F9FAFB',
          100: '#F3F4F6',
          200: '#E5E7EB',
          300: '#D1D5DB',
          400: '#9CA3AF',
          500: '#6B7280',
          600: '#4B5563',
          700: '#374151',
          800: '#1F2937',
          900: '#111827',
        },
        secondary: {
          DEFAULT: '#4B5563', // slate gray
          50: '#F9FAFB',
          100: '#F3F4F6',
          200: '#E5E7EB',
          300: '#D1D5DB',
          400: '#9CA3AF',
          500: '#6B7280',
          600: '#4B5563',
          700: '#374151',
          800: '#1F2937',
          900: '#111827',
        },
        softBlue: '#E5E7EB',
        softGray: '#F5F5F5',
        textDark: '#111827',
      },
      borderRadius: {
        'card': '22px',
        'image': '18px',
        'button': '999px',
      },
      boxShadow: {
        'soft': '0 6px 32px rgba(0,0,0,0.06)',
        'soft-lg': '0 8px 40px rgba(0,0,0,0.08)',
      },
      spacing: {
        's': '8px',
        'm': '16px',
        'l': '24px',
        'xl': '32px',
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}