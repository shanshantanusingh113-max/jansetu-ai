/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html","./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: '#121212',      // primary — solid black actions/headings
          soft: '#191c1d',          // on-surface
        },
        corsair: {
          DEFAULT: '#0051d5',      // secondary blue
          bright: '#316bf3',       // secondary-container
          deep: '#003ea8',
        },
        accent: {
          DEFAULT: '#d95f00',      // tertiary orange accent
          strong: '#341100',       // tertiary-container
        },
        parchment: {
          DEFAULT: '#f8f9fa',      // surface background
          dim: '#d9dadb',
          low: '#f3f4f5',
          "lowest": '#ffffff',
        },
        outline: {
          DEFAULT: '#747878',
          variant: '#e5e7eb',      // grid / hairline borders
        },
        surfaceVariant: '#e1e3e4',
        error: {
          DEFAULT: '#ba1a1a',
          container: '#ffdad6',
          oncontainer: '#93000a',
        },
        status: {
          blue: '#0051d5',
          amber: '#b45309',
          green: '#166534',
          gray: '#4b5563',
          red: '#ba1a1a',
        },
      },
      fontFamily: {
        sans: ['Inter','system-ui','-apple-system','sans-serif'],
        display: ['"Libre Caslon Text"','Georgia','serif'],
        hindi: ['Noto Sans Devanagari','Inter','sans-serif'],
      },
      letterSpacing: {
        tightest: '-0.02em',
      },
      boxShadow: {
        paper: '0 4px 4px rgba(0,0,0,0.02)',
        card: '0 4px 30px rgba(0,0,0,0.05)',
        glow: '0 0 40px rgba(0,81,213,0.15)',
        orb: '0 0 60px rgba(217,95,0,0.15)',
      },
      backgroundImage: {
        'dot-grid': 'radial-gradient(circle, #e5e7eb 1px, transparent 1px)',
      },
      backgroundSize: {
        'dot-grid': '24px 24px',
      },
      keyframes: {
        drift: {
          '0%, 100%': { transform: 'translate(0,0) scale(1)' },
          '25%': { transform: 'translate(40px,-30px) scale(1.05)' },
          '50%': { transform: 'translate(-20px,20px) scale(0.97)' },
          '75%': { transform: 'translate(20px,30px) scale(1.03)' },
        },
        floaty: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'pulse-dot': {
          '0%, 100%': { opacity: '0.25', transform: 'scale(1)' },
          '50%': { opacity: '1', transform: 'scale(1.4)' },
        },
        rise: {
          '0%': { opacity: '0', transform: 'translateY(24px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'dash-flow': {
          'to': { strokeDashoffset: '-1000' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'grad-border': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        'bounce-subtle': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-4px)' },
        },
      },
      animation: {
        drift: 'drift 18s ease-in-out infinite',
        floaty: 'floaty 7s ease-in-out infinite',
        'pulse-dot': 'pulse-dot 3s ease-in-out infinite',
        rise: 'rise 0.7s cubic-bezier(0.22,1,0.36,1) both',
        'rise-slow': 'rise 1s cubic-bezier(0.22,1,0.36,1) both',
        'dash-flow': 'dash-flow 40s linear infinite',
        'fade-in': 'fade-in 1s ease-out both',
        shimmer: 'shimmer 3s linear infinite',
        'grad-border': 'grad-border 6s ease infinite',
        marquee: 'marquee 30s linear infinite',
        'bounce-subtle': 'bounce-subtle 2.5s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
