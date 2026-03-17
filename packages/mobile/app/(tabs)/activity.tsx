import { Feather } from "@expo/vector-icons";
import React, { useMemo } from "react";
import { FlatList, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { trpc } from "@/src/lib/trpc";

type EventType = "completed" | "approval" | "error" | "started" | "paused" | "cancelled";

const EVENT_CONFIG: Record<EventType, { icon: keyof typeof Feather.glyphMap; color: string }> = {
	completed: { icon: "check-circle", color: "#16A34A" },
	approval: { icon: "alert-circle", color: "#D97706" },
	error: { icon: "x-circle", color: "#DC2626" },
	started: { icon: "play-circle", color: "#2563EB" },
	paused: { icon: "pause-circle", color: "#78716C" },
	cancelled: { icon: "minus-circle", color: "#78716C" },
};

function mapEventType(serverType: string): EventType {
	switch (serverType) {
		case "created": return "started";
		case "errored": return "error";
		case "approval_requested": return "approval";
		default: return serverType as EventType;
	}
}

function formatRelativeTime(isoString: string): string {
	const diff = Date.now() - new Date(isoString).getTime();
	const minutes = Math.floor(diff / 60000);
	if (minutes < 60) return `${minutes}m ago`;
	const hours = Math.floor(minutes / 60);
	if (hours < 24) return `${hours}h ago`;
	const days = Math.floor(hours / 24);
	return `${days}d ago`;
}

function groupByDate(events: Array<{ id: string; sessionName: string; type: string; description: string; timestamp: string }>): (string | { id: string; sessionName: string; type: EventType; description: string; timestamp: string })[] {
	const now = new Date();
	const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
	const yesterday = new Date(today.getTime() - 86400000);

	const groups: Record<string, typeof events> = {};

	for (const event of events) {
		const eventDate = new Date(event.timestamp);
		const eventDay = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());

		let label: string;
		if (eventDay >= today) label = "TODAY";
		else if (eventDay >= yesterday) label = "YESTERDAY";
		else label = eventDay.toLocaleDateString("en-US", { month: "short", day: "numeric" });

		if (!groups[label]) groups[label] = [];
		groups[label].push(event);
	}

	const flat: (string | { id: string; sessionName: string; type: EventType; description: string; timestamp: string })[] = [];
	for (const [label, items] of Object.entries(groups)) {
		flat.push(label);
		for (const item of items) {
			flat.push({ ...item, type: mapEventType(item.type) });
		}
	}
	return flat;
}

function EventRow({ event }: { event: { id: string; sessionName: string; type: EventType; description: string; timestamp: string } }) {
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
				{formatRelativeTime(event.timestamp)}
			</Text>
		</View>
	);
}

export default function ActivityScreen() {
	const insets = useSafeAreaInsets();
	const { data: events, isLoading } = trpc.activity.list.useQuery();

	const flatData = useMemo(() => {
		if (!events) return [];
		return groupByDate(events);
	}, [events]);

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
				ListEmptyComponent={
					<View style={{ paddingTop: 40, alignItems: "center" }}>
						<Text style={{ fontFamily: "DM Sans", fontSize: 14, color: "#A8A29E" }}>
							{isLoading ? "Loading activity..." : "No activity yet"}
						</Text>
					</View>
				}
			/>
		</View>
	);
}
