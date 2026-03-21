import { Feather } from "@expo/vector-icons";
import React from "react";
import { Text, View } from "react-native";
import Markdown from "react-native-markdown-display";
import { darkMarkdownStyles } from "@/src/lib/markdownStyles";

interface MessageBubbleProps {
	content: string;
}

export function MessageBubble({ content }: MessageBubbleProps) {
	return (
		<View
			style={{
				backgroundColor: "#292524",
				borderRadius: 14,
				padding: 16,
				gap: 8,
			}}
		>
			{/* Label row */}
			<View
				style={{
					flexDirection: "row",
					alignItems: "center",
					gap: 6,
				}}
			>
				<Feather name="star" size={14} color="#EA580C" />
				<Text
					style={{
						fontFamily: "DM Sans",
						fontSize: 12,
						fontWeight: "600",
						color: "rgba(255, 255, 255, 0.7)",
					}}
				>
					Claude
				</Text>
			</View>

			{/* Body */}
			<Markdown style={darkMarkdownStyles}>{content}</Markdown>
		</View>
	);
}
