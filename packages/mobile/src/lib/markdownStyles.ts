import { StyleSheet } from "react-native";

export const darkMarkdownStyles = StyleSheet.create({
	body: {
		fontFamily: "DM Sans",
		fontSize: 13,
		color: "#FFFFFF",
		lineHeight: 13 * 1.6,
	},
	heading1: {
		fontFamily: "DM Sans",
		fontSize: 18,
		fontWeight: "700",
		color: "#FFFFFF",
		marginTop: 8,
		marginBottom: 4,
	},
	heading2: {
		fontFamily: "DM Sans",
		fontSize: 16,
		fontWeight: "700",
		color: "#FFFFFF",
		marginTop: 6,
		marginBottom: 4,
	},
	heading3: {
		fontFamily: "DM Sans",
		fontSize: 14,
		fontWeight: "700",
		color: "#FFFFFF",
		marginTop: 4,
		marginBottom: 2,
	},
	strong: {
		fontWeight: "700",
	},
	em: {
		fontStyle: "italic",
	},
	link: {
		color: "#EA580C",
		textDecorationLine: "underline",
	},
	code_inline: {
		fontFamily: "JetBrains Mono",
		fontSize: 12,
		backgroundColor: "rgba(255,255,255,0.15)",
		borderRadius: 4,
		paddingHorizontal: 4,
		paddingVertical: 1,
	},
	fence: {
		fontFamily: "JetBrains Mono",
		fontSize: 12,
		color: "#FFFFFF",
		backgroundColor: "rgba(255,255,255,0.1)",
		borderRadius: 8,
		padding: 12,
		marginVertical: 6,
	},
	code_block: {
		fontFamily: "JetBrains Mono",
		fontSize: 12,
		color: "#FFFFFF",
		backgroundColor: "rgba(255,255,255,0.1)",
		borderRadius: 8,
		padding: 12,
		marginVertical: 6,
	},
	blockquote: {
		borderLeftWidth: 3,
		borderLeftColor: "rgba(255,255,255,0.3)",
		paddingLeft: 12,
		marginVertical: 4,
	},
	bullet_list: {
		marginVertical: 4,
	},
	ordered_list: {
		marginVertical: 4,
	},
	list_item: {
		flexDirection: "row",
		marginVertical: 2,
	},
	paragraph: {
		marginVertical: 2,
	},
	hr: {
		backgroundColor: "rgba(255,255,255,0.2)",
		height: 1,
		marginVertical: 8,
	},
	table: {
		borderColor: "rgba(255,255,255,0.2)",
	},
	tr: {
		borderBottomColor: "rgba(255,255,255,0.1)",
	},
	th: {
		fontWeight: "700",
		padding: 6,
	},
	td: {
		padding: 6,
	},
});

export const lightMarkdownStyles = StyleSheet.create({
	body: {
		fontFamily: "DM Sans",
		fontSize: 13,
		color: "#292524",
		lineHeight: 13 * 1.6,
	},
	heading1: {
		fontFamily: "DM Sans",
		fontSize: 18,
		fontWeight: "700",
		color: "#1C1917",
		marginTop: 8,
		marginBottom: 4,
	},
	heading2: {
		fontFamily: "DM Sans",
		fontSize: 16,
		fontWeight: "700",
		color: "#1C1917",
		marginTop: 6,
		marginBottom: 4,
	},
	heading3: {
		fontFamily: "DM Sans",
		fontSize: 14,
		fontWeight: "700",
		color: "#1C1917",
		marginTop: 4,
		marginBottom: 2,
	},
	strong: {
		fontWeight: "700",
	},
	em: {
		fontStyle: "italic",
	},
	link: {
		color: "#EA580C",
		textDecorationLine: "underline",
	},
	code_inline: {
		fontFamily: "JetBrains Mono",
		fontSize: 12,
		backgroundColor: "rgba(0,0,0,0.06)",
		borderRadius: 4,
		paddingHorizontal: 4,
		paddingVertical: 1,
	},
	fence: {
		fontFamily: "JetBrains Mono",
		fontSize: 12,
		color: "#FFFFFF",
		backgroundColor: "#292524",
		borderRadius: 8,
		padding: 12,
		marginVertical: 6,
	},
	code_block: {
		fontFamily: "JetBrains Mono",
		fontSize: 12,
		color: "#FFFFFF",
		backgroundColor: "#292524",
		borderRadius: 8,
		padding: 12,
		marginVertical: 6,
	},
	blockquote: {
		borderLeftWidth: 3,
		borderLeftColor: "#D6D3D1",
		paddingLeft: 12,
		marginVertical: 4,
	},
	bullet_list: {
		marginVertical: 4,
	},
	ordered_list: {
		marginVertical: 4,
	},
	list_item: {
		flexDirection: "row",
		marginVertical: 2,
	},
	paragraph: {
		marginVertical: 2,
	},
	hr: {
		backgroundColor: "#E7E5E4",
		height: 1,
		marginVertical: 8,
	},
	table: {
		borderColor: "#E7E5E4",
	},
	tr: {
		borderBottomColor: "#F1F1F1",
	},
	th: {
		fontWeight: "700",
		padding: 6,
	},
	td: {
		padding: 6,
	},
});
