import { Feather } from "@expo/vector-icons";
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
	createdAt?: string;
	updatedAt?: string;
}

interface SessionCardProps {
	session: Session;
}

function formatTimestamp(iso: string): string {
	if (!iso) return "";
	const date = new Date(iso);
	const now = new Date();
	const diffMs = now.getTime() - date.getTime();
	const diffMins = Math.floor(diffMs / 60000);
	const diffHours = Math.floor(diffMins / 60);
	const diffDays = Math.floor(diffHours / 24);

	if (diffMins < 1) return "just now";
	if (diffMins < 60) return `${diffMins}m ago`;
	if (diffHours < 24) return `${diffHours}h ago`;
	if (diffDays < 7) return `${diffDays}d ago`;
	return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
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
				<Text className="font-dm-sans text-sm text-ink-tertiary">·</Text>
				<ModeBadge mode={session.mode} />
			</View>

			{/* Row 3: Timestamps */}
			{(session.createdAt || session.updatedAt) && (
				<View className="flex-row items-center gap-3 w-full">
					{session.createdAt && (
						<View className="flex-row items-center gap-1">
							<Feather name="play-circle" size={11} color="#A8A29E" />
							<Text className="font-jetbrains text-2xs text-ink-tertiary">
								{formatTimestamp(session.createdAt)}
							</Text>
						</View>
					)}
					{session.updatedAt && (
						<View className="flex-row items-center gap-1">
							<Feather name="clock" size={11} color="#A8A29E" />
							<Text className="font-jetbrains text-2xs text-ink-tertiary">
								{formatTimestamp(session.updatedAt)}
							</Text>
						</View>
					)}
				</View>
			)}
		</Pressable>
	);
}
