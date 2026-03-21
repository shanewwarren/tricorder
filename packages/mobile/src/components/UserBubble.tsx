import { Feather } from "@expo/vector-icons";
import React from "react";
import { Text, View } from "react-native";
import Markdown from "react-native-markdown-display";
import { lightMarkdownStyles } from "@/src/lib/markdownStyles";

interface UserBubbleProps {
	content: string;
}

export function UserBubble({ content }: UserBubbleProps) {
	return (
		<View
			style={{
				backgroundColor: "#F1F1F1",
				borderRadius: 14,
				padding: 16,
				gap: 8,
			}}
		>
			<View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
				<Feather name="user" size={16} color="#78716C" />
				<Text
					style={{
						fontFamily: "DM Sans",
						fontSize: 12,
						fontWeight: "600",
						color: "#78716C",
					}}
				>
					You
				</Text>
			</View>
			<Markdown style={lightMarkdownStyles}>{content}</Markdown>
		</View>
	);
}
