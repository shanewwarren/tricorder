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
			className="rounded-sm px-2 py-1 items-center justify-center"
			style={{ backgroundColor: `${color}20` }}
		>
			<Text
				className="font-jetbrains text-2xs font-bold uppercase tracking-wide"
				style={{ color }}
			>
				{status}
			</Text>
		</View>
	);
}
