import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// TODO: Replace mock data with tRPC queries
// const { data: repos } = trpc.repos.list.useQuery();
// const { data: branches } = trpc.repos.branches.useQuery({ repoId });

const MOCK_REPOS = [
	{ id: "1", name: "api-service" },
	{ id: "2", name: "auth-module" },
	{ id: "3", name: "backend-core" },
	{ id: "4", name: "shared-utils" },
];

const MOCK_BRANCHES = ["main", "develop", "feature/auth", "fix/memory-leak"];

type Mode = "autonomous" | "interactive";

export default function NewSessionScreen() {
	const router = useRouter();
	const insets = useSafeAreaInsets();
	const [selectedRepo, setSelectedRepo] = useState(MOCK_REPOS[0]);
	const [selectedBranch, setSelectedBranch] = useState(MOCK_BRANCHES[0]);
	const [prompt, setPrompt] = useState("");
	const [mode, setMode] = useState<Mode>("autonomous");

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
						{selectedRepo.name}
					</Text>
					<Feather name="chevron-down" size={18} color="#78716C" />
				</Pressable>
				<Text
					style={{
						fontFamily: "DM Sans",
						fontSize: 12,
						color: "#A8A29E",
						marginBottom: 20,
					}}
				>
					Last commit: 2 hours ago
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
						// TODO: Call tRPC mutation to create session
						// trpc.sessions.create.mutate({ repoId, branch, prompt, mode });
						router.back();
					}}
					style={({ pressed }) => ({
						backgroundColor: "#EA580C",
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
