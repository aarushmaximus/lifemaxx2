module.exports = {
  content: ["./index.html", "./js/**/*.js"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        primary: "#e8e8e8",
        background: "#000000",
        surface: "#060606",
        "surface-dim": "#060606",
        "surface-container-lowest": "#050505",
        "surface-container": "#121212",
        "surface-container-highest": "#1a1a1a",
        "on-surface": "#e8e8f0",
        "on-surface-variant": "#7a7a85",
        secondary: "#e0e0e8",
        "on-secondary": "#0a0a0a",
        error: "#ef4444",
        "on-error": "#ffffff"
      },
      fontFamily: {
        "headline-md": ["Geist", "sans-serif"],
        "label-sm": ["Geist", "sans-serif"],
        "display-xl": ["Geist", "sans-serif"],
        "headline-lg": ["Geist", "sans-serif"],
        "body-md": ["Geist", "sans-serif"],
        "headline-lg-mobile": ["Geist", "sans-serif"],
        "body-lg": ["Geist", "sans-serif"],
        mono: ["Geist", "sans-serif"]
      }
    }
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/container-queries')
  ]
}
