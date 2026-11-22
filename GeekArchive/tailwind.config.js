/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        espresso: "#2C1A10",
        chestnut: "#3B2314",
        sand: "#FAF8F5",
        sage: "#5E7A5E",
      },
    },
  },
  plugins: [],
};
