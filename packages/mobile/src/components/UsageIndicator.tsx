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
			style={{
				backgroundColor: "#F1F1F1",
				borderRadius: 14,
				paddingHorizontal: 10,
				paddingVertical: 6,
				flexDirection: "row",
				alignItems: "center",
				gap: 6,
			}}
		>
			<View
				style={{
					width: 8,
					height: 8,
					borderRadius: 4,
					backgroundColor: dotColor,
				}}
			/>
			<Text
				style={{
					fontFamily: "JetBrains Mono",
					fontSize: 12,
					fontWeight: "700",
					color: "#292524",
				}}
			>
				{percentage}%
			</Text>
		</Pressable>
	);
}
