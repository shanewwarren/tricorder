import { Feather } from "@expo/vector-icons";
import React from "react";
import { Pressable, Text, View } from "react-native";
import { DiffView } from "./DiffView";

type ToolType = "Read" | "Edit" | "Bash" | "Grep";

const TOOL_ICONS: Record<ToolType, keyof typeof Feather.glyphMap> = {
	Read: "file-text",
	Edit: "edit-2",
	Bash: "terminal",
	Grep: "search",
};

interface ToolCardProps {
	type: ToolType;
	title: string;
	detail: string;
	diff?: { removed: string[]; added: string[] };
	result?: { success: boolean; output: string };
}

export function ToolCard({ type, title, detail, diff, result }: ToolCardProps) {
	const icon = TOOL_ICONS[type];
	const isCompact = type === "Read" || type === "Grep";

	return (
		<View
			style={{
				backgroundColor: "#F1F1F1",
				borderRadius: 10,
				padding: 14,
				gap: isCompact ? 0 : 10,
			}}
		>
			{/* Header row */}
			<Pressable
				style={{
					flexDirection: "row",
					alignItems: "center",
					gap: 8,
				}}
			>
				<Feather name={icon} size={16} color="#78716C" />
				<Text
					style={{
						fontFamily: "DM Sans",
						fontSize: 12,
						fontWeight: "600",
						color: "#292524",
					}}
				>
					{title}
				</Text>
				<Text
					style={{
						fontFamily: "JetBrains Mono",
						fontSize: 11,
						color: "#78716C",
						flex: 1,
					}}
					numberOfLines={1}
				>
					{detail}
				</Text>
				{isCompact && <Feather name="chevron-right" size={14} color="#A8A29E" />}
			</Pressable>

			{/* Diff section for Edit */}
			{type === "Edit" && diff && <DiffView removed={diff.removed} added={diff.added} />}

			{/* Result section for Bash */}
			{type === "Bash" && result && (
				<View
					style={{
						backgroundColor: result.success ? "rgba(22, 163, 74, 0.08)" : "rgba(220, 38, 38, 0.08)",
						borderRadius: 6,
						padding: 8,
						flexDirection: "row",
						alignItems: "center",
						gap: 6,
					}}
				>
					<Feather name={result.success ? "check" : "x"} size={14} color={result.success ? "#16A34A" : "#DC2626"} />
					<Text
						style={{
							fontFamily: "JetBrains Mono",
							fontSize: 11,
							color: result.success ? "#16A34A" : "#DC2626",
							flex: 1,
						}}
						numberOfLines={3}
					>
						{result.output}
					</Text>
				</View>
			)}
		</View>
	);
}
