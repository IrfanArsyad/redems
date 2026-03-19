const animate = require('tailwindcss-animate')

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/renderer/index.html', './src/renderer/src/**/*.{vue,js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        base: 'rgb(var(--color-base-rgb) / <alpha-value>)',
        mantle: 'var(--color-mantle)',
        crust: 'var(--color-crust)',
        'surface-0': 'rgb(var(--color-surface-0-rgb) / <alpha-value>)',
        'surface-1': 'var(--color-surface-1)',
        'surface-2': 'var(--color-surface-2)',
        'overlay-0': 'rgb(var(--color-overlay-0-rgb) / <alpha-value>)',
        'overlay-1': 'var(--color-overlay-1)',
        'overlay-2': 'var(--color-overlay-2)',
        text: 'var(--color-text)',
        'text-secondary': 'var(--color-text-secondary)',
        'text-muted': 'var(--color-text-muted)',
        'text-faint': 'var(--color-text-faint)',
        accent: 'rgb(var(--color-accent-rgb) / <alpha-value>)',
        'accent-hover': 'rgb(var(--color-accent-hover-rgb) / <alpha-value>)',
        'accent-muted': 'var(--color-accent-muted)',
        'accent-subtle': 'var(--color-accent-subtle)',
        'accent-glow': 'var(--color-accent-glow)',
        danger: 'rgb(var(--color-danger-rgb) / <alpha-value>)',
        'danger-muted': 'var(--color-danger-muted)',
        warning: 'rgb(var(--color-warning-rgb) / <alpha-value>)',
        'warning-muted': 'var(--color-warning-muted)',
        success: 'rgb(var(--color-success-rgb) / <alpha-value>)',
        'success-muted': 'var(--color-success-muted)',
        info: 'rgb(var(--color-info-rgb) / <alpha-value>)',
        'info-muted': 'var(--color-info-muted)',
        border: 'var(--color-border)',
        'border-subtle': 'var(--color-border-subtle)',
        'border-accent': 'var(--color-border-accent)',
        'sidebar-bg': 'var(--color-sidebar)',
        'titlebar-bg': 'var(--color-titlebar)',
        'statusbar-bg': 'var(--color-statusbar)',
        'input-bg': 'var(--color-input)',
        'tab-active': 'var(--color-tab-active)',
        'tab-inactive': 'var(--color-tab-inactive)',
        ring: 'rgb(var(--color-accent-rgb) / <alpha-value>)'
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace']
      },
      fontSize: {
        xxs: ['0.75rem', { lineHeight: '1.15rem' }],
        xs: ['0.8125rem', { lineHeight: '1.25rem' }],
        md: ['1rem', { lineHeight: '1.5rem' }]
      },
      borderRadius: {
        xl: '12px',
        lg: '8px',
        md: '6px',
        sm: '4px'
      },
      boxShadow: {
        'glow': 'var(--shadow-glow)',
        'inner-subtle': 'var(--shadow-inner)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' }
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' }
        },
        'collapsible-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-collapsible-content-height)' }
        },
        'collapsible-up': {
          from: { height: 'var(--radix-collapsible-content-height)' },
          to: { height: '0' }
        },
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to: { opacity: '1', transform: 'translateY(0)' }
        },
        'slide-in-right': {
          from: { opacity: '0', transform: 'translateX(8px)' },
          to: { opacity: '1', transform: 'translateX(0)' }
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.95)' },
          to: { opacity: '1', transform: 'scale(1)' }
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' }
        },
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(99, 102, 241, 0)' },
          '50%': { boxShadow: '0 0 12px 2px rgba(99, 102, 241, 0.2)' }
        }
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'collapsible-down': 'collapsible-down 0.2s ease-out',
        'collapsible-up': 'collapsible-up 0.2s ease-out',
        'fade-in': 'fade-in 0.2s ease-out',
        'slide-in-right': 'slide-in-right 0.2s ease-out',
        'scale-in': 'scale-in 0.15s ease-out',
        'shimmer': 'shimmer 2s linear infinite',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite'
      }
    }
  },
  plugins: [animate]
}
