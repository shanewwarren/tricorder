/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        "bg-page": "#FAFAF9",
        "bg-card": "#F5F5F4",
        "bg-elevated": "#FFFFFF",
        "text-primary": "#1C1917",
        "text-secondary": "#78716C",
        "text-tertiary": "#A8A29E",
        "accent-terracotta": "#D97706",
        "accent-terracotta-light": "#FEF3C7",
        "accent-teal": "#0D9488",
        "border-subtle": "#E7E5E4",
        "status-running": "#16A34A",
        "status-waiting": "#D97706",
        "status-paused": "#EA580C",
        "status-completed": "#78716C",
        "status-local": "#2563EB",
        "status-cancel": "#DC2626",
        "status-error": "#DC2626",
      },
      fontFamily: {
        "dm-sans": ["DM Sans"],
        "jetbrains": ["JetBrains Mono"],
      },
    },
  },
  plugins: [],
};
