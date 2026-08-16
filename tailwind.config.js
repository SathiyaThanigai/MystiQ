/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        mystiq: {
          bg: '#0a0a0c',
          surface: '#111115',
          panel: '#1a1a1f',
          border: '#2a2a30',
          crimson: '#dc2626',
          'crimson-dark': '#991b1b',
          'crimson-glow': '#ef4444',
          text: '#e8e8ec',
          'text-dim': '#9ca3af',
          'text-muted': '#6b7280',
        },
        case: {
          'blood': '#dc2626',
          'detective': '#1d4ed8',
          'crime': '#ca8a04',
          'blackmail': '#374151',
          'forensic': '#db2777',
          'motive': '#7c3aed',
          'cold': '#92400e',
          'evidence': '#ea580c',
          'surveillance': '#4b5563',
          'secret': '#15803d',
        }
      },
      fontFamily: {
        display: ['Orbitron', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'scan': 'scan 2s ease-in-out infinite',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
        'grain': 'grain 8s steps(10) infinite',
        'typewriter': 'typewriter 3s steps(40) forwards',
      },
      keyframes: {
        scan: {
          '0%, 100%': { transform: 'translateY(-100%)' },
          '50%': { transform: 'translateY(100%)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        grain: {
          '0%, 100%': { transform: 'translate(0, 0)' },
          '10%': { transform: 'translate(-5%, -10%)' },
          '20%': { transform: 'translate(-15%, 5%)' },
          '30%': { transform: 'translate(7%, -25%)' },
          '40%': { transform: 'translate(-5%, 25%)' },
          '50%': { transform: 'translate(-15%, 10%)' },
          '60%': { transform: 'translate(15%, 0%)' },
          '70%': { transform: 'translate(0%, 15%)' },
          '80%': { transform: 'translate(3%, 35%)' },
          '90%': { transform: 'translate(-10%, 10%)' },
        },
        typewriter: {
          'from': { width: '0' },
          'to': { width: '100%' },
        }
      },
      backgroundImage: {
        'grid-pattern': 'linear-gradient(rgba(220, 38, 38, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(220, 38, 38, 0.03) 1px, transparent 1px)',
      },
      backgroundSize: {
        'grid': '50px 50px',
      }
    },
  },
  plugins: [],
}
