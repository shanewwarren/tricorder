import { PillTabBar } from "@/src/components/PillTabBar";
import { Tabs } from "expo-router";
import React from "react";

export default function TabLayout() {
	return (
		<Tabs
			tabBar={(props) => <PillTabBar {...props} />}
			screenOptions={{
				headerShown: false,
			}}
		>
			<Tabs.Screen name="index" options={{ title: "Home" }} />
			<Tabs.Screen name="activity" options={{ title: "Activity" }} />
			<Tabs.Screen name="repos" options={{ title: "Repos" }} />
			<Tabs.Screen name="settings" options={{ title: "Settings" }} />
		</Tabs>
	);
}
