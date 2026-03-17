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
		<View
			style={{
				backgroundColor: "#F1F1F1",
				borderRadius: 16,
				padding: 16,
			}}
		>
			{/* Header */}
			<View
				style={{
					flexDirection: "row",
					justifyContent: "space-between",
					alignItems: "center",
					marginBottom: 8,
				}}
			>
				<Text
					style={{
						fontFamily: "DM Sans",
						fontSize: 16,
						fontWeight: "600",
						color: "#1C1917",
					}}
				>
					{label}
				</Text>
				<Text
					style={{
						fontFamily: "JetBrains Mono",
						fontSize: 12,
						color: "#78716C",
					}}
				>
					{subtitle}
				</Text>
			</View>

			{/* Big number */}
			{isDollar ? (
				<View style={{ flexDirection: "row", alignItems: "baseline", marginBottom: 10 }}>
					<Text
						style={{
							fontFamily: "DM Sans",
							fontSize: 28,
							fontWeight: "700",
							color: color,
						}}
					>
						${dollarAmount.toFixed(2)}
					</Text>
					<Text
						style={{
							fontFamily: "DM Sans",
							fontSize: 14,
							color: "#78716C",
							marginLeft: 4,
						}}
					>
						of ${dollarLimit} limit
					</Text>
				</View>
			) : (
				<Text
					style={{
						fontFamily: "DM Sans",
						fontSize: 28,
						fontWeight: "700",
						color: color,
						marginBottom: 10,
					}}
				>
					{percentage}%
				</Text>
			)}

			{/* Progress bar */}
			<View
				style={{
					height: 4,
					borderRadius: 2,
					backgroundColor: "#E7E5E4",
					marginBottom: 10,
				}}
			>
				<View
					style={{
						height: 4,
						borderRadius: 2,
						backgroundColor: color,
						width: `${Math.min(displayPercentage, 100)}%`,
					}}
				/>
			</View>

			{/* Footer */}
			{resetIn ? (
				<View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
					<Feather name="clock" size={12} color="#78716C" />
					<Text
						style={{
							fontFamily: "JetBrains Mono",
							fontSize: 12,
							color: "#78716C",
						}}
					>
						Resets in {resetIn}
					</Text>
				</View>
			) : isDollar && dollarLimit ? (
				<Text
					style={{
						fontFamily: "JetBrains Mono",
						fontSize: 12,
						color: "#78716C",
					}}
				>
					${(dollarLimit - (dollarAmount ?? 0)).toFixed(2)} remaining
				</Text>
			) : null}
		</View>
	);
}
