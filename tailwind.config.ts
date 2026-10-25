import type { Config } from "tailwindcss";
import colors from "tailwindcss/colors";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-geist)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "monospace"],
      },
      colors: {
        // Mesmo vermelho do site do cliente. 500 é o tom de ação.
        primary: {
          50: "#fdf3f1",
          100: "#fbe4df",
          200: "#f6c7bd",
          300: "#ee9f8f",
          400: "#e2705a",
          500: "#c8321e",
          600: "#ae2a18",
          700: "#912314",
          800: "#771f14",
          900: "#631d14",
        },
        // Cinza neutro no lugar do cinza azulado padrão do Tailwind.
        gray: colors.neutral,
      },
      animation: {
        "pulse-slow": "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
    },
  },
  plugins: [],
};
export default config;
