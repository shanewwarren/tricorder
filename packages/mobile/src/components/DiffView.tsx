import React from "react";
import { Text, View } from "react-native";

interface DiffViewProps {
	removed: string[];
	added: string[];
	filePath?: string;
}

export function DiffView({ removed, added, filePath }: DiffViewProps) {
	const removedCount = removed.length;
	const addedCount = added.length;
	const totalLines = removedCount + addedCount;
	const lineNumWidth = Math.max(String(totalLines).length * 8 + 4, 24);

	return (
		<View className="bg-ink-dark/[0.06] rounded-sm overflow-hidden">
			{/* Header with file path and stats */}
			{(filePath || removedCount > 0 || addedCount > 0) && (
				<View className="flex-row items-center justify-between px-2 py-1.5 border-b border-ink-dark/10">
					{filePath ? (
						<Text
							className="font-jetbrains text-xs text-ink-secondary flex-1"
							numberOfLines={1}
						>
							{filePath}
						</Text>
					) : (
						<View />
					)}
					<View className="flex-row gap-2">
						{addedCount > 0 && (
							<Text className="font-jetbrains text-[10px] text-status-running">
								+{addedCount}
							</Text>
						)}
						{removedCount > 0 && (
							<Text className="font-jetbrains text-[10px] text-status-error">
								-{removedCount}
							</Text>
						)}
					</View>
				</View>
			)}

			{/* Diff lines */}
			<View className="p-2 gap-1">
				{removed.map((line, i) => (
					<View key={`r-${i}`} className="flex-row">
						<Text
							className="font-jetbrains text-[10px] text-ink-secondary/50 leading-4 text-right"
							style={{ width: lineNumWidth }}
						>
							{i + 1}
						</Text>
						<Text className="font-jetbrains text-xs text-status-error leading-4 flex-1 ml-1.5">
							- {line}
						</Text>
					</View>
				))}
				{added.map((line, i) => (
					<View key={`a-${i}`} className="flex-row">
						<Text
							className="font-jetbrains text-[10px] text-ink-secondary/50 leading-4 text-right"
							style={{ width: lineNumWidth }}
						>
							{removedCount + i + 1}
						</Text>
						<Text className="font-jetbrains text-xs text-status-running leading-4 flex-1 ml-1.5">
							+ {line}
						</Text>
					</View>
				))}
			</View>
		</View>
	);
}
