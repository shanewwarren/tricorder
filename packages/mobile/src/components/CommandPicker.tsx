import { Feather } from "@expo/vector-icons";
import React from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface Command {
	label: string;
	description: string;
	prompt: string;
	icon: keyof typeof Feather.glyphMap;
}

const COMMANDS: Command[] = [
	{ label: "Plan", description: "Design an approach before coding", prompt: "Enter plan mode. Plan the implementation for: ", icon: "map" },
	{ label: "Review", description: "Review recent code changes", prompt: "Review the code changes I've made and provide feedback on quality, bugs, and improvements.", icon: "eye" },
	{ label: "Commit", description: "Commit staged changes", prompt: "Create a git commit for the staged changes with a descriptive commit message.", icon: "git-commit" },
	{ label: "Test", description: "Run tests and report results", prompt: "Run the test suite and report the results. Fix any failures.", icon: "check-circle" },
	{ label: "Explain", description: "Explain how something works", prompt: "Explain how this works: ", icon: "help-circle" },
	{ label: "Refactor", description: "Improve code quality", prompt: "Refactor the following for better readability and maintainability: ", icon: "tool" },
	{ label: "Debug", description: "Help fix a bug", prompt: "Help me debug this issue: ", icon: "alert-triangle" },
	{ label: "Status", description: "Show git and project status", prompt: "Show me the current git status, recent commits, and any uncommitted changes.", icon: "info" },
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
							key={cmd.label}
							onPress={() => {
								onSelect(cmd.prompt);
								onClose();
							}}
							className="px-5 py-3"
							style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
						>
							<View className="flex-row items-center gap-3">
								<View className="w-8 h-8 rounded-lg bg-surface-card items-center justify-center">
									<Feather name={cmd.icon} size={16} color="#EA580C" />
								</View>
								<View className="flex-1">
									<Text className="font-dm-sans text-md font-semibold text-ink-dark">
										{cmd.label}
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
