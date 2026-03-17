import React from "react";
import { Text, View } from "react-native";

interface ModeBadgeProps {
	mode: "autonomous" | "interactive";
}

export function ModeBadge({ mode }: ModeBadgeProps) {
	return (
		<View
			style={{
				backgroundColor: "#EA580C15",
				borderRadius: 6,
				paddingHorizontal: 8,
				paddingVertical: 3,
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
					color: "#EA580C",
				}}
			>
				{mode}
			</Text>
		</View>
	);
}
