import { trpc } from "@/src/lib/trpc";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

function RepoCard({ repo }: { repo: { name: string; path: string; defaultBranch: string; lastCommitDate: string | null } }) {
	const router = useRouter();

	return (
		<Pressable
			onPress={() => {
				router.push(`/new-session?repo=${encodeURIComponent(repo.name)}&path=${encodeURIComponent(repo.path)}&branch=${encodeURIComponent(repo.defaultBranch)}` as any);
			}}
			className="bg-surface-card rounded-2xl p-4 px-[18px]"
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
