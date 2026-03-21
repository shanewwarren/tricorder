import { Feather } from "@expo/vector-icons";
import React from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface Command {
	name: string;
	description: string;
	hasArgs?: boolean;
}

const COMMANDS: Command[] = [
	{ name: "plan", description: "Enter plan mode to design before coding" },
	{ name: "review", description: "Review code changes" },
	{ name: "commit", description: "Commit staged changes" },
	{ name: "mcp", description: "Manage MCP server connections" },
	{ name: "help", description: "Show available commands" },
	{ name: "clear", description: "Clear conversation history" },
	{ name: "compact", description: "Compact conversation to save context" },
	{ name: "model", description: "Switch the AI model", hasArgs: true },
	{ name: "fast", description: "Toggle fast mode" },
];

interface CommandPickerProps {
	visible: boolean;
	onClose: () => void;
	onSelect: (command: string) => void;
}

export function CommandPicker({ visible, onClose, onSelect }: CommandPickerProps) {
	const insets = useSafeAreaInsets();

	return (
		<Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
			<Pressable className="flex-1" onPress={onClose} />
			<View
				className="bg-surface-elevated rounded-t-2xl"
				style={{ paddingBottom: insets.bottom || 24, maxHeight: "60%" }}
			>
				<View className="items-center py-3">
					<View className="w-10 h-1 rounded-full bg-border-default" />
				</View>
				<Text className="font-dm-sans text-xl font-bold text-ink-primary px-5 pb-3">
					Commands
				</Text>
				<ScrollView showsVerticalScrollIndicator={false}>
					{COMMANDS.map((cmd) => (
						<Pressable
							key={cmd.name}
							onPress={() => {
								onSelect(`/${cmd.name}`);
								onClose();
							}}
							className="px-5 py-3"
							style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
						>
							<View className="flex-row items-center gap-3">
								<View className="w-8 h-8 rounded-lg bg-surface-card items-center justify-center">
									<Text className="font-jetbrains text-sm text-primary">/</Text>
								</View>
								<View className="flex-1">
									<Text className="font-dm-sans text-md font-semibold text-ink-dark">
										/{cmd.name}
									</Text>
									<Text className="font-dm-sans text-sm text-ink-secondary mt-0.5">
										{cmd.description}
									</Text>
								</View>
								<Feather name="chevron-right" size={16} color="#A8A29E" />
							</View>
						</Pressable>
					))}
				</ScrollView>
			</View>
		</Modal>
	);
}
