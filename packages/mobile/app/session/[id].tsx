import { ApprovalPrompt } from "@/src/components/ApprovalPrompt";
import { HandoffBanner } from "@/src/components/HandoffBanner";
import { MessageBubble } from "@/src/components/MessageBubble";
import { ModeBadge } from "@/src/components/ModeBadge";
import { StatusPill } from "@/src/components/StatusPill";
import { ToolCard } from "@/src/components/ToolCard";
import { trpc } from "@/src/lib/trpc";
import { useStreamStore } from "@/src/lib/store";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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
	const [now, setNow] = useState(Date.now());
	const [showPrompt, setShowPrompt] = useState(false);

	const initStream = useStreamStore((s) => s.initStream);
	const addMessage = useStreamStore((s) => s.addMessage);
	const setConnected = useStreamStore((s) => s.setConnected);
	const clearStream = useStreamStore((s) => s.clearStream);
	const stream = useStreamStore((s) => s.streams[id!]);

	const { data: sessionData } = trpc.sessions.detail.useQuery(
		{ id: id! },
		{ enabled: !!id, refetchInterval: stream?.connected ? false : 5000 }
	);
	const utils = trpc.useUtils();

	const session = sessionData?.session;
	const messages = sessionData?.messages ?? [];

	const isSessionActive = session?.status === "active";

	useEffect(() => {
		if (!isSessionActive) return;
		const interval = setInterval(() => setNow(Date.now()), 1000);
		return () => clearInterval(interval);
	}, [isSessionActive]);

	// Initialize stream on mount
	useEffect(() => {
		if (id) initStream(id);
		return () => {
			if (id) clearStream(id);
		};
	}, [id]);

	// Capture initial lastSeenIndex to avoid reconnect loops when store updates
	const initialLastSeenIndex = useRef(stream?.lastSeenIndex ?? 0);

	// Subscribe to live messages
	trpc.sessions.stream.useSubscription(
		{ id: id!, lastSeenIndex: initialLastSeenIndex.current },
		{
			enabled: !!id && !!stream,
			onData: (message) => {
				addMessage(id!, message);
			},
			onStarted: () => {
				setConnected(id!, true);
			},
			onError: () => {
				setConnected(id!, false);
			},
		}
	);

	const pauseMutation = trpc.sessions.pause.useMutation({
		onSuccess: () => utils.sessions.detail.invalidate({ id: id! }),
	});
	const cancelMutation = trpc.sessions.cancel.useMutation({
		onSuccess: () => utils.sessions.detail.invalidate({ id: id! }),
	});
	const sendMessage = trpc.sessions.message.useMutation({
		onSuccess: () => utils.sessions.detail.invalidate({ id: id! }),
	});

	// Handoff query - only when session is not active
	const { data: handoff } = trpc.sessions.handoff.useQuery(
		{ id: id! },
		{ enabled: !!session && session.status !== "active" }
	);

	// Merge stream and query messages, deduplicate by index
	const displayMessages = useMemo(() => {
		const seen = new Set<number>();
		const merged: typeof messages = [];
		// Stream messages take priority (most recent)
		if (stream?.messages) {
			for (const msg of stream.messages) {
				const idx = (msg as any).index ?? merged.length;
				if (!seen.has(idx)) {
					seen.add(idx);
					merged.push(msg);
				}
			}
		}
		// Fill in any query messages not already seen
		for (const msg of messages) {
			const idx = (msg as any).index ?? merged.length;
			if (!seen.has(idx)) {
				seen.add(idx);
				merged.push(msg);
			}
		}
		return merged;
	}, [stream?.messages, messages]);

	// Auto-scroll to bottom when messages change
	useEffect(() => {
		setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
	}, [displayMessages.length]);

	if (!session) {
		return (
			<View style={{ flex: 1, backgroundColor: "#FAFAF9", justifyContent: "center", alignItems: "center" }}>
				<Text style={{ fontFamily: "DM Sans", fontSize: 14, color: "#A8A29E" }}>Loading session...</Text>
			</View>
		);
	}

	const isActive = session.status === "active";
	const isError = session.status === "error";
	const showInput = isActive;
	const showHandoff = !isActive;

	// Map server status to UI status for StatusPill
	const uiStatus = session.status === "active" ? "running" :
	                  session.status === "cancelled" ? "completed" :
	                  session.status;

	// Calculate elapsed time from createdAt
	const elapsedSeconds = isActive
		? Math.floor((now - new Date(session.createdAt).getTime()) / 1000)
		: Math.floor((new Date(session.updatedAt).getTime() - new Date(session.createdAt).getTime()) / 1000);

	const handleSend = () => {
		if (!inputText.trim()) return;
		sendMessage.mutate({ id: session.id, message: inputText.trim() });
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
					<Pressable
						onPress={() => session.initialPrompt && setShowPrompt(!showPrompt)}
						style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 4 }}
					>
						<Text
							style={{
								fontFamily: "DM Sans",
								fontSize: 16,
								fontWeight: "700",
								color: "#292524",
								flex: 1,
							}}
							numberOfLines={showPrompt ? undefined : 1}
						>
							{session.name}
						</Text>
						{session.initialPrompt && session.initialPrompt.length > 40 && (
							<Feather name={showPrompt ? "chevron-up" : "chevron-down"} size={16} color="#A8A29E" />
						)}
					</Pressable>
					<Text
						style={{
							fontFamily: "JetBrains Mono",
							fontSize: 14,
							fontWeight: "700",
							color: "#292524",
						}}
					>
						{formatElapsed(elapsedSeconds)}
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
					{isError && <StatusPill status={uiStatus as any} />}
				</View>

				{/* Expanded prompt */}
				{showPrompt && session.initialPrompt && (
					<View style={{ paddingHorizontal: 16, paddingBottom: 10 }}>
						<View style={{ backgroundColor: "#F1F1F1", borderRadius: 10, padding: 12 }}>
							<Text style={{ fontFamily: "DM Sans", fontSize: 13, color: "#292524", lineHeight: 18 }}>
								{session.initialPrompt}
							</Text>
						</View>
					</View>
				)}

				{/* Row 3: Action buttons */}
				{(isActive || isError) && (
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
								onPress={() => sendMessage.mutate({ id: session.id, message: "Continue from where you left off." })}
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
									onPress={() => pauseMutation.mutate({ id: session.id })}
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
									onPress={() => cancelMutation.mutate({ id: session.id })}
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
				)}
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
				{displayMessages.map((msg, i) => {
					if (msg.type === "assistant" || msg.type === "result") {
						const text = typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content);
						return <MessageBubble key={i} content={text} />;
					}
					if (msg.type === "tool_use") {
						const content = msg.content as any;
						return (
							<ToolCard
								key={i}
								type={content.tool ?? "Bash"}
								title={content.tool ?? "Tool"}
								detail={content.input?.file_path ?? content.input?.command ?? ""}
							/>
						);
					}
					if (msg.type === "approval_request") {
						const content = msg.content as any;
						return (
							<ApprovalPrompt
								key={i}
								action={content.description ?? "Pending approval"}
								onApprove={() => {}}
								onDeny={() => {}}
							/>
						);
					}
					return null;
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
					<HandoffBanner command={handoff?.resumeCommand ?? `tricorder resume ${session.name.toLowerCase().replace(/\s+/g, "-")}`} />
				)}
			</View>
		</KeyboardAvoidingView>
	);
}
