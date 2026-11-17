import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        cream: { 50: '#FFFDF7' },
        butter: { 50: '#FFF9E3', 100: '#FFF3C4', 300: '#FFE58A', 500: '#F2C94C' },
        pink: {
          50: '#FFF6F8', 100: '#FFE9EF', 200: '#FFD3E0', 300: '#FFB8CD',
          400: '#F58FB0', 500: '#E96A96', 600: '#D14D7D', 700: '#B03A66',
        },
        rose: { 600: '#B8345F' },
        sage: { 200: '#DDEBD3' },
        paper: '#FFF8EC',
        line: '#F3E3E8',
        leaf: '#D8A9B8',
        ink: { 900: '#5A3A44', 600: '#8A6A73', 300: '#D9C3C8' },
      },
      fontFamily: {
        display: ['var(--font-playfair)', 'serif'],
        script: ['var(--font-playfair)', 'serif'], // judul bergaya tulisan: Playfair Display tegak tebal
        body: ['var(--font-nunito)', 'sans-serif'],
        hand: ['var(--font-caveat)', 'cursive'],
      },
      borderRadius: { sm: '14px', md: '20px', lg: '28px', xl: '36px' },
      boxShadow: {
        soft: '0 8px 24px rgba(209,77,125,.10)',
        float: '0 16px 40px rgba(209,77,125,.16)',
      },
      transitionTimingFunction: {
        soft: 'cubic-bezier(.22,.61,.36,1)',
        spring: 'cubic-bezier(.34,1.3,.64,1)',
      },
      keyframes: {
        marquee: { '0%': { transform: 'translateX(0)' }, '100%': { transform: 'translateX(-50%)' } },
        menuIn: { '0%': { opacity: '0', transform: 'translateY(-6px) scale(.98)' }, '100%': { opacity: '1', transform: 'none' } },
        floaty: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-10px)' } },
        sway: { '0%,100%': { transform: 'rotate(-2deg)' }, '50%': { transform: 'rotate(2deg)' } },
        pulseRing: { '0%': { boxShadow: '0 0 0 0 rgba(255,184,205,.8)' }, '100%': { boxShadow: '0 0 0 22px rgba(255,184,205,0)' } },
        flame: { '0%,100%': { transform: 'scale(1,1) rotate(-2deg)' }, '50%': { transform: 'scale(.92,1.08) rotate(2deg)' } },
        pop: { '0%': { transform: 'scale(.6)', opacity: '0' }, '70%': { transform: 'scale(1.08)', opacity: '1' }, '100%': { transform: 'scale(1)' } },
      },
      animation: {
        marquee: 'marquee 38s linear infinite',
        slowspin: 'spin 20s linear infinite',
        menuIn: 'menuIn .16s cubic-bezier(.22,.61,.36,1) both',
        floaty: 'floaty 8s ease-in-out infinite',
        sway: 'sway 9s ease-in-out infinite',
        pulseRing: 'pulseRing 1.4s ease-out infinite',
        flame: 'flame .5s ease-in-out infinite',
        pop: 'pop .5s cubic-bezier(.34,1.3,.64,1) both',
      },
    },
  },
  plugins: [],
};

export default config;
