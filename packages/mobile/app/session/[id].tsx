import { ApprovalPrompt } from "@/src/components/ApprovalPrompt";
import { HandoffBanner } from "@/src/components/HandoffBanner";
import { MessageBubble } from "@/src/components/MessageBubble";
import { ModeBadge } from "@/src/components/ModeBadge";
import { CommandPicker } from "@/src/components/CommandPicker";
import { PlanCard } from "@/src/components/PlanCard";
import { ResultSummary } from "@/src/components/ResultSummary";
import { StatusPill } from "@/src/components/StatusPill";
import { ToolCard } from "@/src/components/ToolCard";
import { UserBubble } from "@/src/components/UserBubble";
import { trpc } from "@/src/lib/trpc";
import { useStreamStore } from "@/src/lib/store";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { FlashList } from "@shopify/flash-list";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Image, KeyboardAvoidingView, Modal, Platform, Pressable, Text, TextInput, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
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

function formatMessageTime(iso: string): string {
	if (!iso) return "";
	const d = new Date(iso);
	return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function SessionScreen() {
	const { id } = useLocalSearchParams<{ id: string }>();
	const router = useRouter();
	const insets = useSafeAreaInsets();
	const listRef = useRef<FlashList<any>>(null);
	const [inputText, setInputText] = useState("");
	const [now, setNow] = useState(Date.now());
	const [showPrompt, setShowPrompt] = useState(false);
	const [showHandoffSheet, setShowHandoffSheet] = useState(false);
	const [showCommandPicker, setShowCommandPicker] = useState(false);
	const [selectedImage, setSelectedImage] = useState<string | null>(null);

	const initStream = useStreamStore((s) => s.initStream);
	const addMessage = useStreamStore((s) => s.addMessage);
	const setConnected = useStreamStore((s) => s.setConnected);
	const clearStream = useStreamStore((s) => s.clearStream);
	const stream = useStreamStore((s) => s.streams[id!]);

	const { data: sessionData } = trpc.sessions.detail.useQuery(
		{ id: id! },
		{ enabled: !!id, refetchInterval: 10000 }
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
	const approveMutation = trpc.sessions.approve.useMutation();
	const denyMutation = trpc.sessions.deny.useMutation();

	// Handoff query - only when session is not active
	const { data: handoff } = trpc.sessions.handoff.useQuery(
		{ id: id! },
		{ enabled: !!session && session.status !== "active" }
	);

	// Merge stream and query messages, deduplicate and sort by timestamp
	const displayMessages = useMemo(() => {
		const all = [...messages, ...(stream?.messages ?? [])];

		// Deduplicate by content+timestamp (since indices aren't reliable across sources)
		const seen = new Set<string>();
		const deduped: typeof messages = [];
		for (const msg of all) {
			const ts = (msg as any).timestamp ?? "";
			const contentStr = typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content ?? "");
			const key = `${msg.type}:${ts}:${contentStr.slice(0, 50)}`;
			if (!seen.has(key)) {
				seen.add(key);
				deduped.push(msg);
			}
		}

		// Sort by timestamp to ensure correct order
		return deduped.sort((a, b) => {
			const ta = (a as any).timestamp ?? "";
			const tb = (b as any).timestamp ?? "";
			if (!ta || !tb) return 0;
			return ta.localeCompare(tb);
		});
	}, [stream?.messages, messages]);

	// Always scroll to bottom when messages change
	useEffect(() => {
		if (displayMessages.length > 0) {
			setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 150);
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

	// Map server status to UI status for StatusPill
	const uiStatus = session.status === "active" ? "running" :
	                  session.status === "cancelled" ? "completed" :
	                  session.status;

	// Calculate elapsed time from createdAt
	const elapsedSeconds = isActive
		? Math.floor((now - new Date(session.createdAt).getTime()) / 1000)
		: Math.floor((new Date(session.updatedAt).getTime() - new Date(session.createdAt).getTime()) / 1000);

	const pickImage = async () => {
		const result = await ImagePicker.launchImageLibraryAsync({
			mediaTypes: ['images'],
			base64: true,
			quality: 0.7,
		});
		if (!result.canceled && result.assets[0].base64) {
			setSelectedImage(result.assets[0].base64);
		}
	};

	const handleSend = () => {
		if (!inputText.trim() && !selectedImage) return;
		sendMessage.mutate({ id: session.id, message: inputText.trim() });
		setInputText("");
		setSelectedImage(null);
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
			<FlashList
				ref={listRef}
				data={displayMessages.filter((m) => {
					if (m.type === "tool_result") return false;
					if (m.type === "user" || m.type === "assistant") {
						const text = typeof m.content === "string" ? m.content : JSON.stringify(m.content);
						if (!text || text === '""') return false;
					}
					if (!["user", "assistant", "tool_use", "result", "approval_request"].includes(m.type)) return false;
					return true;
				})}
				keyExtractor={(item, i) => `${item.type}-${(item as any).index ?? i}`}
				renderItem={({ item: msg }) => {
					const text = typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content);
					const timeLabel = formatMessageTime(msg.timestamp);

					let bubble: React.ReactNode;
					switch (msg.type) {
						case "user":
							bubble = <UserBubble content={text} />;
							break;
						case "assistant":
							bubble = <MessageBubble content={text} usage={(msg as any).usage} />;
							break;
						case "tool_use": {
							const content = msg.content as any;
							// Detect plan-related tool calls
							if (content.tool === "ExitPlanMode" && content.input?.plan) {
								bubble = <PlanCard content={content.input.plan} />;
								break;
							}
							if (content.tool === "Write" && content.input?.file_path?.includes("/.claude/plans/")) {
								const planTitle = content.input.file_path.split("/").pop() ?? "Plan";
								bubble = <PlanCard content={content.input.content} title={planTitle} />;
								break;
							}
							const toolResult = displayMessages.find(
								(m) => m.type === "tool_result" && (m.content as any)?.tool_use_id === content.id,
							);
							// Extract diff for Edit tools
							const editDiff = content.tool === "Edit" && content.input?.old_string && content.input?.new_string
								? {
									removed: content.input.old_string.split("\n"),
									added: content.input.new_string.split("\n"),
								}
								: undefined;
							// Extract result output
							const resultData = toolResult ? {
								status: (toolResult.content as any)?.is_error ? "error" as const : "success" as const,
								output: typeof (toolResult.content as any)?.content === "string"
									? (toolResult.content as any).content
									: JSON.stringify((toolResult.content as any)?.content ?? ""),
							} : undefined;
							bubble = (
								<ToolCard
									type={content.tool ?? "Bash"}
									title={content.tool ?? "Tool"}
									detail={content.input?.file_path ?? content.input?.command ?? content.input?.pattern ?? ""}
									diff={editDiff}
									result={resultData}
								/>
							);
							break;
						}
						case "result":
							bubble = <ResultSummary content={text} />;
							break;
						case "approval_request": {
							const content = msg.content as any;
							bubble = (
								<ApprovalPrompt
									action={content.description ?? content.title ?? "Pending approval"}
									onApprove={() => approveMutation.mutate({ id: session.id, toolUseId: content.toolUseId })}
									onDeny={() => denyMutation.mutate({ id: session.id, toolUseId: content.toolUseId })}
								/>
							);
							break;
						}
						default:
							bubble = <View />;
					}

					return (
						<View>
							{bubble}
							{timeLabel ? (
								<Text className="font-jetbrains text-2xs text-ink-tertiary mt-1 px-1">
									{timeLabel}
								</Text>
							) : null}
						</View>
					);
				}}
				estimatedItemSize={80}
				contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
				ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
				showsVerticalScrollIndicator={false}
				ListFooterComponent={
					isActive ? (
						<View className="p-4 mt-1">
							<View className="bg-ink-dark rounded-xl px-4 py-3 flex-row items-center gap-2 self-start">
								<Feather name="star" size={14} color="#EA580C" />
								<Text className="font-dm-sans text-sm text-white/70">Claude is thinking...</Text>
							</View>
						</View>
					) : null
				}
			/>

			{/* ── Bottom Section — Always show input ──────────────────── */}
			<View
				className="border-t"
				style={{
					borderTopColor: "rgba(0,0,0,0.06)",
					paddingBottom: insets.bottom || 16,
				}}
			>
				{selectedImage && (
					<View className="px-4 pt-2 flex-row items-center gap-2">
						<Image source={{ uri: `data:image/jpeg;base64,${selectedImage}` }} className="w-16 h-16 rounded-lg" />
						<Pressable onPress={() => setSelectedImage(null)}>
							<Feather name="x-circle" size={20} color="#A8A29E" />
						</Pressable>
					</View>
				)}
				<View className="flex-row items-center px-4 pt-3 gap-2">
					<Pressable
						onPress={() => setShowHandoffSheet(true)}
						className="w-10 h-10 rounded-full items-center justify-center bg-surface-card"
					>
						<Feather name="terminal" size={18} color="#78716C" />
					</Pressable>
					<Pressable
						onPress={() => setShowCommandPicker(true)}
						className="w-10 h-10 rounded-full items-center justify-center bg-surface-card"
					>
						<Text className="font-jetbrains text-lg font-bold text-primary">/</Text>
					</Pressable>
					<Pressable
						onPress={pickImage}
						className="w-10 h-10 rounded-full items-center justify-center bg-surface-card"
					>
						<Feather name="image" size={18} color="#78716C" />
					</Pressable>
					<TextInput
						value={inputText}
						onChangeText={setInputText}
						placeholder="Send a follow-up..."
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
			</View>

			{/* ── Handoff Sheet ──────────────────────────────────────── */}
			<Modal
				visible={showHandoffSheet}
				transparent
				animationType="slide"
				onRequestClose={() => setShowHandoffSheet(false)}
			>
				<Pressable
					className="flex-1"
					onPress={() => setShowHandoffSheet(false)}
				/>
				<View
					className="bg-surface-elevated rounded-t-2xl"
					style={{ paddingBottom: insets.bottom || 24 }}
				>
					<View className="items-center py-3">
						<View className="w-10 h-1 rounded-full bg-border-default" />
					</View>
					<HandoffBanner command={handoff?.resumeCommand ?? `claude --resume ${session.id}`} />
				</View>
			</Modal>

			{/* ── Command Picker ──────────────────────────────────────── */}
			<CommandPicker
				visible={showCommandPicker}
				onClose={() => setShowCommandPicker(false)}
				onSelect={(command) => {
					setInputText(command + " ");
					setShowCommandPicker(false);
				}}
			/>
		</KeyboardAvoidingView>
	);
}
