import { Feather } from "@expo/vector-icons";
import React, { useState } from "react";
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
	result?: { status: "success" | "error"; output: string };
}

export function ToolCard({ type, title, detail, diff, result }: ToolCardProps) {
	const icon = TOOL_ICONS[type];
	const isCompact = type === "Read" || type === "Grep";
	const [expanded, setExpanded] = useState(false);
	const outputLineCount = result?.output.split("\n").length ?? 0;
	const showToggle = outputLineCount >= 5;

	return (
		<View
			className="bg-surface-card rounded-md p-[14px]"
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
			{type === "Edit" && diff && (
				<DiffView
					removed={diff.removed}
					added={diff.added}
					filePath={type === "Edit" ? detail : undefined}
				/>
			)}

			{/* Result section */}
			{result && (
				<View>
					<View
						className="rounded-sm p-2 flex-row items-start gap-[6px]"
						style={{
							backgroundColor: result.status === "success" ? "rgba(22, 163, 74, 0.08)" : "rgba(220, 38, 38, 0.08)",
						}}
					>
						<Feather name={result.status === "success" ? "check" : "x"} size={14} color={result.status === "success" ? "#16A34A" : "#DC2626"} />
						<Text
							className="font-jetbrains text-xs flex-1"
							style={{
								color: result.status === "success" ? "#16A34A" : "#DC2626",
							}}
							numberOfLines={expanded ? undefined : 5}
						>
							{result.output}
						</Text>
					</View>
					{showToggle && (
						<Pressable onPress={() => setExpanded((v) => !v)} className="pt-1 px-2">
							<Text className="font-dm-sans text-xs text-ink-secondary">
								{expanded ? "Show less" : "Show more"}
							</Text>
						</Pressable>
					)}
				</View>
			)}
		</View>
	);
}
