import { useRouter } from "expo-router";
import React from "react";
import { Pressable, Text, View } from "react-native";

interface UsageIndicatorProps {
	percentage: number;
}

function getDotColor(percentage: number): string {
	if (percentage < 60) return "#16A34A";
	if (percentage <= 85) return "#D97706";
	return "#DC2626";
}

export function UsageIndicator({ percentage }: UsageIndicatorProps) {
	const router = useRouter();
	const dotColor = getDotColor(percentage);

	return (
		<Pressable
			onPress={() => router.push("/usage" as any)}
			className="bg-card rounded-xl px-2.5 py-1.5 flex-row items-center gap-1.5"
		>
			<View
				className="w-2 h-2 rounded-full"
				style={{ backgroundColor: dotColor }}
			/>
			<Text className="font-jetbrains text-sm font-bold text-ink-dark">
				{percentage}%
			</Text>
		</Pressable>
	);
}
