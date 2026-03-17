import { ApprovalPrompt } from "@/src/components/ApprovalPrompt";
import { HandoffBanner } from "@/src/components/HandoffBanner";
import { MessageBubble } from "@/src/components/MessageBubble";
import { ModeBadge } from "@/src/components/ModeBadge";
import { StatusPill } from "@/src/components/StatusPill";
import { ToolCard } from "@/src/components/ToolCard";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// ─── Types ──────────────────────────────────────────────────────────────────

type SessionStatus = "running" | "waiting" | "paused" | "completed" | "error";

type MessageItem =
	| { type: "assistant"; content: string }
	| {
			type: "tool_use";
			toolType: "Read" | "Edit" | "Bash" | "Grep";
			title: string;
			detail: string;
			diff?: { removed: string[]; added: string[] };
			result?: { success: boolean; output: string };
	  }
	| { type: "approval_request"; action: string };

interface SessionData {
	id: string;
	name: string;
	repoName: string;
	mode: "autonomous" | "interactive";
	status: SessionStatus;
	elapsedSeconds: number;
	messages: MessageItem[];
}

// ─── Mock data ──────────────────────────────────────────────────────────────

const MOCK_SESSION: SessionData = {
	id: "1",
	name: "Add pagination to API",
	repoName: "api-service",
	mode: "autonomous",
	status: "running",
	elapsedSeconds: 272,
	messages: [
		{
			type: "assistant",
			content:
				"I'll add pagination support to the API routes. Let me first read the current route definitions to understand the existing structure.",
		},
		{
			type: "tool_use",
			toolType: "Read",
			title: "Read",
			detail: "src/api/routes.ts — 148 lines read",
		},
		{
			type: "tool_use",
			toolType: "Edit",
			title: "Edit",
			detail: "src/api/routes.ts",
			diff: {
				removed: ["app.get('/items', getItems)"],
				added: ["app.get('/items', paginate(getItems))", "app.get('/items/count', getCount)"],
			},
		},
		{
			type: "tool_use",
			toolType: "Bash",
			title: "Bash",
			detail: "$ npm test",
			result: { success: true, output: "14 tests passed" },
		},
		{
			type: "approval_request",
			action: "Edit auth.ts — update token expiry logic",
		},
		{
			type: "assistant",
			content:
				"All tests are passing. The pagination middleware now supports offset and limit query params with sensible defaults.",
		},
	],
};

