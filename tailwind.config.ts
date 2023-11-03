import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {},
  },
  themes: ["light", "black"],
  darkTheme: "black",
  plugins: [require("@tailwindcss/typography"), require("daisyui")],
};

export default config;
