import { Feather } from "@expo/vector-icons";
import React from "react";
import { Text, View } from "react-native";
import Markdown from "react-native-markdown-display";
import { darkMarkdownStyles } from "@/src/lib/markdownStyles";

interface MessageBubbleProps {
	content: string;
	usage?: { inputTokens?: number; outputTokens?: number; cost?: number };
}

function formatTokenCount(n: number): string {
	if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
	return String(n);
}

export function MessageBubble({ content, usage }: MessageBubbleProps) {
	const usageLabel = usage
		? [
			usage.inputTokens != null && `${formatTokenCount(usage.inputTokens)} in`,
			usage.outputTokens != null && `${formatTokenCount(usage.outputTokens)} out`,
		]
			.filter(Boolean)
			.join(" \u00B7 ")
		: null;
	const costLabel = usage?.cost != null ? `$${usage.cost.toFixed(4)}` : null;

	return (
		<View className="bg-ink-dark rounded-xl p-4 gap-2" style={{ flexShrink: 1 }}>
			{/* Label row */}
			<View className="flex-row items-center gap-1.5">
				<Feather name="star" size={14} color="#EA580C" />
				<Text className="font-dm-sans text-sm font-semibold text-white/70">
					Claude
				</Text>
			</View>

			{/* Body */}
			{content ? (
				<Markdown style={darkMarkdownStyles}>{content}</Markdown>
			) : (
				<Text className="font-dm-sans text-base text-white/50 italic">
					(empty response)
				</Text>
			)}

			{/* Usage footer */}
			{(usageLabel || costLabel) && (
				<View className="flex-row justify-end mt-1">
					<Text className="font-jetbrains text-2xs text-white/40">
						{[usageLabel, costLabel].filter(Boolean).join(" \u00B7 ")}
					</Text>
				</View>
			)}
		</View>
	);
}
