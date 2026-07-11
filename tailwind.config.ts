import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Elevate brand (same in light and dark)
        elevate: {
          50: "#eefbff",
          100: "#d8f5fe",
          200: "#b6edfe",
          300: "#84e1fd",
          400: "#3fd0fb",
          500: "#05c3f9", // primary accent
          600: "#039fd6",
          700: "#047fad",
          800: "#0a678c",
          900: "#0e5573",
          950: "#08374d",
        },
        // Surfaces + text are CSS variables so dark mode is one class flip.
        // "white" is intentionally remapped to the card surface.
        white: "rgb(var(--surface) / <alpha-value>)",
        ink: {
          DEFAULT: "rgb(var(--ink) / <alpha-value>)",
          soft: "rgb(var(--ink-soft) / <alpha-value>)",
          muted: "rgb(var(--ink-muted) / <alpha-value>)",
          faint: "rgb(var(--ink-faint) / <alpha-value>)",
        },
        chalk: "rgb(var(--chalk) / <alpha-value>)",
        mist: "rgb(var(--mist) / <alpha-value>)",
      },
      fontFamily: {
        display: ["var(--font-sora)", "sans-serif"],
        body: ["var(--font-dm-sans)", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(27,27,36,0.04), 0 4px 16px rgba(27,27,36,0.05)",
        "card-hover":
          "0 2px 4px rgba(27,27,36,0.05), 0 10px 28px rgba(27,27,36,0.09)",
        glow: "0 0 0 4px rgba(5,195,249,0.15)",
      },
      borderRadius: {
        xl2: "1.25rem",
      },
    },
  },
  plugins: [],
};
export default config;
