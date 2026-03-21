/** @type {import('tailwindcss').Config} */
module.exports = {
	content: ["./app/**/*.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
	presets: [require("nativewind/preset")],
	theme: {
		extend: {
			colors: {
				// Backgrounds
				"bg-page": "#FAFAF9",
				"bg-card": "#F1F1F1",
				"bg-elevated": "#FFFFFF",
				// Text
				"text-primary": "#1C1917",
				"text-dark": "#292524",
				"text-secondary": "#78716C",
				"text-tertiary": "#A8A29E",
				// Accent
				primary: "#EA580C",
				"primary-pressed": "#D35407",
				teal: "#14B8A6",
				"teal-pressed": "#0F9380",
				// Borders
				"border-subtle": "#E7E5E4",
				"border-default": "#D6D3D1",
				// Status
				"status-running": "#16A34A",
				"status-waiting": "#D97706",
				"status-paused": "#EA580C",
				"status-completed": "#78716C",
				"status-error": "#DC2626",
				"status-blue": "#2563EB",
			},
			fontFamily: {
				"dm-sans": ["DM Sans"],
				jetbrains: ["JetBrains Mono"],
			},
			fontSize: {
				"2xs": ["10px", { lineHeight: "14px" }],
				xs: ["11px", { lineHeight: "16px" }],
				sm: ["12px", { lineHeight: "16px" }],
				base: ["13px", { lineHeight: "20px" }],
				md: ["14px", { lineHeight: "20px" }],
				lg: ["15px", { lineHeight: "22px" }],
				xl: ["16px", { lineHeight: "24px" }],
				"2xl": ["18px", { lineHeight: "26px" }],
				"3xl": ["28px", { lineHeight: "34px" }],
				"4xl": ["32px", { lineHeight: "38px" }],
			},
			borderRadius: {
				sm: "6px",
				DEFAULT: "8px",
				md: "10px",
				lg: "12px",
				xl: "14px",
				"2xl": "16px",
				full: "9999px",
			},
		},
	},
	plugins: [],
};
