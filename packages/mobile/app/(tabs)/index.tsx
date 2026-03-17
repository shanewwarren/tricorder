import { SegmentControl } from "@/src/components/SegmentControl";
import { SessionCard } from "@/src/components/SessionCard";
import { UsageIndicator } from "@/src/components/UsageIndicator";
import { trpc } from "@/src/lib/trpc";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState, useMemo } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type SessionStatus = "running" | "waiting" | "paused" | "completed" | "local" | "error";

const SEGMENTS = ["All", "Active", "Paused", "Done", "Local"];

const SEGMENT_STATUS_MAP: Record<string, SessionStatus[] | null> = {
	All: null,
	Active: ["running", "waiting"],
	Paused: ["paused"],
	Done: ["completed"],
	Local: ["local"],
};

export default function SessionsScreen() {
	const router = useRouter();
	const insets = useSafeAreaInsets();
	const [activeSegment, setActiveSegment] = useState(0);

	const { data: serverSessions, isLoading } = trpc.sessions.list.useQuery();
	const { data: usage } = trpc.usage.current.useQuery();
	const usagePercentage = usage?.available ? (usage.tiers[0]?.percentage ?? 0) : 0;

	// Map server status to UI status
	const sessions = useMemo(() => {
		if (!serverSessions) return [];
		return serverSessions.map((s) => ({
			id: s.id,
			name: s.name,
			repoName: s.repoName,
			mode: s.mode as "autonomous" | "interactive",
			status: (s.status === "active" ? "running" : s.status === "cancelled" ? "completed" : s.status) as
				"running" | "waiting" | "paused" | "completed" | "local" | "error",
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
			style={{
				flex: 1,
				backgroundColor: "#FAFAF9",
				paddingTop: insets.top,
			}}
		>
			{/* Header */}
			<View
				style={{
					flexDirection: "row",
					alignItems: "center",
					paddingHorizontal: 21,
					paddingTop: 16,
					paddingBottom: 12,
				}}
			>
				<Text
					style={{
						fontFamily: "DM Sans",
						fontSize: 32,
						fontWeight: "700",
						color: "#1C1917",
						flex: 1,
					}}
				>
					Sessions
				</Text>

				<UsageIndicator percentage={usagePercentage} />

				<Pressable
					style={{
						marginLeft: 10,
						width: 36,
						height: 36,
						alignItems: "center",
						justifyContent: "center",
					}}
				>
					<Feather name="bell" size={20} color="#78716C" />
				</Pressable>

				<Pressable
					onPress={() => router.push("/new-session" as any)}
					style={{
						marginLeft: 6,
						width: 36,
						height: 36,
						borderRadius: 18,
						backgroundColor: "#EA580C",
						alignItems: "center",
						justifyContent: "center",
					}}
				>
					<Feather name="plus" size={18} color="#FFFFFF" />
				</Pressable>
			</View>

			{/* Segment Control */}
			<View style={{ paddingHorizontal: 21, marginBottom: 16 }}>
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
					<View style={{ paddingTop: 40, alignItems: "center" }}>
						<Text style={{ fontFamily: "DM Sans", fontSize: 14, color: "#A8A29E" }}>
							{isLoading ? "Loading sessions..." : "No sessions yet"}
						</Text>
					</View>
				}
			/>
		</View>
	);
}
