import { UsageCard } from "@/src/components/UsageCard";
import { trpc } from "@/src/lib/trpc";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function UsageScreen() {
	const router = useRouter();
	const insets = useSafeAreaInsets();
	const { data: usage, isLoading } = trpc.usage.current.useQuery();

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
				{!usage?.available ? (
					<View style={{ paddingTop: 40, alignItems: "center" }}>
						<Text style={{ fontFamily: "DM Sans", fontSize: 14, color: "#A8A29E" }}>
							{isLoading ? "Loading usage..." : "Usage data unavailable"}
						</Text>
					</View>
				) : (
					<View style={{ gap: 16 }}>
						{usage.tiers.map((tier) => (
							<UsageCard
								key={tier.label}
								label={tier.label}
								subtitle={tier.subtitle}
								percentage={tier.dollarAmount == null ? tier.percentage : undefined}
								resetIn={tier.resetIn ?? undefined}
								dollarAmount={tier.dollarAmount ?? undefined}
								dollarLimit={tier.dollarLimit ?? undefined}
							/>
						))}
					</View>
				)}
			</ScrollView>
		</View>
	);
}
