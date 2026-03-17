import React from "react";
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function ReposScreen() {
	const insets = useSafeAreaInsets();

	return (
		<View
			style={{
				flex: 1,
				backgroundColor: "#FAFAF9",
				paddingTop: insets.top,
				alignItems: "center",
				justifyContent: "center",
			}}
		>
			<Text
				style={{
					fontFamily: "DM Sans",
					fontSize: 24,
					fontWeight: "600",
					color: "#1C1917",
				}}
			>
				Repos
			</Text>
			<Text
				style={{
					fontFamily: "DM Sans",
					fontSize: 14,
					color: "#78716C",
					marginTop: 8,
				}}
			>
				Coming soon
			</Text>
		</View>
	);
}
