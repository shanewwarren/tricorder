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
			style={{
				flex: 1,
				backgroundColor: "#FAFAF9",
				paddingTop: insets.top,
			}}
		>
			<ScrollView
				contentContainerStyle={{
					paddingHorizontal: 21,
					paddingBottom: 40,
				}}
				showsVerticalScrollIndicator={false}
			>
				{/* Header */}
				<View
					style={{
						flexDirection: "row",
						alignItems: "center",
						paddingTop: 16,
						paddingBottom: 20,
						gap: 12,
					}}
				>
					<Pressable onPress={() => router.back()}>
						<Feather name="arrow-left" size={24} color="#1C1917" />
					</Pressable>
					<Text
						style={{
							fontFamily: "DM Sans",
							fontSize: 28,
							fontWeight: "700",
							color: "#1C1917",
						}}
					>
						New Session
					</Text>
				</View>

				{/* Repository Picker */}
				<Text
					style={{
						fontFamily: "DM Sans",
						fontSize: 14,
						fontWeight: "600",
						color: "#1C1917",
						marginBottom: 8,
					}}
				>
					Repository
				</Text>
				<Pressable
					onPress={() => setShowRepoPicker(!showRepoPicker)}
					style={{
						flexDirection: "row",
						alignItems: "center",
						borderWidth: 1,
						borderColor: "#D6D3D1",
						borderRadius: 12,
						padding: 14,
						marginBottom: 4,
					}}
				>
					<Feather name="git-merge" size={18} color="#EA580C" style={{ marginRight: 10 }} />
					<Text
						style={{
							fontFamily: "DM Sans",
							fontSize: 15,
							color: "#1C1917",
							flex: 1,
						}}
					>
						{selectedRepo?.name ?? "Select a repository"}
					</Text>
					<Feather name="chevron-down" size={18} color="#78716C" />
				</Pressable>
				{showRepoPicker && repos && (
					<View style={{ borderWidth: 1, borderColor: "#D6D3D1", borderRadius: 12, marginBottom: 8, maxHeight: 200, overflow: "hidden" }}>
						<ScrollView nestedScrollEnabled>
							{repos.map((repo) => (
								<Pressable
									key={repo.path}
									onPress={() => {
										setSelectedRepo(repo);
										setSelectedBranch(repo.defaultBranch);
										setShowRepoPicker(false);
									}}
									style={({ pressed }) => ({
										padding: 14,
										borderBottomWidth: 1,
										borderBottomColor: "#F1F1F1",
										backgroundColor: pressed ? "#F5F5F4" : "transparent",
									})}
								>
									<Text style={{ fontFamily: "DM Sans", fontSize: 15, color: "#1C1917" }}>{repo.name}</Text>
								</Pressable>
							))}
						</ScrollView>
					</View>
				)}
				<Text
					style={{
						fontFamily: "DM Sans",
						fontSize: 12,
						color: "#A8A29E",
						marginBottom: 20,
					}}
				>
					{selectedRepo?.path ?? ""}
				</Text>

				{/* Branch Picker */}
				<Text
					style={{
						fontFamily: "DM Sans",
						fontSize: 14,
						fontWeight: "600",
						color: "#1C1917",
						marginBottom: 8,
					}}
				>
					Branch
				</Text>
				<Pressable
					onPress={() => setShowBranchPicker(!showBranchPicker)}
					style={{
						flexDirection: "row",
						alignItems: "center",
						borderWidth: 1,
						borderColor: "#D6D3D1",
						borderRadius: 12,
						padding: 14,
						marginBottom: 20,
					}}
				>
					<Feather name="git-branch" size={18} color="#EA580C" style={{ marginRight: 10 }} />
					<Text
						style={{
							fontFamily: "DM Sans",
							fontSize: 15,
							color: "#1C1917",
							flex: 1,
						}}
					>
						{selectedBranch}
					</Text>
					<Feather name="chevron-down" size={18} color="#78716C" />
				</Pressable>
				{showBranchPicker && (
					<View style={{ borderWidth: 1, borderColor: "#D6D3D1", borderRadius: 12, marginBottom: 8, maxHeight: 200, overflow: "hidden" }}>
						<ScrollView nestedScrollEnabled>
							{branches.map((branch) => (
								<Pressable
									key={branch}
									onPress={() => {
										setSelectedBranch(branch);
										setShowBranchPicker(false);
									}}
									style={({ pressed }) => ({
										padding: 14,
										borderBottomWidth: 1,
										borderBottomColor: "#F1F1F1",
										backgroundColor: pressed ? "#F5F5F4" : "transparent",
									})}
								>
									<Text style={{ fontFamily: "DM Sans", fontSize: 15, color: "#1C1917" }}>{branch}</Text>
								</Pressable>
							))}
						</ScrollView>
					</View>
				)}

				{/* Prompt */}
				<Text
					style={{
						fontFamily: "DM Sans",
						fontSize: 14,
						fontWeight: "600",
						color: "#1C1917",
						marginBottom: 8,
					}}
				>
					Prompt
				</Text>
				<TextInput
					style={{
						borderWidth: 1,
						borderColor: "#D6D3D1",
						borderRadius: 12,
						padding: 14,
						fontFamily: "DM Sans",
						fontSize: 15,
						color: "#1C1917",
						minHeight: 120,
						textAlignVertical: "top",
					}}
					placeholder="What do you want Claude to do?"
					placeholderTextColor="#A8A29E"
					multiline
					value={prompt}
					onChangeText={setPrompt}
				/>
				<Text
					style={{
						fontFamily: "DM Sans",
						fontSize: 12,
						color: "#A8A29E",
						marginTop: 6,
						marginBottom: 24,
					}}
				>
					Supports markdown. Be specific about files and goals.
				</Text>

				{/* Mode Toggle */}
				<Text
					style={{
						fontFamily: "DM Sans",
						fontSize: 14,
						fontWeight: "600",
						color: "#1C1917",
						marginBottom: 10,
					}}
				>
					Mode
				</Text>
				<View
					style={{
						flexDirection: "row",
						gap: 12,
						marginBottom: 28,
					}}
				>
					{/* Autonomous */}
					<Pressable
						onPress={() => setMode("autonomous")}
						style={{
							flex: 1,
							backgroundColor: mode === "autonomous" ? "#EA580C" : "#F1F1F1",
							borderRadius: 12,
							padding: 14,
							alignItems: "center",
							gap: 4,
						}}
					>
						<Feather name="zap" size={20} color={mode === "autonomous" ? "#FFFFFF" : "#78716C"} />
						<Text
							style={{
								fontFamily: "DM Sans",
								fontSize: 14,
								fontWeight: "600",
								color: mode === "autonomous" ? "#FFFFFF" : "#1C1917",
							}}
						>
							Autonomous
						</Text>
						<Text
							style={{
								fontFamily: "DM Sans",
								fontSize: 12,
								color: mode === "autonomous" ? "rgba(255,255,255,0.8)" : "#78716C",
							}}
						>
							Fire & forget
						</Text>
					</Pressable>

					{/* Interactive */}
					<Pressable
						onPress={() => setMode("interactive")}
						style={{
							flex: 1,
							backgroundColor: mode === "interactive" ? "#EA580C" : "#F1F1F1",
							borderRadius: 12,
							padding: 14,
							alignItems: "center",
							gap: 4,
						}}
					>
						<Feather name="eye" size={20} color={mode === "interactive" ? "#FFFFFF" : "#78716C"} />
						<Text
							style={{
								fontFamily: "DM Sans",
								fontSize: 14,
								fontWeight: "600",
								color: mode === "interactive" ? "#FFFFFF" : "#1C1917",
							}}
						>
							Interactive
						</Text>
						<Text
							style={{
								fontFamily: "DM Sans",
								fontSize: 12,
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
					style={({ pressed }) => ({
						backgroundColor: createSession.isPending ? "#A8A29E" : "#EA580C",
						borderRadius: 16,
						paddingVertical: 16,
						flexDirection: "row",
						alignItems: "center",
						justifyContent: "center",
						gap: 8,
						opacity: pressed ? 0.9 : 1,
					})}
				>
					<Feather name="play" size={18} color="#FFFFFF" />
					<Text
						style={{
							fontFamily: "DM Sans",
							fontSize: 16,
							fontWeight: "700",
							color: "#FFFFFF",
						}}
					>
						Launch Session
					</Text>
				</Pressable>
			</ScrollView>
		</View>
	);
}
