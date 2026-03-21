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
		<View className="bg-card rounded-xl border-l-[3px] border-l-status-running p-4 gap-2">
			<View className="flex-row items-center gap-1.5">
				<Feather name="check-circle" size={16} color="#16A34A" />
				<Text className="font-dm-sans text-sm font-semibold text-status-running">
					Result
				</Text>
			</View>
			<Markdown style={lightMarkdownStyles}>{content}</Markdown>
			{cost != null && (
				<Text className="font-jetbrains text-xs text-secondary">
					${cost.toFixed(4)}
				</Text>
			)}
		</View>
	);
}
