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
			className="absolute bottom-0 left-0 right-0 px-[21px] pt-3"
			style={{
				paddingBottom: Math.max(insets.bottom, 21),
			}}
			pointerEvents="box-none"
		>
			<View className="h-[62px] rounded-full bg-bg-elevated border border-border-subtle flex-row gap-1 p-1">
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
							className="flex-1 items-center justify-center rounded-full gap-1"
							style={{
								backgroundColor: isActive ? "#EA580C" : "transparent",
							}}
						>
							<Feather name={config.icon} size={18} color={isActive ? "#FFFFFF" : "#A8A29E"} />
							<Text
								className="font-dm-sans text-2xs uppercase tracking-[0.5px]"
								style={{
									fontWeight: isActive ? "600" : "500",
									color: isActive ? "#FFFFFF" : "#A8A29E",
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
