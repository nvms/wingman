module.exports = {
  content: ["./index.html", "./src/**/*.svelte"],
  darkMode: "class",
  theme: {
    fontFamily: {
      sans: ["Poppins", "sans-serif"],
      mono: ["Consolas", "Menlo", "Monaco", "monospace"],
    },
    extend: {
      colors: {
        prime: "#ff3e00",
      },
    },
  },
  plugins: [],
};