import React from "react";
import { Text, View } from "react-native";

interface DiffViewProps {
	removed: string[];
	added: string[];
}

export function DiffView({ removed, added }: DiffViewProps) {
	return (
		<View className="bg-text-dark/[0.06] rounded-sm p-2 gap-1">
			{removed.map((line, i) => (
				<Text
					key={`r-${i}`}
					className="font-jetbrains text-xs text-status-error leading-4"
				>
					- {line}
				</Text>
			))}
			{added.map((line, i) => (
				<Text
					key={`a-${i}`}
					className="font-jetbrains text-xs text-status-running leading-4"
				>
					+ {line}
				</Text>
			))}
		</View>
	);
}
