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
		<View className="bg-text-dark rounded-xl p-4 gap-2">
			{/* Label row */}
			<View className="flex-row items-center gap-1.5">
				<Feather name="star" size={14} color="#EA580C" />
				<Text className="font-dm-sans text-sm font-semibold text-white/70">
					Claude
				</Text>
			</View>

			{/* Body */}
			<Markdown style={darkMarkdownStyles}>{content}</Markdown>
		</View>
	);
}
