import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#222627",
        surface: "#292d2e",
        accent: "#61ec7d",
        "text-primary": "#ffffff",
        "text-secondary": "#9ca3af",
        error: "#ef4444",
        warning: "#f59e0b",
      },
      fontFamily: {
        sans: ["DM Sans", "Inter", "system-ui", "sans-serif"],
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "glow": "glow 2s ease-in-out infinite alternate",
        "card-flip": "flip 0.6s ease-in-out forwards",
      },
      keyframes: {
        glow: {
          "0%": { boxShadow: "0 0 5px var(--accent), 0 0 10px var(--accent)" },
          "100%": { boxShadow: "0 0 20px var(--accent), 0 0 30px var(--accent)" },
        },
        flip: {
          "0%": { transform: "rotateY(0deg)" },
          "100%": { transform: "rotateY(180deg)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;



