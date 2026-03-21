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
		<View className="flex-row items-center py-3 px-[21px] gap-3">
			<Feather name={config.icon} size={16} color={config.color} />
			<View className="flex-1">
				<Text
					className="font-dm-sans text-md font-semibold text-primary"
					numberOfLines={1}
				>
					{event.sessionName}
				</Text>
				<Text
					className="font-dm-sans text-base text-secondary mt-0.5"
					numberOfLines={1}
				>
					{event.description}
				</Text>
			</View>
			<Text className="font-dm-sans text-sm text-tertiary">
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
			className="flex-1 bg-page"
			style={{ paddingTop: insets.top }}
		>
			{/* Header */}
			<View className="px-[21px] pt-4 pb-3">
				<Text className="font-dm-sans text-4xl font-bold text-primary">
					Activity
				</Text>
			</View>

			<FlatList
				data={flatData}
				keyExtractor={(item, index) => (typeof item === "string" ? `header-${item}` : item.id)}
				renderItem={({ item }) => {
					if (typeof item === "string") {
						return (
							<View className="px-[21px] pt-4 pb-1.5">
								<Text className="font-jetbrains text-xs font-bold text-tertiary tracking-[1.5px] uppercase">
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
					<View className="pt-10 items-center">
						<Text className="font-dm-sans text-md text-tertiary">
							{isLoading ? "Loading activity..." : "No activity yet"}
						</Text>
					</View>
				}
			/>
		</View>
	);
}
