import { Feather } from "@expo/vector-icons";
import React from "react";
import { FlatList, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type EventType = "completed" | "approval" | "error" | "started" | "paused";

interface ActivityEvent {
	id: string;
	type: EventType;
	sessionName: string;
	description: string;
	timestamp: string;
}

interface ActivityGroup {
	title: string;
	data: ActivityEvent[];
}

// TODO: Replace mock data with tRPC query
// const { data: activity } = trpc.activity.list.useQuery();

const MOCK_ACTIVITY: ActivityGroup[] = [
	{
		title: "TODAY",
		data: [
			{
				id: "1",
				type: "completed",
				sessionName: "Add pagination to API",
				description: "Session completed successfully",
				timestamp: "2h ago",
			},
			{
				id: "2",
				type: "approval",
				sessionName: "Fix auth middleware",
				description: "Needs approval: Edit auth.ts",
				timestamp: "3h ago",
			},
			{
				id: "3",
				type: "error",
				sessionName: "Update CI pipeline",
				description: "Session errored: build failed",
				timestamp: "15m ago",
			},
			{
				id: "4",
				type: "started",
				sessionName: "Refactor database layer",
				description: "Session started",
				timestamp: "22m ago",
			},
			{
				id: "5",
				type: "paused",
				sessionName: "Add unit tests",
				description: "Session paused by user",
				timestamp: "1h ago",
			},
		],
	},
	{
		title: "YESTERDAY",
		data: [
			{
				id: "6",
				type: "completed",
				sessionName: "Setup ESLint config",
				description: "Session completed successfully",
				timestamp: "18h ago",
			},
			{
				id: "7",
				type: "error",
				sessionName: "Migrate to TypeScript",
				description: "Session errored: type conflicts",
				timestamp: "7h ago",
			},
			{
				id: "8",
				type: "completed",
				sessionName: "Add dark mode support",
				description: "Session completed successfully",
				timestamp: "1d ago",
			},
		],
	},
];

const EVENT_CONFIG: Record<EventType, { icon: keyof typeof Feather.glyphMap; color: string }> = {
	completed: { icon: "check-circle", color: "#16A34A" },
	approval: { icon: "alert-circle", color: "#D97706" },
	error: { icon: "x-circle", color: "#DC2626" },
	started: { icon: "play-circle", color: "#2563EB" },
	paused: { icon: "pause-circle", color: "#78716C" },
};

function EventRow({ event }: { event: ActivityEvent }) {
	const config = EVENT_CONFIG[event.type];

	return (
		<View
			style={{
				flexDirection: "row",
				alignItems: "center",
				paddingVertical: 12,
				paddingHorizontal: 21,
				gap: 12,
			}}
		>
			<Feather name={config.icon} size={16} color={config.color} />
			<View style={{ flex: 1 }}>
				<Text
					style={{
						fontFamily: "DM Sans",
						fontSize: 14,
						fontWeight: "600",
						color: "#1C1917",
					}}
					numberOfLines={1}
				>
					{event.sessionName}
				</Text>
				<Text
					style={{
						fontFamily: "DM Sans",
						fontSize: 13,
						color: "#78716C",
						marginTop: 2,
					}}
					numberOfLines={1}
				>
					{event.description}
				</Text>
			</View>
			<Text
				style={{
					fontFamily: "DM Sans",
					fontSize: 12,
					color: "#A8A29E",
				}}
			>
				{event.timestamp}
			</Text>
		</View>
	);
}

export default function ActivityScreen() {
	const insets = useSafeAreaInsets();

	const flatData: (string | ActivityEvent)[] = [];
	for (const group of MOCK_ACTIVITY) {
		flatData.push(group.title);
		for (const event of group.data) {
			flatData.push(event);
		}
	}

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
					}}
				>
					Activity
				</Text>
			</View>

			<FlatList
				data={flatData}
				keyExtractor={(item, index) => (typeof item === "string" ? `header-${item}` : item.id)}
				renderItem={({ item }) => {
					if (typeof item === "string") {
						return (
							<View style={{ paddingHorizontal: 21, paddingTop: 16, paddingBottom: 6 }}>
								<Text
									style={{
										fontFamily: "DM Sans",
										fontSize: 11,
										fontWeight: "700",
										color: "#A8A29E",
										letterSpacing: 1.5,
										textTransform: "uppercase",
									}}
								>
									{item}
								</Text>
							</View>
						);
					}
					return <EventRow event={item} />;
				}}
				contentContainerStyle={{ paddingBottom: 100 }}
				showsVerticalScrollIndicator={false}
			/>
		</View>
	);
}
