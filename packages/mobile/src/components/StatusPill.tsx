import React from "react";
import { Text, View } from "react-native";

const STATUS_COLORS = {
	running: "#16A34A",
	waiting: "#D97706",
	paused: "#EA580C",
	completed: "#78716C",
	local: "#2563EB",
	error: "#DC2626",
} as const;

type Status = keyof typeof STATUS_COLORS;

interface StatusPillProps {
	status: Status;
}

export function StatusPill({ status }: StatusPillProps) {
	const color = STATUS_COLORS[status];

	return (
		<View
			style={{
				backgroundColor: `${color}20`,
				borderRadius: 6,
				paddingHorizontal: 8,
				paddingVertical: 4,
				alignItems: "center",
				justifyContent: "center",
			}}
		>
			<Text
				style={{
					fontFamily: "JetBrains Mono",
					fontSize: 10,
					fontWeight: "700",
					letterSpacing: 0.5,
					color,
					textTransform: "uppercase",
				}}
			>
				{status}
			</Text>
		</View>
	);
}
