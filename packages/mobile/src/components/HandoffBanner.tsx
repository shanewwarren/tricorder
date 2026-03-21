import { Feather } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import React, { useState } from "react";
import { Pressable, Text, View } from "react-native";

interface HandoffBannerProps {
	command: string;
}

export function HandoffBanner({ command }: HandoffBannerProps) {
	const [copied, setCopied] = useState(false);

	const handleCopy = async () => {
		await Clipboard.setStringAsync(command);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};

	return (
		<View className="gap-2 px-4 py-3">
			{/* Label */}
			<Text className="font-dm-sans text-2xs font-bold tracking-widest text-tertiary uppercase text-center">
				Continue on your machine
			</Text>

			{/* Code block */}
			<View className="bg-card rounded py-2.5 px-3.5 flex-row items-center">
				<Text
					className="font-jetbrains text-base text-ink-dark flex-1"
					numberOfLines={1}
				>
					{command}
				</Text>
				<Pressable onPress={handleCopy} hitSlop={8}>
					<Feather name={copied ? "check" : "clipboard"} size={16} color={copied ? "#16A34A" : "#78716C"} />
				</Pressable>
			</View>
		</View>
	);
}
