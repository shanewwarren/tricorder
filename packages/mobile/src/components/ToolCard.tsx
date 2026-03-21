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
			className="bg-bg-surface-card rounded-md p-[14px]"
			style={{ gap: isCompact ? 0 : 10 }}
		>
			{/* Header row */}
			<Pressable className="flex-row items-center gap-2">
				<Feather name={icon} size={16} color="#78716C" />
				<Text className="font-dm-sans text-sm font-semibold text-ink-dark">
					{title}
				</Text>
				<Text
					className="font-jetbrains text-xs text-ink-secondary flex-1"
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
					className="rounded-sm p-2 flex-row items-center gap-[6px]"
					style={{
						backgroundColor: result.success ? "rgba(22, 163, 74, 0.08)" : "rgba(220, 38, 38, 0.08)",
					}}
				>
					<Feather name={result.success ? "check" : "x"} size={14} color={result.success ? "#16A34A" : "#DC2626"} />
					<Text
						className="font-jetbrains text-xs flex-1"
						style={{
							color: result.success ? "#16A34A" : "#DC2626",
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
