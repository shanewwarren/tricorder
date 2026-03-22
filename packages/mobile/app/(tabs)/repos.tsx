import { trpc } from "@/src/lib/trpc";
import { lightMarkdownStyles } from "@/src/lib/markdownStyles";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import Markdown from "react-native-markdown-display";
import { useSafeAreaInsets } from "react-native-safe-area-context";

function RepoCard({ repo }: { repo: { name: string; path: string; defaultBranch: string; lastCommitDate: string | null } }) {
	const router = useRouter();
	const [showMemory, setShowMemory] = useState(false);

	const { data: memoryFiles, isLoading: memoryLoading } = trpc.repos.memory.useQuery(
		{ path: repo.path },
		{ enabled: showMemory },
	);

	return (
		<View className="bg-surface-card rounded-2xl p-4 px-[18px]">
			<Pressable
				onPress={() => {
					router.push(`/new-session?repo=${encodeURIComponent(repo.name)}&path=${encodeURIComponent(repo.path)}&branch=${encodeURIComponent(repo.defaultBranch)}` as any);
				}}
				style={({ pressed }) => ({
					opacity: pressed ? 0.8 : 1,
				})}
			>
				<View className="flex-row items-center justify-between">
					<View className="flex-1">
						<View className="flex-row items-center gap-2 mb-1.5">
							<Feather name="folder" size={16} color="#EA580C" />
							<Text className="font-dm-sans text-lg font-semibold text-ink-primary">
								{repo.name}
							</Text>
						</View>
						<View className="flex-row items-center gap-[10px]">
							<View className="flex-row items-center gap-1">
								<Feather name="git-branch" size={12} color="#78716C" />
								<Text className="font-jetbrains text-sm text-ink-secondary">
									{repo.defaultBranch}
								</Text>
							</View>
							<Text className="text-sm text-ink-tertiary">·</Text>
							<Text className="font-dm-sans text-sm text-ink-tertiary">
								{repo.lastCommitDate ?? "No commits"}
							</Text>
						</View>
					</View>
					<Feather name="chevron-right" size={18} color="#A8A29E" />
				</View>
			</Pressable>

			{/* Memory toggle button */}
			<Pressable
				onPress={() => setShowMemory(!showMemory)}
				hitSlop={8}
				className="absolute top-4 right-12 w-8 h-8 rounded-full items-center justify-center"
				style={({ pressed }) => ({
					backgroundColor: showMemory ? "rgba(234, 88, 12, 0.12)" : pressed ? "rgba(0,0,0,0.04)" : "transparent",
				})}
			>
				<Feather name="book-open" size={15} color={showMemory ? "#EA580C" : "#A8A29E"} />
			</Pressable>

			{/* Expandable memory section */}
			{showMemory && (
				<View className="mt-3 pt-3 border-t border-border-default">
					{memoryLoading ? (
						<Text className="font-dm-sans text-sm text-ink-tertiary">Loading memory...</Text>
					) : !memoryFiles || memoryFiles.length === 0 ? (
						<Text className="font-dm-sans text-sm text-ink-tertiary">No project memory</Text>
					) : (
						memoryFiles.map((file) => (
							<View key={file.filename} className="mb-3">
								<Text className="font-jetbrains text-xs text-ink-secondary mb-1">
									{file.filename}
								</Text>
								<Markdown style={lightMarkdownStyles}>{file.content}</Markdown>
							</View>
						))
					)}
				</View>
			)}
		</View>
	);
}

export default function ReposScreen() {
	const insets = useSafeAreaInsets();
	const { data: repos, isLoading } = trpc.repos.list.useQuery();

	return (
		<View
			className="flex-1 bg-surface-page"
			style={{ paddingTop: insets.top }}
		>
			{/* Header */}
			<View className="px-[21px] pt-4 pb-3">
				<Text className="font-dm-sans text-4xl font-bold text-ink-primary">
					Repos
				</Text>
			</View>

			<FlatList
				data={repos ?? []}
				keyExtractor={(item) => item.path}
				renderItem={({ item }) => <RepoCard repo={item} />}
				contentContainerStyle={{ paddingHorizontal: 21, paddingBottom: 100, gap: 12 }}
				showsVerticalScrollIndicator={false}
				ListEmptyComponent={
					<View className="pt-10 items-center">
						<Text className="font-dm-sans text-md text-ink-tertiary">
							{isLoading ? "Loading repos..." : "No repos found"}
						</Text>
					</View>
				}
			/>
		</View>
	);
}
