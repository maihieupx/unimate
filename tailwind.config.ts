import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: '#EFEBFA',
        lavender: {
          50: '#F7F5FE',
          100: '#EFEBFA',
          200: '#DDD5F6',
          300: '#C5B8F0',
          400: '#A895E6',
          500: '#8B74DB',
          600: '#7259C7',
          700: '#5B44A6',
        },
        peach: {
          100: '#FFEFE5',
          200: '#FFD9C2',
          300: '#FFBF99',
          400: '#FF9E6B',
          500: '#F7834A',
        },
        butter: {
          100: '#FFF9DF',
          200: '#FFF0B3',
          300: '#FFE485',
          400: '#FCD34D',
        },
        ink: {
          DEFAULT: '#2B2545',
          soft: '#6B6588',
          muted: '#A19CB8',
        },
      },
      fontFamily: {
        sans: ['var(--font-nunito)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 10px 30px -14px rgba(114, 89, 199, 0.22)',
        float: '0 24px 50px -22px rgba(114, 89, 199, 0.45)',
        'inner-3d': 'inset 0 -6px 0 rgba(43, 37, 69, 0.08), inset 0 4px 0 rgba(255, 255, 255, 0.65)',
      },
      borderRadius: {
        '4xl': '2rem',
      },
      keyframes: {
        flicker: {
          '0%, 100%': { transform: 'scale(1) rotate(-2deg)' },
          '50%': { transform: 'scale(1.08) rotate(2deg)' },
        },
      },
      animation: {
        flicker: 'flicker 1.6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
} satisfies Config;
