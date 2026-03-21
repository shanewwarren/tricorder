import { Feather } from "@expo/vector-icons";
import React from "react";
import { Text, View } from "react-native";

interface UsageCardProps {
	label: string;
	subtitle: string;
	percentage?: number;
	resetIn?: string;
	dollarAmount?: number;
	dollarLimit?: number;
}

function getColor(percentage: number): string {
	if (percentage < 60) return "#16A34A";
	if (percentage <= 85) return "#D97706";
	return "#DC2626";
}

export function UsageCard({ label, subtitle, percentage, resetIn, dollarAmount, dollarLimit }: UsageCardProps) {
	const isDollar = dollarAmount !== undefined;
	const displayPercentage = isDollar && dollarLimit ? (dollarAmount / dollarLimit) * 100 : (percentage ?? 0);
	const color = getColor(displayPercentage);

	return (
		<View className="bg-surface-card rounded-2xl p-4">
			{/* Header */}
			<View className="flex-row justify-between items-center mb-2">
				<Text className="font-dm-sans text-xl font-semibold text-ink-primary">
					{label}
				</Text>
				<Text className="font-jetbrains text-sm text-ink-secondary">
					{subtitle}
				</Text>
			</View>

			{/* Big number */}
			{isDollar ? (
				<View className="flex-row items-baseline mb-[10px]">
					<Text
						className="font-dm-sans text-3xl font-bold"
						style={{ color }}
					>
						${dollarAmount.toFixed(2)}
					</Text>
					<Text className="font-dm-sans text-md text-ink-secondary ml-1">
						of ${dollarLimit} limit
					</Text>
				</View>
			) : (
				<Text
					className="font-dm-sans text-3xl font-bold mb-[10px]"
					style={{ color }}
				>
					{percentage}%
				</Text>
			)}

			{/* Progress bar */}
			<View className="h-1 rounded-full bg-border-subtle mb-[10px]">
				<View
					className="h-1 rounded-full"
					style={{
						backgroundColor: color,
						width: `${Math.min(displayPercentage, 100)}%`,
					}}
				/>
			</View>

			{/* Footer */}
			{resetIn ? (
				<View className="flex-row items-center gap-1">
					<Feather name="clock" size={12} color="#78716C" />
					<Text className="font-jetbrains text-sm text-ink-secondary">
						Resets in {resetIn}
					</Text>
				</View>
			) : isDollar && dollarLimit ? (
				<Text className="font-jetbrains text-sm text-ink-secondary">
					${(dollarLimit - (dollarAmount ?? 0)).toFixed(2)} remaining
				</Text>
			) : null}
		</View>
	);
}
