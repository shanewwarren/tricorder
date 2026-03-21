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
		<View className="bg-surface-card rounded-xl p-4 gap-2" style={{ flexShrink: 1 }}>
			<View className="flex-row items-center gap-1.5">
				<Feather name="user" size={16} color="#78716C" />
				<Text className="font-dm-sans text-sm font-semibold text-ink-secondary">
					You
				</Text>
			</View>
			{content ? (
				<Markdown style={lightMarkdownStyles}>{content}</Markdown>
			) : (
				<Text className="font-dm-sans text-base text-ink-secondary italic">
					(empty message)
				</Text>
			)}
		</View>
	);
}
