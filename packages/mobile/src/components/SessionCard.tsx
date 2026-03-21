import { useRouter } from "expo-router";
import React from "react";
import { Pressable, Text, View } from "react-native";
import { ModeBadge } from "./ModeBadge";
import { StatusPill } from "./StatusPill";

type SessionStatus = "running" | "waiting" | "paused" | "completed" | "error";

interface Session {
	id: string;
	name: string;
	repoName: string;
	mode: "autonomous" | "interactive";
	status: SessionStatus;
	lastActivity: string;
}

interface SessionCardProps {
	session: Session;
}

export function SessionCard({ session }: SessionCardProps) {
	const router = useRouter();

	return (
		<Pressable
			onPress={() => router.push(`/session/${session.id}` as any)}
			style={({ pressed }) => ({
				backgroundColor: "#F1F1F1",
				borderRadius: 16,
				padding: 16,
				paddingHorizontal: 18,
				gap: 10,
				opacity: pressed ? 0.8 : 1,
			})}
		>
			{/* Row 1: Title + Status */}
			<View
				style={{
					flexDirection: "row",
					justifyContent: "space-between",
					alignItems: "center",
					width: "100%",
				}}
			>
				<Text
					style={{
						fontFamily: "DM Sans",
						fontSize: 15,
						fontWeight: "600",
						color: "#292524",
						flex: 1,
						marginRight: 8,
					}}
					numberOfLines={1}
				>
					{session.name}
				</Text>
				<StatusPill status={session.status} />
			</View>

			{/* Row 2: Repo + Mode */}
			<View
				style={{
					flexDirection: "row",
					alignItems: "center",
					gap: 10,
					width: "100%",
				}}
			>
				<Text
					style={{
						fontFamily: "JetBrains Mono",
						fontSize: 12,
						color: "#78716C",
					}}
				>
					{session.repoName}
				</Text>
				<Text
					style={{
						fontFamily: "DM Sans",
						fontSize: 12,
						color: "#A8A29E",
					}}
				>
					·
				</Text>
				<ModeBadge mode={session.mode} />
			</View>

			{/* Row 3: Activity description */}
			<Text
				style={{
					fontFamily: "DM Sans",
					fontSize: 13,
					color: "#78716C",
					lineHeight: 13 * 1.4,
					width: "100%",
				}}
			>
				{session.lastActivity}
			</Text>
		</Pressable>
	);
}
