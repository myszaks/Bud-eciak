/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
       brand: "#36648B",

        textMain: "#1F2937",
        textMuted: "#6B7280",

        borderSoft: "#E5E7EB",
        bgSoft: "#F9FAFB",

        success: "#16A34A",
        danger: "#DC2626",
      },
      boxShadow: {
        card: "0 1px 2px rgba(0,0,0,0.05)",
      },
      borderRadius: {
        card: "12px",
      },
      screens: {
        xs: "475px",
      },
    },
  },
  plugins: [],
};
