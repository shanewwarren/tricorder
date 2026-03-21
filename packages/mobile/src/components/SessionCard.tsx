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
			className="bg-surface-card rounded-2xl p-4 px-[18px] gap-[10px]"
			style={({ pressed }) => ({
				opacity: pressed ? 0.8 : 1,
			})}
		>
			{/* Row 1: Title + Status */}
			<View className="flex-row justify-between items-center w-full">
				<Text
					className="font-dm-sans text-lg font-semibold text-ink-dark flex-1 mr-2"
					numberOfLines={1}
				>
					{session.name}
				</Text>
				<StatusPill status={session.status} />
			</View>

			{/* Row 2: Repo + Mode */}
			<View className="flex-row items-center gap-[10px] w-full">
				<Text className="font-jetbrains text-sm text-ink-secondary">
					{session.repoName}
				</Text>
				<Text className="font-dm-sans text-sm text-ink-tertiary">
					·
				</Text>
				<ModeBadge mode={session.mode} />
			</View>

			{/* Row 3: Activity description */}
			<Text className="font-dm-sans text-base text-ink-secondary leading-[18.2px] w-full">
				{session.lastActivity}
			</Text>
		</Pressable>
	);
}
