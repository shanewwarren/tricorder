import { Feather } from "@expo/vector-icons";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import React from "react";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const TAB_CONFIG: {
	icon: keyof typeof Feather.glyphMap;
	label: string;
}[] = [
	{ icon: "home", label: "HOME" },
	{ icon: "activity", label: "ACTIVITY" },
	{ icon: "compass", label: "REPOS" },
	{ icon: "user", label: "SETTINGS" },
];

export function PillTabBar({ state, navigation }: BottomTabBarProps) {
	const insets = useSafeAreaInsets();

	return (
		<View
			style={{
				position: "absolute",
				bottom: 0,
				left: 0,
				right: 0,
				paddingBottom: Math.max(insets.bottom, 21),
				paddingHorizontal: 21,
				paddingTop: 12,
			}}
			pointerEvents="box-none"
		>
			<View
				style={{
					height: 62,
					borderRadius: 36,
					backgroundColor: "#FFFFFF",
					borderWidth: 1,
					borderColor: "#E7E5E4",
					flexDirection: "row",
					gap: 4,
					padding: 4,
				}}
			>
				{state.routes.map((route, index) => {
					const isActive = state.index === index;
					const config = TAB_CONFIG[index];
					if (!config) return null;

					return (
						<Pressable
							key={route.key}
							onPress={() => {
								const event = navigation.emit({
									type: "tabPress",
									target: route.key,
									canPreventDefault: true,
								});
								if (!event.defaultPrevented) {
									navigation.navigate(route.name);
								}
							}}
							style={{
								flex: 1,
								alignItems: "center",
								justifyContent: "center",
								borderRadius: 26,
								backgroundColor: isActive ? "#EA580C" : "transparent",
								gap: 4,
							}}
						>
							<Feather name={config.icon} size={18} color={isActive ? "#FFFFFF" : "#A8A29E"} />
							<Text
								style={{
									fontFamily: "DM Sans",
									fontSize: 10,
									fontWeight: isActive ? "600" : "500",
									letterSpacing: 0.5,
									color: isActive ? "#FFFFFF" : "#A8A29E",
									textTransform: "uppercase",
								}}
							>
								{config.label}
							</Text>
						</Pressable>
					);
				})}
			</View>
		</View>
	);
}
