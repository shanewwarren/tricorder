import { UsageCard } from "@/src/components/UsageCard";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// TODO: Replace mock data with tRPC query
// const { data: usage } = trpc.usage.current.useQuery();

export default function UsageScreen() {
	const router = useRouter();
	const insets = useSafeAreaInsets();

	return (
		<View
			style={{
				flex: 1,
				backgroundColor: "#FAFAF9",
				paddingTop: insets.top,
			}}
		>
			<ScrollView
				contentContainerStyle={{
					paddingHorizontal: 21,
					paddingBottom: 40,
				}}
				showsVerticalScrollIndicator={false}
			>
				{/* Header */}
				<View
					style={{
						flexDirection: "row",
						alignItems: "center",
						paddingTop: 16,
						paddingBottom: 20,
						gap: 12,
					}}
				>
					<Pressable onPress={() => router.back()}>
						<Feather name="arrow-left" size={24} color="#1C1917" />
					</Pressable>
					<Text
						style={{
							fontFamily: "DM Sans",
							fontSize: 28,
							fontWeight: "700",
							color: "#1C1917",
						}}
					>
						Usage
					</Text>
				</View>

				{/* Usage Cards */}
				<View style={{ gap: 16 }}>
					<UsageCard label="Session" subtitle="5-hour window" percentage={3} resetIn="4h 32m" />
					<UsageCard label="Weekly" subtitle="7-day window" percentage={12} resetIn="4d 2h" />
					<UsageCard label="Sonnet Only" subtitle="Model-specific" percentage={67} resetIn="4d 2h" />
					<UsageCard label="Overage" subtitle="Extra usage this month" dollarAmount={9.57} dollarLimit={50} />
				</View>
			</ScrollView>
		</View>
	);
}
