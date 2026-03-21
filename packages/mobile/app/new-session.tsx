import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { trpc } from "@/src/lib/trpc";

type Mode = "autonomous" | "interactive";

export default function NewSessionScreen() {
	const router = useRouter();
	const insets = useSafeAreaInsets();
	const params = useLocalSearchParams<{ repo?: string; path?: string; branch?: string }>();

	const { data: repos } = trpc.repos.list.useQuery();
	const [selectedRepo, setSelectedRepo] = useState<{ name: string; path: string; defaultBranch: string } | null>(null);

	// Fetch branches when repo is selected
	const { data: repoDetail } = trpc.repos.detail.useQuery(
		{ path: selectedRepo?.path ?? "" },
		{ enabled: !!selectedRepo }
	);
	const branches = repoDetail?.branches ?? ["main"];
	const [selectedBranch, setSelectedBranch] = useState("main");

	const [mode, setMode] = useState<Mode>("autonomous");
	const [prompt, setPrompt] = useState("");

	// Pickers
	const [showRepoPicker, setShowRepoPicker] = useState(false);
	const [showBranchPicker, setShowBranchPicker] = useState(false);

	const utils = trpc.useUtils();
	const createSession = trpc.sessions.create.useMutation({
		onSuccess: (sessionId) => {
			utils.sessions.list.invalidate();
			utils.activity.list.invalidate();
			router.replace(`/session/${sessionId}` as any);
		},
	});

	useEffect(() => {
		// Pre-select repo from query params (e.g. navigating from Repos tab)
		if (params.repo && params.path && !selectedRepo) {
			setSelectedRepo({ name: params.repo, path: params.path, defaultBranch: params.branch ?? "main" });
			setSelectedBranch(params.branch ?? "main");
		} else if (repos?.length && !selectedRepo) {
			setSelectedRepo(repos[0]);
			setSelectedBranch(repos[0].defaultBranch);
		}
	}, [repos, params.repo]);

	return (
		<View
			className="flex-1 bg-page"
			style={{ paddingTop: insets.top }}
		>
			<ScrollView
				contentContainerStyle={{
					paddingHorizontal: 21,
					paddingBottom: 40,
				}}
				showsVerticalScrollIndicator={false}
			>
				{/* Header */}
				<View className="flex-row items-center pt-4 pb-5 gap-3">
					<Pressable onPress={() => router.back()}>
						<Feather name="arrow-left" size={24} color="#1C1917" />
					</Pressable>
					<Text className="font-dm-sans text-3xl font-bold text-ink-primary">
						New Session
					</Text>
				</View>

				{/* Repository Picker */}
				<Text className="font-dm-sans text-md font-semibold text-ink-primary mb-2">
					Repository
				</Text>
				<Pressable
					onPress={() => setShowRepoPicker(!showRepoPicker)}
					className="flex-row items-center border border-border-default rounded-lg p-3.5 mb-1"
				>
					<Feather name="git-merge" size={18} color="#EA580C" style={{ marginRight: 10 }} />
					<Text className="font-dm-sans text-lg text-ink-primary flex-1">
						{selectedRepo?.name ?? "Select a repository"}
					</Text>
					<Feather name="chevron-down" size={18} color="#78716C" />
				</Pressable>
				{showRepoPicker && repos && (
					<View className="border border-border-default rounded-lg mb-2 max-h-[200px] overflow-hidden">
						<ScrollView nestedScrollEnabled>
							{repos.map((repo) => (
								<Pressable
									key={repo.path}
									onPress={() => {
										setSelectedRepo(repo);
										setSelectedBranch(repo.defaultBranch);
										setShowRepoPicker(false);
									}}
									className="p-3.5 border-b border-b-card"
									style={({ pressed }) => ({
										backgroundColor: pressed ? "#F5F5F4" : "transparent",
									})}
								>
									<Text className="font-dm-sans text-lg text-ink-primary">{repo.name}</Text>
								</Pressable>
							))}
						</ScrollView>
					</View>
				)}
				<Text className="font-dm-sans text-sm text-tertiary mb-5">
					{selectedRepo?.path ?? ""}
				</Text>

				{/* Branch Picker */}
				<Text className="font-dm-sans text-md font-semibold text-ink-primary mb-2">
					Branch
				</Text>
				<Pressable
					onPress={() => setShowBranchPicker(!showBranchPicker)}
					className="flex-row items-center border border-border-default rounded-lg p-3.5 mb-5"
				>
					<Feather name="git-branch" size={18} color="#EA580C" style={{ marginRight: 10 }} />
					<Text className="font-dm-sans text-lg text-ink-primary flex-1">
						{selectedBranch}
					</Text>
					<Feather name="chevron-down" size={18} color="#78716C" />
				</Pressable>
				{showBranchPicker && (
					<View className="border border-border-default rounded-lg mb-2 max-h-[200px] overflow-hidden">
						<ScrollView nestedScrollEnabled>
							{branches.map((branch) => (
								<Pressable
									key={branch}
									onPress={() => {
										setSelectedBranch(branch);
										setShowBranchPicker(false);
									}}
									className="p-3.5 border-b border-b-card"
									style={({ pressed }) => ({
										backgroundColor: pressed ? "#F5F5F4" : "transparent",
									})}
								>
									<Text className="font-dm-sans text-lg text-ink-primary">{branch}</Text>
								</Pressable>
							))}
						</ScrollView>
					</View>
				)}

				{/* Prompt */}
				<Text className="font-dm-sans text-md font-semibold text-ink-primary mb-2">
					Prompt
				</Text>
				<TextInput
					className="border border-border-default rounded-lg p-3.5 font-dm-sans text-lg text-ink-primary min-h-[120px]"
					style={{ textAlignVertical: "top" }}
					placeholder="What do you want Claude to do?"
					placeholderTextColor="#A8A29E"
					multiline
					value={prompt}
					onChangeText={setPrompt}
				/>
				<Text className="font-dm-sans text-sm text-tertiary mt-1.5 mb-6">
					Supports markdown. Be specific about files and goals.
				</Text>

				{/* Mode Toggle */}
				<Text className="font-dm-sans text-md font-semibold text-ink-primary mb-[10px]">
					Mode
				</Text>
				<View className="flex-row gap-3 mb-7">
					{/* Autonomous */}
					<Pressable
						onPress={() => setMode("autonomous")}
						className="flex-1 rounded-lg p-3.5 items-center gap-1"
						style={{
							backgroundColor: mode === "autonomous" ? "#EA580C" : "#F1F1F1",
						}}
					>
						<Feather name="zap" size={20} color={mode === "autonomous" ? "#FFFFFF" : "#78716C"} />
						<Text
							className="font-dm-sans text-md font-semibold"
							style={{
								color: mode === "autonomous" ? "#FFFFFF" : "#1C1917",
							}}
						>
							Autonomous
						</Text>
						<Text
							className="font-dm-sans text-sm"
							style={{
								color: mode === "autonomous" ? "rgba(255,255,255,0.8)" : "#78716C",
							}}
						>
							Fire & forget
						</Text>
					</Pressable>

					{/* Interactive */}
					<Pressable
						onPress={() => setMode("interactive")}
						className="flex-1 rounded-lg p-3.5 items-center gap-1"
						style={{
							backgroundColor: mode === "interactive" ? "#EA580C" : "#F1F1F1",
						}}
					>
						<Feather name="eye" size={20} color={mode === "interactive" ? "#FFFFFF" : "#78716C"} />
						<Text
							className="font-dm-sans text-md font-semibold"
							style={{
								color: mode === "interactive" ? "#FFFFFF" : "#1C1917",
							}}
						>
							Interactive
						</Text>
						<Text
							className="font-dm-sans text-sm"
							style={{
								color: mode === "interactive" ? "rgba(255,255,255,0.8)" : "#78716C",
							}}
						>
							Approve changes
						</Text>
					</Pressable>
				</View>

				{/* Launch Button */}
				<Pressable
					onPress={() => {
						if (!selectedRepo || !prompt.trim()) return;
						createSession.mutate({
							repoName: selectedRepo.name,
							branch: selectedBranch,
							prompt: prompt.trim(),
							mode,
						});
					}}
					className="rounded-2xl py-4 flex-row items-center justify-center gap-2"
					style={({ pressed }) => ({
						backgroundColor: createSession.isPending ? "#A8A29E" : "#EA580C",
						opacity: pressed ? 0.9 : 1,
					})}
				>
					<Feather name="play" size={18} color="#FFFFFF" />
					<Text className="font-dm-sans text-xl font-bold text-white">
						Launch Session
					</Text>
				</Pressable>
			</ScrollView>
		</View>
	);
}
