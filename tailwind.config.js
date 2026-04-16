/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Primary brand blue (YSRCP)
        primary: {
          50: '#eef4ff',
          100: '#d9e6ff',
          200: '#bcd4ff',
          300: '#8eb8ff',
          400: '#5990ff',
          500: '#1E6BD6',  // main
          600: '#1368d6',  // used widely in admin
          700: '#0B4DA2',  // darker variant
          800: '#0a3f85',
          900: '#0d356b',
        },
        // Accent green
        accent: {
          50: '#edfff5',
          100: '#d5ffea',
          200: '#aeffd6',
          300: '#6ffeb5',
          400: '#2af28d',
          500: '#00C853',  // main
          600: '#00a86b',  // used in gradients
          700: '#008a56',
          800: '#066c46',
          900: '#07593b',
        },
        // Gold / Orange
        gold: {
          400: '#f0bd6e',
          500: '#E7A95B',
          600: '#d4943e',
        },
        // WhatsApp green
        whatsapp: {
          500: '#25D366',
          600: '#20b85a',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }],   // 10px
      },
      borderRadius: {
        '4xl': '2rem',
      },
      boxShadow: {
        'card': '0 4px 16px rgba(0, 0, 0, 0.08)',
        'card-hover': '0 8px 24px rgba(0, 0, 0, 0.12)',
        'modal': '0 20px 60px rgba(0, 0, 0, 0.15)',
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};
