import React from "react";
import { Text, View } from "react-native";

interface DiffViewProps {
	removed: string[];
	added: string[];
}

export function DiffView({ removed, added }: DiffViewProps) {
	return (
		<View
			style={{
				backgroundColor: "rgba(41, 37, 36, 0.06)",
				borderRadius: 6,
				padding: 8,
				gap: 4,
			}}
		>
			{removed.map((line, i) => (
				<Text
					key={`r-${i}`}
					style={{
						fontFamily: "JetBrains Mono",
						fontSize: 11,
						color: "#DC2626",
						lineHeight: 16,
					}}
				>
					- {line}
				</Text>
			))}
			{added.map((line, i) => (
				<Text
					key={`a-${i}`}
					style={{
						fontFamily: "JetBrains Mono",
						fontSize: 11,
						color: "#16A34A",
						lineHeight: 16,
					}}
				>
					+ {line}
				</Text>
			))}
		</View>
	);
}
