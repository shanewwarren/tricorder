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
		<View style={{ gap: 8, paddingHorizontal: 16, paddingVertical: 12 }}>
			{/* Label */}
			<Text
				style={{
					fontFamily: "DM Sans",
					fontSize: 10,
					fontWeight: "700",
					letterSpacing: 1,
					color: "#A8A29E",
					textTransform: "uppercase",
					textAlign: "center",
				}}
			>
				Continue on your machine
			</Text>

			{/* Code block */}
			<View
				style={{
					backgroundColor: "#F1F1F1",
					borderRadius: 8,
					paddingVertical: 10,
					paddingHorizontal: 14,
					flexDirection: "row",
					alignItems: "center",
				}}
			>
				<Text
					style={{
						fontFamily: "JetBrains Mono",
						fontSize: 13,
						color: "#292524",
						flex: 1,
					}}
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
