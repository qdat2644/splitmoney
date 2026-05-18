/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        dark: {
          950: '#09090b', // Zinc 950 - Main deepest background
          900: '#121214', // Zinc 900 - Mid dark background
          800: '#18181b', // Zinc 900/800 - Sidebar/Primary container background
          700: '#202024', // Zinc 800 - Elevated card surface
          600: '#27272a', // Zinc 700 - Hover surface
          500: '#3f3f46', // Zinc 600 - Muted border / active hover
          400: '#52525b', // Zinc 500 - Border / inactive state
        },
        accent: {
          blue: '#2563eb', // Sophisticated Workspace Blue
          'blue-light': '#60a5fa',
          purple: '#4f46e5', // Calmer Workspace Indigo
          'purple-light': '#818cf8',
          cyan: '#0284c7', // Workspace Sky/Cyan
          'cyan-light': '#38bdf8',
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'glass': 'none', // Remove glass background gradient
      },
      backdropBlur: {
        xs: '2px',
      },
      boxShadow: {
        'glass': '0 2px 8px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255,255,255,0.03)', // Calmer shadow
        'glow-blue': 'none', // Remove glow
        'glow-purple': 'none', // Remove glow
        'glow-cyan': 'none', // Remove glow
        'card': '0 4px 12px rgba(0, 0, 0, 0.15)', // Minimal workspace card shadow
      },
      animation: {
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'gradient': 'none', // Remove heavy shifting gradients
      },
      keyframes: {},
    },
  },
  plugins: [],
}
