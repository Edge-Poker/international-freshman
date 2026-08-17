import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#080B12", // azul-noite profundo (fundo)
          900: "#0D1018",
          800: "#141924", // superficie
          700: "#1E2531",
          600: "#2B3341",
        },
        accent: {
          DEFAULT: "#3B9EFF",
          dim: "#2478D4",
          faint: "rgba(59,158,255,0.08)",
        },
        danger: { DEFAULT: "#E4572E", dim: "#B33F1E" },
        gold: { DEFAULT: "#E0A93B" },
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        sans: ["var(--font-body)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      boxShadow: {
        glow: "0 0 24px rgba(59,158,255,0.25), 0 0 64px rgba(59,158,255,0.10)",
        "glow-sm": "0 0 12px rgba(59,158,255,0.20)",
        card: "0 1px 0 rgba(255,255,255,0.04) inset, 0 8px 30px rgba(0,0,0,0.5)",
      },
      backgroundImage: {
        "radial-accent":
          "radial-gradient(600px 300px at 50% 0%, rgba(59,158,255,0.10), transparent 70%)",
      },
    },
  },
  plugins: [],
};
export default config;
