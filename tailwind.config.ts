import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        background: "#020817",
        foreground: "#E5E7EB",
        muted: "#111827",
        accent: "#1F2937",
        primary: {
          DEFAULT: "#3B82F6",
          foreground: "#F9FAFB"
        },
        border: "#1F2937"
      },
      boxShadow: {
        soft: "0 18px 40px rgba(15,23,42,0.65)"
      },
      borderRadius: {
        xl: "1.25rem"
      }
    }
  },
  plugins: []
};

export default config;
