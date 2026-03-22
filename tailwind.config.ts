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
        cream: {
          DEFAULT: "#FCF9F2",
          muted: "#F5F0E8",
          ink: "#2F5233",
        },
        bridge: {
          nl: "#FF8C42",
          tw: "#2F5233",
        },
      },
      fontFamily: {
        sans: ["var(--font-nunito)", "var(--font-noto)", "system-ui", "sans-serif"],
        hand: ["var(--font-xiaowei)", "var(--font-noto)", "serif"],
        display: ["var(--font-xiaowei)", "var(--font-noto)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
