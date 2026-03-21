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
		<View className="bg-surface-elevated rounded-md border-[1.5px] border-primary p-[14px] gap-[10px]">
			{/* Header */}
			<View className="flex-row items-center gap-2">
				<Feather name="shield" size={16} color="#EA580C" />
				<Text className="font-dm-sans text-base font-semibold text-ink-dark">
					Claude wants to:
				</Text>
			</View>

			{/* Action description */}
			<Text className="font-jetbrains text-sm text-ink-secondary leading-[18px]">
				{action}
			</Text>

			{/* Buttons row */}
			<View className="flex-row gap-[10px]">
				<Pressable
					onPress={onApprove}
					className="flex-1 h-9 rounded flex-row items-center justify-center gap-[6px]"
					style={({ pressed }) => ({
						backgroundColor: pressed ? "#0F9380" : "#14B8A6",
					})}
				>
					<Feather name="check" size={16} color="#FFFFFF" />
					<Text className="font-dm-sans text-base font-semibold text-white">
						Approve
					</Text>
				</Pressable>

				<Pressable
					onPress={onDeny}
					className="flex-1 h-9 rounded flex-row items-center justify-center gap-[6px]"
					style={({ pressed }) => ({
						backgroundColor: pressed ? "rgba(220, 38, 38, 0.2)" : "rgba(220, 38, 38, 0.12)",
					})}
				>
					<Feather name="x" size={16} color="#DC2626" />
					<Text className="font-dm-sans text-base font-semibold text-status-error">
						Deny
					</Text>
				</Pressable>
			</View>
		</View>
	);
}
