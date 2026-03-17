import { SegmentControl } from "@/src/components/SegmentControl";
import { SessionCard } from "@/src/components/SessionCard";
import { UsageIndicator } from "@/src/components/UsageIndicator";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState, useMemo } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type SessionStatus = "running" | "waiting" | "paused" | "completed" | "local" | "error";

interface Session {
	id: string;
	name: string;
	repoName: string;
	mode: "autonomous" | "interactive";
	status: SessionStatus;
	lastActivity: string;
}

const SEGMENTS = ["All", "Active", "Paused", "Done", "Local"];

const SEGMENT_STATUS_MAP: Record<string, SessionStatus[] | null> = {
	All: null,
	Active: ["running", "waiting"],
	Paused: ["paused"],
	Done: ["completed"],
	Local: ["local"],
};

// Mock data matching the design
const MOCK_SESSIONS: Session[] = [
	{
		id: "1",
		name: "Add pagination to API",
		repoName: "api-service",
		mode: "autonomous",
		status: "running",
		lastActivity: "Editing src/api/routes.ts \u2014 adding offset parameter",
	},
	{
		id: "2",
		name: "Fix auth token refresh",
		repoName: "auth-module",
		mode: "interactive",
		status: "waiting",
		lastActivity: "Awaiting approval to edit middleware/auth.ts",
	},
	{
		id: "3",
		name: "Refactor database queries",
		repoName: "backend-core",
		mode: "autonomous",
		status: "paused",
		lastActivity: "Paused \u2014 waiting for CI pipeline to complete",
	},
	{
		id: "4",
		name: "Write unit tests for utils",
		repoName: "shared-utils",
		mode: "autonomous",
		status: "completed",
		lastActivity: "Finished \u2014 23 tests added, all passing",
	},
	{
		id: "5",
		name: "Debug memory leak in worker",
		repoName: "worker-service",
		mode: "interactive",
		status: "local",
		lastActivity: "Interactive session \u2014 investigating heap snapshots",
	},
];

export default function SessionsScreen() {
	const router = useRouter();
	const insets = useSafeAreaInsets();
	const [activeSegment, setActiveSegment] = useState(0);

	// TODO: Replace mock data with tRPC query
	// const { data: sessions } = trpc.sessions.list.useQuery();
	const sessions = MOCK_SESSIONS;

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

				<UsageIndicator percentage={3} />

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
			/>
		</View>
	);
}
