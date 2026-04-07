/** Конфиг Tailwind: сканируем только исходники в src */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Georgia', 'Cambria', 'Times New Roman', 'serif'],
        sans: ['system-ui', 'Segoe UI', 'sans-serif'],
      },
      colors: {
        cosmic: {
          950: '#0a0618',
          900: '#120b2e',
          800: '#1a1240',
          700: '#2d1f5c',
        },
        star: {
          gold: '#e8d5a3',
          rose: '#c9a0dc',
        },
      },
    },
  },
  plugins: [],
}
