/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,jsx,ts,tsx}',
    './public/index.html',
    '!./src/**/*.d.ts',
    '!./node_modules/**/*'
  ],
  safelist: [],
  theme: {
    extend: {
      fontFamily: {
        montserrat: ['Montserrat', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        background: {
          DEFAULT: '#121212',
          card: '#1E1E1E',
          hover: '#2E2E2E',
          secondary: '#1A1A1A',
        },
        text: {
          primary: '#E0E0E0',
          secondary: '#9E9E9E',
          accent: '#FFFFFF',
        },
        accent: {
          sol: '#9945FF',
          blue: '#00D1FF',
          green: '#4CAF50',
          red: '#FF5252',
          yellow: '#FFC107',
          purple: '#9C27B0',
        },
        success: '#4CAF50',
        error: '#FF5252',
        warning: '#FFC107',
        info: '#2196F3',
        border: '#2E2E2E',
        'border-light': '#3E3E3E',
      },
      borderRadius: {
        card: '12px',
        button: '6px',
        'xl': '12px',
      },
      boxShadow: {
        card: '0px 4px 20px rgba(0,0,0,0.3)',
        'card-hover': '0px 6px 24px rgba(0,0,0,0.4)',
        'glow-success': '0 0 15px rgba(76, 175, 80, 0.15)',
        'glow-error': '0 0 15px rgba(255, 82, 82, 0.15)',
        'glow-warning': '0 0 15px rgba(255, 193, 7, 0.15)',
        'glow-info': '0 0 15px rgba(33, 150, 243, 0.15)',
        'glow-accent': '0 0 20px rgba(153, 69, 255, 0.15)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'spin': 'spin 1s linear infinite',
        'slide-in': 'slideIn 0.3s ease-out',
        'slide-out': 'slideOut 0.3s ease-in',
        'pulse-slow': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 3s ease-in-out infinite',
        'scan': 'scan 2s linear infinite',
        'terminal-blink': 'blink 1s step-end infinite',
        'glitch': 'glitch 0.3s ease-in-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        slideOut: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-100%)' },
        },
        pulse: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '.5' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        scan: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        blink: {
          '0%, 50%': { opacity: '1' },
          '51%, 100%': { opacity: '0' },
        },
        glitch: {
          '0%, 100%': { transform: 'translateX(0)' },
          '33%': { transform: 'translateX(2px)' },
          '66%': { transform: 'translateX(-2px)' },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-card': 'linear-gradient(145deg, #121212 0%, #1E1E1E 100%)',
        'gradient-accent': 'linear-gradient(135deg, #9945FF 0%, #00D1FF 100%)',
      },
      spacing: {
        'card-padding': '20px',
        'section-spacing': '32px',
        'sidebar-width': '4rem',
      },
      transitionProperty: {
        'height': 'height',
        'spacing': 'margin, padding',
        'transform': 'transform',
        'opacity': 'opacity',
        'shadow': 'box-shadow',
      },
      transitionDuration: {
        '200': '200ms',
        '300': '300ms',
        '400': '400ms',
      },
      transitionTimingFunction: {
        'ease-in-out': 'cubic-bezier(0.4, 0, 0.2, 1)',
        'ease-out': 'cubic-bezier(0, 0, 0.2, 1)',
        'ease-in': 'cubic-bezier(0.4, 0, 1, 1)',
      },
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1rem', letterSpacing: '0.025em' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem', letterSpacing: '0.025em' }],
        'base': ['1rem', { lineHeight: '1.5rem', letterSpacing: '0.025em' }],
        'lg': ['1.125rem', { lineHeight: '1.75rem', letterSpacing: '0.025em' }],
        'xl': ['1.25rem', { lineHeight: '1.75rem', letterSpacing: '0.025em' }],
        '2xl': ['1.5rem', { lineHeight: '2rem', letterSpacing: '0.025em' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem', letterSpacing: '0.025em' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem', letterSpacing: '0.025em' }],
      },
      fontWeight: {
        light: '300',
        normal: '400',
        medium: '500',
        semibold: '600',
        bold: '700',
      },
    },
  },
  plugins: [],
} 