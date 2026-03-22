import { Feather } from "@expo/vector-icons";
import React from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { trpc } from "@/src/lib/trpc";

interface Command {
	label: string;
	description: string;
	prompt: string;
	icon: keyof typeof Feather.glyphMap;
	isSkill?: boolean;
}

const BUILT_IN_COMMANDS: Command[] = [
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
	const { data: skills } = trpc.config.skills.useQuery(undefined, { enabled: visible });

	const skillCommands: Command[] = (skills ?? []).map((s) => ({
		label: s.name,
		description: s.description,
		prompt: `use ${s.name} `,
		icon: "zap" as keyof typeof Feather.glyphMap,
		isSkill: true,
	}));

	const allCommands = [...BUILT_IN_COMMANDS, ...skillCommands];

	return (
		<Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
			<Pressable className="flex-1" onPress={onClose} />
			<View
				className="bg-surface-elevated rounded-t-2xl"
				style={{ paddingBottom: insets.bottom || 24, maxHeight: "70%" }}
			>
				<View className="items-center py-3">
					<View className="w-10 h-1 rounded-full bg-border-default" />
				</View>
				<Text className="font-dm-sans text-xl font-bold text-ink-primary px-5 pb-1">
					Commands
				</Text>
				{skillCommands.length > 0 && (
					<Text className="font-dm-sans text-sm text-ink-tertiary px-5 pb-3">
						{skillCommands.length} skills installed
					</Text>
				)}
				<ScrollView showsVerticalScrollIndicator={false}>
					{skillCommands.length > 0 && (
						<Text className="font-dm-sans text-xs font-bold text-ink-tertiary uppercase tracking-widest px-5 pt-2 pb-1">
							Skills
						</Text>
					)}
					{skillCommands.map((cmd) => (
						<CommandRow key={cmd.label} cmd={cmd} onSelect={onSelect} onClose={onClose} />
					))}
					{skillCommands.length > 0 && (
						<Text className="font-dm-sans text-xs font-bold text-ink-tertiary uppercase tracking-widest px-5 pt-4 pb-1">
							Quick Actions
						</Text>
					)}
					{BUILT_IN_COMMANDS.map((cmd) => (
						<CommandRow key={cmd.label} cmd={cmd} onSelect={onSelect} onClose={onClose} />
					))}
				</ScrollView>
			</View>
		</Modal>
	);
}

function CommandRow({ cmd, onSelect, onClose }: { cmd: Command; onSelect: (s: string) => void; onClose: () => void }) {
	return (
		<Pressable
			onPress={() => {
				onSelect(cmd.prompt);
				onClose();
			}}
			className="px-5 py-2.5"
			style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
		>
			<View className="flex-row items-center gap-3">
				<View
					className="w-8 h-8 rounded-lg items-center justify-center"
					style={{ backgroundColor: cmd.isSkill ? "rgba(37, 99, 235, 0.1)" : "rgba(234, 88, 12, 0.1)" }}
				>
					<Feather name={cmd.icon} size={16} color={cmd.isSkill ? "#2563EB" : "#EA580C"} />
				</View>
				<View className="flex-1">
					<Text className="font-dm-sans text-md font-semibold text-ink-dark" numberOfLines={1}>
						{cmd.label}
					</Text>
					<Text className="font-dm-sans text-sm text-ink-secondary mt-0.5" numberOfLines={2}>
						{cmd.description}
					</Text>
				</View>
				<Feather name="chevron-right" size={16} color="#A8A29E" />
			</View>
		</Pressable>
	);
}
