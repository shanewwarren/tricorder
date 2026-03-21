import { Feather } from "@expo/vector-icons";
import React, { useState } from "react";
import { Pressable, Text, View } from "react-native";
import Markdown from "react-native-markdown-display";
import { lightMarkdownStyles } from "@/src/lib/markdownStyles";

interface PlanCardProps {
	content: string;
	title?: string;
}

export function PlanCard({ content, title }: PlanCardProps) {
	const [expanded, setExpanded] = useState(false);

	return (
		<View
			className="bg-surface-elevated rounded-xl p-4"
			style={{
				borderLeftWidth: 3,
				borderLeftColor: "#2563EB",
				gap: 8,
			}}
		>
			<Pressable
				className="flex-row items-center gap-2"
				onPress={() => setExpanded((prev) => !prev)}
			>
				<Feather name="file-text" size={16} color="#2563EB" />
				<Text className="font-dm-sans text-xs font-semibold flex-1" style={{ color: "#2563EB" }}>
					{title ?? "Plan"}
				</Text>
				<Feather
					name={expanded ? "chevron-up" : "chevron-down"}
					size={14}
					color="#2563EB"
				/>
			</Pressable>

			{expanded && (
				<Markdown style={lightMarkdownStyles}>{content}</Markdown>
			)}
		</View>
	);
}
