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
        background: "var(--background)",
        foreground: "var(--foreground)",
        lagoon: "#0BBFBF",
        coral: "#FF6B47",
        sunshine: "#FFB347",
        ocean: "#1A2E2E",
        foam: "#E8F8F8",
      },
      fontFamily: {
        display: ["var(--font-syne)", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
