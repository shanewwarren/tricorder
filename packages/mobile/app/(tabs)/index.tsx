import { SegmentControl } from "@/src/components/SegmentControl";
import { SessionCard } from "@/src/components/SessionCard";
import { UsageIndicator } from "@/src/components/UsageIndicator";
import { trpc } from "@/src/lib/trpc";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState, useMemo } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type SessionStatus = "running" | "waiting" | "paused" | "completed" | "error";

const SEGMENTS = ["All", "Active", "Done"];

const SEGMENT_STATUS_MAP: Record<string, SessionStatus[] | null> = {
	All: null,
	Active: ["running", "waiting"],
	Done: ["completed"],
};

export default function SessionsScreen() {
	const router = useRouter();
	const insets = useSafeAreaInsets();
	const [activeSegment, setActiveSegment] = useState(0);

	const { data: serverSessions, isLoading } = trpc.sessions.list.useQuery();
	const { data: usage } = trpc.usage.current.useQuery();
	const usagePercentage = usage?.available ? (usage.tiers[0]?.percentage ?? 0) : 0;

	const sessions = useMemo(() => {
		if (!serverSessions) return [];
		return serverSessions.map((s) => ({
			id: s.id,
			name: s.name,
			repoName: s.repoName,
			mode: s.mode as "autonomous" | "interactive",
			status: (s.status === "active" ? "running" : s.status === "cancelled" ? "completed" : s.status) as SessionStatus,
			lastActivity: s.lastActivity || s.lastError || "",
		}));
	}, [serverSessions]);

	const filteredSessions = useMemo(() => {
		const allowedStatuses = SEGMENT_STATUS_MAP[SEGMENTS[activeSegment]];
		if (!allowedStatuses) return sessions;
		return sessions.filter((s) => allowedStatuses.includes(s.status));
	}, [sessions, activeSegment]);

	return (
		<View
			className="flex-1 bg-surface-page"
			style={{ paddingTop: insets.top }}
		>
			{/* Header */}
			<View className="flex-row items-center px-[21px] pt-4 pb-3">
				<Text className="font-dm-sans text-4xl font-bold text-ink-primary flex-1">
					Sessions
				</Text>

				<UsageIndicator percentage={usagePercentage} />

				<Pressable className="ml-[10px] w-9 h-9 items-center justify-center">
					<Feather name="bell" size={20} color="#78716C" />
				</Pressable>

				<Pressable
					onPress={() => router.push("/new-session" as any)}
					className="ml-1.5 w-9 h-9 rounded-full bg-primary items-center justify-center"
				>
					<Feather name="plus" size={18} color="#FFFFFF" />
				</Pressable>
			</View>

			{/* Segment Control */}
			<View className="px-[21px] mb-4">
				<SegmentControl segments={SEGMENTS} activeIndex={activeSegment} onPress={setActiveSegment} />
			</View>

			{/* Session List */}
			<FlatList
				data={filteredSessions}
				keyExtractor={(item) => item.id}
				renderItem={({ item }) => <SessionCard session={item} />}
				contentContainerStyle={{
					paddingHorizontal: 21,
					paddingBottom: 100,
					gap: 12,
				}}
				showsVerticalScrollIndicator={false}
				ListEmptyComponent={
					<View className="pt-10 items-center">
						<Text className="font-dm-sans text-md text-ink-tertiary">
							{isLoading ? "Loading sessions..." : "No sessions yet"}
						</Text>
					</View>
				}
			/>
		</View>
	);
}
