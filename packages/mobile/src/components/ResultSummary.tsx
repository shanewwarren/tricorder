import { Feather } from "@expo/vector-icons";
import React from "react";
import { Text, View } from "react-native";
import Markdown from "react-native-markdown-display";
import { lightMarkdownStyles } from "@/src/lib/markdownStyles";

interface ResultSummaryProps {
	content: string;
	cost?: number;
}

export function ResultSummary({ content, cost }: ResultSummaryProps) {
	return (
		<View
			style={{
				backgroundColor: "#F1F1F1",
				borderRadius: 14,
				borderLeftWidth: 3,
				borderLeftColor: "#16A34A",
				padding: 16,
				gap: 8,
			}}
		>
			<View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
				<Feather name="check-circle" size={16} color="#16A34A" />
				<Text
					style={{
						fontFamily: "DM Sans",
						fontSize: 12,
						fontWeight: "600",
						color: "#16A34A",
					}}
				>
					Result
				</Text>
			</View>
			<Markdown style={lightMarkdownStyles}>{content}</Markdown>
			{cost != null && (
				<Text
					style={{
						fontFamily: "JetBrains Mono",
						fontSize: 11,
						color: "#78716C",
					}}
				>
					${cost.toFixed(4)}
				</Text>
			)}
		</View>
	);
}
