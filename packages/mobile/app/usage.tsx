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
			className="flex-1 bg-surface-page"
			style={{ paddingTop: insets.top }}
		>
			<ScrollView
				contentContainerStyle={{
					paddingHorizontal: 21,
					paddingBottom: 40,
				}}
				showsVerticalScrollIndicator={false}
			>
				{/* Header */}
				<View className="flex-row items-center pt-4 pb-5 gap-3">
					<Pressable onPress={() => router.back()}>
						<Feather name="arrow-left" size={24} color="#1C1917" />
					</Pressable>
					<Text className="font-dm-sans text-3xl font-bold text-ink-primary">
						Usage
					</Text>
				</View>

				{/* Usage Cards */}
				{!usage?.available ? (
					<View className="pt-10 items-center">
						<Text className="font-dm-sans text-md text-ink-tertiary">
							{isLoading ? "Loading usage..." : "Usage data unavailable"}
						</Text>
					</View>
				) : (
					<View className="gap-4">
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
