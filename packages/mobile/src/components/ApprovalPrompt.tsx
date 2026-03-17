import { Feather } from "@expo/vector-icons";
import React from "react";
import { Pressable, Text, View } from "react-native";

interface ApprovalPromptProps {
	action: string;
	onApprove: () => void;
	onDeny: () => void;
}

export function ApprovalPrompt({ action, onApprove, onDeny }: ApprovalPromptProps) {
	return (
		<View
			style={{
				backgroundColor: "#FFFFFF",
				borderRadius: 10,
				borderWidth: 1.5,
				borderColor: "#EA580C",
				padding: 14,
				gap: 10,
			}}
		>
			{/* Header */}
			<View
				style={{
					flexDirection: "row",
					alignItems: "center",
					gap: 8,
				}}
			>
				<Feather name="shield" size={16} color="#EA580C" />
				<Text
					style={{
						fontFamily: "DM Sans",
						fontSize: 13,
						fontWeight: "600",
						color: "#292524",
					}}
				>
					Claude wants to:
				</Text>
			</View>

			{/* Action description */}
			<Text
				style={{
					fontFamily: "JetBrains Mono",
					fontSize: 12,
					color: "#78716C",
					lineHeight: 18,
				}}
			>
				{action}
			</Text>

			{/* Buttons row */}
			<View
				style={{
					flexDirection: "row",
					gap: 10,
				}}
			>
				<Pressable
					onPress={onApprove}
					style={({ pressed }) => ({
						flex: 1,
						height: 36,
						backgroundColor: pressed ? "#0F9380" : "#14B8A6",
						borderRadius: 8,
						flexDirection: "row",
						alignItems: "center",
						justifyContent: "center",
						gap: 6,
					})}
				>
					<Feather name="check" size={16} color="#FFFFFF" />
					<Text
						style={{
							fontFamily: "DM Sans",
							fontSize: 13,
							fontWeight: "600",
							color: "#FFFFFF",
						}}
					>
						Approve
					</Text>
				</Pressable>

				<Pressable
					onPress={onDeny}
					style={({ pressed }) => ({
						flex: 1,
						height: 36,
						backgroundColor: pressed ? "rgba(220, 38, 38, 0.2)" : "rgba(220, 38, 38, 0.12)",
						borderRadius: 8,
						flexDirection: "row",
						alignItems: "center",
						justifyContent: "center",
						gap: 6,
					})}
				>
					<Feather name="x" size={16} color="#DC2626" />
					<Text
						style={{
							fontFamily: "DM Sans",
							fontSize: 13,
							fontWeight: "600",
							color: "#DC2626",
						}}
					>
						Deny
					</Text>
				</Pressable>
			</View>
		</View>
	);
}
