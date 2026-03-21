import { ApprovalPrompt } from "@/src/components/ApprovalPrompt";
import { HandoffBanner } from "@/src/components/HandoffBanner";
import { MessageBubble } from "@/src/components/MessageBubble";
import { ModeBadge } from "@/src/components/ModeBadge";
import { ResultSummary } from "@/src/components/ResultSummary";
import { StatusPill } from "@/src/components/StatusPill";
import { ToolCard } from "@/src/components/ToolCard";
import { UserBubble } from "@/src/components/UserBubble";
import { trpc } from "@/src/lib/trpc";
import { useStreamStore } from "@/src/lib/store";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatElapsed(seconds: number): string {
	const d = Math.floor(seconds / 86400);
	const h = Math.floor((seconds % 86400) / 3600);
	const m = Math.floor((seconds % 3600) / 60);
	const s = seconds % 60;
	if (d > 0) return `${d}d ${h}h ${m}m`;
	if (h > 0) return `${h}h ${m}m ${s}s`;
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
		{ enabled: !!id }
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

	// Auto-scroll only on first load or when new messages arrive (not on every poll)
	const prevMessageCount = useRef(0);
	useEffect(() => {
		if (displayMessages.length > prevMessageCount.current) {
			// Only auto-scroll if count actually increased
			if (prevMessageCount.current === 0) {
				// First load — scroll without animation
				setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 100);
			} else {
				// New message — scroll with animation
				setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
			}
			prevMessageCount.current = displayMessages.length;
		}
	}, [displayMessages.length]);

	if (!session) {
		return (
			<View className="flex-1 bg-surface-page justify-center items-center">
				<Text className="font-dm-sans text-md text-ink-tertiary">Loading session...</Text>
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
			className="flex-1 bg-surface-page"
			behavior={Platform.OS === "ios" ? "padding" : undefined}
		>
			{/* ── Header ──────────────────────────────────────────────── */}
			<View
				className="bg-surface-page border-b"
				style={{
					paddingTop: insets.top,
					borderBottomColor: "rgba(0,0,0,0.06)",
				}}
			>
				{/* Row 1: Back + Title + Elapsed */}
				<View className="flex-row items-center px-4 pt-2 pb-1.5">
					<Pressable onPress={() => router.back()} hitSlop={12} className="mr-2">
						<Feather name="chevron-left" size={24} color="#292524" />
					</Pressable>
					<Pressable
						onPress={() => session.initialPrompt && setShowPrompt(!showPrompt)}
						className="flex-1 flex-row items-center gap-1"
					>
						<Text
							className="font-dm-sans text-xl font-bold text-ink-dark flex-1"
							numberOfLines={showPrompt ? undefined : 1}
						>
							{session.name}
						</Text>
						{session.initialPrompt && session.initialPrompt.length > 40 && (
							<Feather name={showPrompt ? "chevron-up" : "chevron-down"} size={16} color="#A8A29E" />
						)}
					</Pressable>
					<Text className="font-jetbrains text-md font-bold text-ink-dark">
						{formatElapsed(elapsedSeconds)}
					</Text>
				</View>

				{/* Row 2: Repo + Mode + (Error pill) */}
				<View className="flex-row items-center px-12 gap-2 pb-[10px]">
					<Text className="font-jetbrains text-sm text-ink-secondary">
						{session.repoName}
					</Text>
					<ModeBadge mode={session.mode} />
					{isError && <StatusPill status={uiStatus as any} />}
				</View>

				{/* Expanded prompt */}
				{showPrompt && session.initialPrompt && (
					<View className="px-4 pb-[10px]">
						<View className="bg-surface-card rounded-md p-3">
							<Text className="font-dm-sans text-base text-ink-dark leading-[18px]">
								{session.initialPrompt}
							</Text>
						</View>
					</View>
				)}

				{/* Row 3: Action buttons */}
				{(isActive || isError) && (
					<View className="flex-row px-4 gap-[10px] pb-3">
						{isError ? (
							<Pressable
								onPress={() => sendMessage.mutate({ id: session.id, message: "Continue from where you left off." })}
								className="flex-1 h-9 rounded flex-row items-center justify-center gap-1.5"
								style={({ pressed }) => ({
									backgroundColor: pressed ? "#0F9380" : "#14B8A6",
								})}
							>
								<Feather name="refresh-cw" size={14} color="#FFFFFF" />
								<Text className="font-dm-sans text-base font-semibold text-white">
									Retry
								</Text>
							</Pressable>
						) : (
							<>
								<Pressable
									onPress={() => pauseMutation.mutate({ id: session.id })}
									className="flex-1 h-9 rounded flex-row items-center justify-center gap-1.5"
									style={({ pressed }) => ({
										backgroundColor: pressed ? "rgba(217, 119, 6, 0.2)" : "rgba(217, 119, 6, 0.12)",
									})}
								>
									<Feather name="pause" size={14} color="#D97706" />
									<Text className="font-dm-sans text-base font-semibold text-status-waiting">
										Pause
									</Text>
								</Pressable>
								<Pressable
									onPress={() => cancelMutation.mutate({ id: session.id })}
									className="flex-1 h-9 rounded flex-row items-center justify-center gap-1.5"
									style={({ pressed }) => ({
										backgroundColor: pressed ? "rgba(220, 38, 38, 0.2)" : "rgba(220, 38, 38, 0.12)",
									})}
								>
									<Feather name="x" size={14} color="#DC2626" />
									<Text className="font-dm-sans text-base font-semibold text-status-error">
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
				className="flex-1"
				contentContainerStyle={{
					padding: 16,
					gap: 12,
					paddingBottom: 24,
				}}
				showsVerticalScrollIndicator={false}
			>
				{displayMessages.map((msg, i) => {
					switch (msg.type) {
						case "user": {
							const text = typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content);
							if (!text || text === '""') return null;
							return <UserBubble key={i} content={text} />;
						}
						case "assistant": {
							const text = typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content);
							if (!text || text === '""') return null;
							return <MessageBubble key={i} content={text} />;
						}
						case "tool_use": {
							const content = msg.content as any;
							// Find matching tool_result in subsequent messages
							const toolResult = displayMessages.find(
								(m) => m.type === "tool_result" && (m.content as any)?.tool_use_id === content.id,
							);
							return (
								<ToolCard
									key={i}
									type={content.tool ?? "Bash"}
									title={content.tool ?? "Tool"}
									detail={content.input?.file_path ?? content.input?.command ?? content.input?.pattern ?? ""}
									result={toolResult ? {
										status: (toolResult.content as any)?.is_error ? "error" : "success",
										output: typeof (toolResult.content as any)?.content === "string"
											? (toolResult.content as any).content
											: JSON.stringify((toolResult.content as any)?.content ?? ""),
									} : undefined}
								/>
							);
						}
						case "tool_result":
							// Rendered inline with tool_use above
							return null;
						case "result": {
							const text = typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content);
							return <ResultSummary key={i} content={text} />;
						}
						case "approval_request": {
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
						default:
							return null;
					}
				})}
			</ScrollView>

			{/* ── Bottom Section ──────────────────────────────────────── */}
			<View
				className="border-t"
				style={{
					borderTopColor: "rgba(0,0,0,0.06)",
					paddingBottom: insets.bottom || 16,
				}}
			>
				{showInput ? (
					<View className="flex-row items-center px-4 pt-3 gap-[10px]">
						<TextInput
							value={inputText}
							onChangeText={setInputText}
							placeholder="Send a message..."
							placeholderTextColor="#A8A29E"
							className="flex-1 h-10 bg-surface-card rounded-full px-4 font-dm-sans text-md text-ink-dark"
							returnKeyType="send"
							onSubmitEditing={handleSend}
						/>
						<Pressable
							onPress={handleSend}
							className="w-10 h-10 rounded-full items-center justify-center"
							style={({ pressed }) => ({
								backgroundColor: pressed ? "#D35407" : "#EA580C",
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
