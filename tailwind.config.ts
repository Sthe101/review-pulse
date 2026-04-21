import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        teal: "#0D9488",
        navy: "#1E3A5F",
        coral: "#EA580C",
        pos: "#059669",
        neg: "#DC2626",
        warn: "#D97706",
      },
    },
  },
};

export default config;