const MOCK_ERROR_SESSION: SessionData = {
	...MOCK_SESSION,
	status: "error",
	elapsedSeconds: 768,
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatElapsed(seconds: number): string {
	const m = Math.floor(seconds / 60);
	const s = seconds % 60;
	return `${m}m ${s}s`;
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function SessionScreen() {
	const { id } = useLocalSearchParams<{ id: string }>();
	const router = useRouter();
	const insets = useSafeAreaInsets();
	const scrollRef = useRef<ScrollView>(null);
	const [inputText, setInputText] = useState("");

	// TODO: Wire trpc.sessions.stream.useSubscription({ sessionId: id })
	// to feed messages into the Zustand store, and read from useStreamStore().
	// For now we use mock data.
	const session: SessionData = id === "error" ? MOCK_ERROR_SESSION : MOCK_SESSION;

	const isActive = session.status === "running" || session.status === "waiting";
	const isError = session.status === "error";
	const showInput = isActive;
	const showHandoff = !isActive;

	// Auto-scroll to bottom when messages change
	useEffect(() => {
		setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
	}, [session.messages.length]);

	const handleSend = () => {
		if (!inputText.trim()) return;
		// TODO: Send message via tRPC mutation
		setInputText("");
	};

	return (
		<KeyboardAvoidingView
			style={{ flex: 1, backgroundColor: "#FAFAF9" }}
			behavior={Platform.OS === "ios" ? "padding" : undefined}
		>
			{/* ── Header ──────────────────────────────────────────────── */}
			<View
				style={{
					paddingTop: insets.top,
					backgroundColor: "#FAFAF9",
					borderBottomWidth: 1,
					borderBottomColor: "rgba(0,0,0,0.06)",
				}}
			>
				{/* Row 1: Back + Title + Elapsed */}
				<View
					style={{
						flexDirection: "row",
						alignItems: "center",
						paddingHorizontal: 16,
						paddingTop: 8,
						paddingBottom: 6,
					}}
				>
					<Pressable onPress={() => router.back()} hitSlop={12} style={{ marginRight: 8 }}>
						<Feather name="chevron-left" size={24} color="#292524" />
					</Pressable>
					<Text
						style={{
							fontFamily: "DM Sans",
							fontSize: 16,
							fontWeight: "700",
							color: "#292524",
							flex: 1,
						}}
						numberOfLines={1}
					>
						{session.name}
					</Text>
					<Text
						style={{
							fontFamily: "JetBrains Mono",
							fontSize: 14,
							fontWeight: "700",
							color: "#292524",
						}}
					>
						{formatElapsed(session.elapsedSeconds)}
					</Text>
				</View>

				{/* Row 2: Repo + Mode + (Error pill) */}
				<View
					style={{
						flexDirection: "row",
						alignItems: "center",
						paddingHorizontal: 48,
						gap: 8,
						paddingBottom: 10,
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
					<ModeBadge mode={session.mode} />
					{isError && <StatusPill status="error" />}
				</View>

				{/* Row 3: Action buttons */}
				<View
					style={{
						flexDirection: "row",
						paddingHorizontal: 16,
						gap: 10,
						paddingBottom: 12,
					}}
				>
					{isError ? (
						<Pressable
							style={({ pressed }) => ({
								flex: 1,
								height: 36,
								backgroundColor: pressed ? "#0F9380" : "#14B8A6",
								borderRadius: 8,
								flexDirection: "row",
								alignItems: "center",
								justifyContent: "center",
								gap: 6,
							})}
						>
							<Feather name="refresh-cw" size={14} color="#FFFFFF" />
							<Text
								style={{
									fontFamily: "DM Sans",
									fontSize: 13,
									fontWeight: "600",
									color: "#FFFFFF",
								}}
							>
								Retry
							</Text>
						</Pressable>
					) : (
						<>
							<Pressable
								style={({ pressed }) => ({
									flex: 1,
									height: 36,
									backgroundColor: pressed ? "rgba(217, 119, 6, 0.2)" : "rgba(217, 119, 6, 0.12)",
									borderRadius: 8,
									flexDirection: "row",
									alignItems: "center",
									justifyContent: "center",
									gap: 6,
								})}
							>
								<Feather name="pause" size={14} color="#D97706" />
								<Text
									style={{
										fontFamily: "DM Sans",
										fontSize: 13,
										fontWeight: "600",
										color: "#D97706",
									}}
								>
									Pause
								</Text>
							</Pressable>
							<Pressable
								style={({ pressed }) => ({
									flex: 1,
									height: 36,
									backgroundColor: pressed ? "rgba(220, 38, 38, 0.2)" : "rgba(220, 38, 38, 0.12)",
									borderRadius: 8,
									flexDirection: "row",
									alignItems: "center",
									justifyContent: "center",
									gap: 6,
								})}
							>
								<Feather name="x" size={14} color="#DC2626" />
								<Text
									style={{
										fontFamily: "DM Sans",
										fontSize: 13,
										fontWeight: "600",
										color: "#DC2626",
									}}
								>
									Cancel
								</Text>
							</Pressable>
						</>
					)}
				</View>
			</View>

			{/* ── Message Stream ──────────────────────────────────────── */}
			<ScrollView
				ref={scrollRef}
				style={{ flex: 1 }}
				contentContainerStyle={{
					padding: 16,
					gap: 12,
					paddingBottom: 24,
				}}
				showsVerticalScrollIndicator={false}
			>
				{session.messages.map((msg, i) => {
					switch (msg.type) {
						case "assistant":
							return <MessageBubble key={i} content={msg.content} />;
						case "tool_use":
							return (
								<ToolCard
									key={i}
									type={msg.toolType}
									title={msg.title}
									detail={msg.detail}
									diff={msg.diff}
									result={msg.result}
								/>
							);
						case "approval_request":
							return (
								<ApprovalPrompt
									key={i}
									action={msg.action}
									onApprove={() => {
										// TODO: Send approval via tRPC mutation
									}}
									onDeny={() => {
										// TODO: Send denial via tRPC mutation
									}}
								/>
							);
						default:
							return null;
					}
				})}
			</ScrollView>

			{/* ── Bottom Section ──────────────────────────────────────── */}
			<View
				style={{
					borderTopWidth: 1,
					borderTopColor: "rgba(0,0,0,0.06)",
					paddingBottom: insets.bottom || 16,
				}}
			>
				{showInput ? (
					<View
						style={{
							flexDirection: "row",
							alignItems: "center",
							paddingHorizontal: 16,
							paddingTop: 12,
							gap: 10,
						}}
					>
						<TextInput
							value={inputText}
							onChangeText={setInputText}
							placeholder="Send a message..."
							placeholderTextColor="#A8A29E"
							style={{
								flex: 1,
								height: 40,
								backgroundColor: "#F1F1F1",
								borderRadius: 20,
								paddingHorizontal: 16,
								fontFamily: "DM Sans",
								fontSize: 14,
								color: "#292524",
							}}
							returnKeyType="send"
							onSubmitEditing={handleSend}
						/>
						<Pressable
							onPress={handleSend}
							style={({ pressed }) => ({
								width: 40,
								height: 40,
								borderRadius: 20,
								backgroundColor: pressed ? "#D35407" : "#EA580C",
								alignItems: "center",
								justifyContent: "center",
							})}
						>
							<Feather name="send" size={18} color="#FFFFFF" />
						</Pressable>
					</View>
				) : (
					<HandoffBanner command={`tricorder resume ${session.name.toLowerCase().replace(/\s+/g, "-")}`} />
				)}
			</View>
		</KeyboardAvoidingView>
	);
}
