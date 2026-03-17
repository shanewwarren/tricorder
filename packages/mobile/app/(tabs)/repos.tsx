import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface Repo {
	id: string;
	name: string;
	defaultBranch: string;
	lastCommitDate: string;
}

// TODO: Replace mock data with tRPC query
// const { data: repos } = trpc.repos.list.useQuery();

const MOCK_REPOS: Repo[] = [
	{
		id: "1",
		name: "api-service",
		defaultBranch: "main",
		lastCommitDate: "2 hours ago",
	},
	{
		id: "2",
		name: "auth-module",
		defaultBranch: "main",
		lastCommitDate: "5 hours ago",
	},
	{
		id: "3",
		name: "backend-core",
		defaultBranch: "develop",
		lastCommitDate: "1 day ago",
	},
	{
		id: "4",
		name: "shared-utils",
		defaultBranch: "main",
		lastCommitDate: "3 days ago",
	},
	{
		id: "5",
		name: "worker-service",
		defaultBranch: "main",
		lastCommitDate: "1 week ago",
	},
];

function RepoCard({ repo }: { repo: Repo }) {
	const router = useRouter();

	return (
		<Pressable
			onPress={() => {
				// TODO: Navigate to new-session with repo pre-selected
				router.push("/new-session" as any);
			}}
			style={({ pressed }) => ({
				backgroundColor: "#F1F1F1",
				borderRadius: 16,
				padding: 16,
				paddingHorizontal: 18,
				opacity: pressed ? 0.8 : 1,
			})}
		>
			<View
				style={{
					flexDirection: "row",
					alignItems: "center",
					justifyContent: "space-between",
				}}
			>
				<View style={{ flex: 1 }}>
					<View
						style={{
							flexDirection: "row",
							alignItems: "center",
							gap: 8,
							marginBottom: 6,
						}}
					>
						<Feather name="folder" size={16} color="#EA580C" />
						<Text
							style={{
								fontFamily: "DM Sans",
								fontSize: 15,
								fontWeight: "600",
								color: "#1C1917",
							}}
						>
							{repo.name}
						</Text>
					</View>
					<View
						style={{
							flexDirection: "row",
							alignItems: "center",
							gap: 10,
						}}
					>
						<View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
							<Feather name="git-branch" size={12} color="#78716C" />
							<Text
								style={{
									fontFamily: "JetBrains Mono",
									fontSize: 12,
									color: "#78716C",
								}}
							>
								{repo.defaultBranch}
							</Text>
						</View>
						<Text style={{ fontSize: 12, color: "#A8A29E" }}>·</Text>
						<Text
							style={{
								fontFamily: "DM Sans",
								fontSize: 12,
								color: "#A8A29E",
							}}
						>
							{repo.lastCommitDate}
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
					Repos
				</Text>
			</View>

			<FlatList
				data={MOCK_REPOS}
				keyExtractor={(item) => item.id}
				renderItem={({ item }) => <RepoCard repo={item} />}
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
