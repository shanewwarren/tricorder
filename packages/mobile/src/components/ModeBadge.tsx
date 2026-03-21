import React from "react";
import { Text, View } from "react-native";

interface ModeBadgeProps {
	mode: "autonomous" | "interactive";
}

export function ModeBadge({ mode }: ModeBadgeProps) {
	return (
		<View className="bg-primary/[0.08] rounded-sm px-2 py-[3px] items-center justify-center">
			<Text className="font-jetbrains text-2xs font-bold tracking-wide text-primary">
				{mode}
			</Text>
		</View>
	);
}
