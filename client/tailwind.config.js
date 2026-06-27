/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: '#0B0F19',
          card: '#111827',
          secondary: '#1F2937',
          hover: '#243147',
        },
        border: {
          DEFAULT: '#2D3748',
          subtle: '#1F2937',
          strong: '#374151',
        },
        text: {
          primary: '#F9FAFB',
          secondary: '#E5E7EB',
          muted: '#9CA3AF',
          faint: '#6B7280',
        },
        accent: {
          blue: '#3B82F6',
          'blue-hover': '#2563EB',
          green: '#22C55E',
          yellow: '#F59E0B',
          red: '#EF4444',
          purple: '#8B5CF6',
          cyan: '#06B6D4',
        },
        difficulty: {
          easy: '#22C55E',
          medium: '#F59E0B',
          hard: '#EF4444',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      fontSize: {
        '2xs': '0.625rem',
      },
      borderRadius: {
        sm: '4px',
        DEFAULT: '6px',
        md: '8px',
        lg: '10px',
        xl: '12px',
      },
      boxShadow: {
        card: '0 1px 3px 0 rgba(0,0,0,0.4), 0 1px 2px -1px rgba(0,0,0,0.4)',
        'card-hover': '0 4px 12px 0 rgba(0,0,0,0.5)',
        glow: '0 0 20px rgba(59,130,246,0.15)',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.2s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp: { from: { opacity: '0', transform: 'translateY(8px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        slideDown: { from: { opacity: '0', transform: 'translateY(-8px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
      },
      screens: {
        xs: '480px',
      },
    },
  },
  plugins: [require('@tailwindcss/forms')],
};
