import { Feather } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { trpc } from "@/src/lib/trpc";
import { useTrpcContext } from "@/src/lib/TrpcProvider";

type Mode = "autonomous" | "interactive";

function SectionHeader({ title }: { title: string }) {
	return (
		<Text className="font-jetbrains text-xs font-bold text-tertiary tracking-[1.5px] uppercase mt-6 mb-[10px]">
			{title}
		</Text>
	);
}

function SettingRow({
	label,
	value,
	rightElement,
}: {
	label: string;
	value?: string;
	rightElement?: React.ReactNode;
}) {
	return (
		<View className="flex-row items-center justify-between py-3.5 border-b border-b-card">
			<Text className="font-dm-sans text-md text-primary">
				{label}
			</Text>
			{rightElement ??
				(value ? (
					<Text className="font-jetbrains text-md text-primary">
						{value}
					</Text>
				) : null)}
		</View>
	);
}

export default function SettingsScreen() {
	const insets = useSafeAreaInsets();
	const { data: config, isError } = trpc.config.get.useQuery();
	const isConnected = !!config && !isError;

	const { reconnect, serverUrl } = useTrpcContext();
	const [ipInput, setIpInput] = useState("");
	const [portInput, setPortInput] = useState("3141");
	const [editingConnection, setEditingConnection] = useState(false);

	const [selectedMode, setSelectedMode] = useState<Mode>("autonomous");
	const plugins = config?.plugins ?? [];
	const mcpServers = config?.mcpServers ?? {};

	useEffect(() => {
		if (config?.defaultMode) setSelectedMode(config.defaultMode);
	}, [config?.defaultMode]);

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
				<View className="flex-row items-center pt-4 pb-3 gap-3">
					<Text className="font-dm-sans text-4xl font-bold text-primary">
						Settings
					</Text>
				</View>

				{/* First-run welcome banner */}
				{!isConnected && (
					<View className="bg-primary rounded-2xl p-5 mb-2">
						<Text className="font-dm-sans text-2xl font-bold text-white mb-1">
							Welcome to Tricorder
						</Text>
						<Text
							className="font-dm-sans text-md mb-3.5"
							style={{ color: "rgba(255,255,255,0.85)" }}
						>
							Connect to your server to start managing Claude Code sessions remotely.
						</Text>
						<Pressable
							onPress={() => setEditingConnection(true)}
							className="bg-elevated rounded-lg py-[10px] items-center flex-row justify-center gap-1.5"
						>
							<Feather name="link" size={16} color="#EA580C" />
							<Text className="font-dm-sans text-md font-bold text-primary">
								Connect Server
							</Text>
						</Pressable>
					</View>
				)}

				{/* SERVER CONNECTION */}
				<SectionHeader title="Server Connection" />
				<View
					className="rounded-lg px-3.5"
					style={{
						backgroundColor: isConnected ? "#F1F1F1" : "#FFFFFF",
						borderWidth: isConnected ? 0 : 1,
						borderColor: "#E7E5E4",
					}}
				>
					<SettingRow
						label="Tailscale IP"
						value={isConnected ? config?.host ?? "" : undefined}
						rightElement={
							!isConnected ? (
								<Text className="font-jetbrains text-md text-tertiary">
									Enter IP address
								</Text>
							) : undefined
						}
					/>
					<SettingRow
						label="Port"
						value={isConnected ? String(config?.port ?? 3141) : undefined}
						rightElement={
							!isConnected ? (
								<Text className="font-jetbrains text-md text-tertiary">
									Enter port
								</Text>
							) : undefined
						}
					/>
					<SettingRow
						label="Status"
						rightElement={
							<View className="flex-row items-center gap-1.5">
								<View
									className="w-2 h-2 rounded-full"
									style={{
										backgroundColor: isConnected ? "#16A34A" : "#DC2626",
									}}
								/>
								<Text
									className="font-dm-sans text-md font-semibold"
									style={{
										color: isConnected ? "#16A34A" : "#DC2626",
									}}
								>
									{isConnected ? "Connected" : "Not connected"}
								</Text>
							</View>
						}
					/>
				</View>

				{(!isConnected || editingConnection) && (
					<View className="mt-3 gap-[10px]">
						<TextInput
							value={ipInput}
							onChangeText={setIpInput}
							placeholder="100.x.x.x"
							placeholderTextColor="#A8A29E"
							className="border border-border-default rounded-lg p-3.5 font-jetbrains text-md text-primary"
						/>
						<TextInput
							value={portInput}
							onChangeText={setPortInput}
							placeholder="3141"
							placeholderTextColor="#A8A29E"
							keyboardType="number-pad"
							className="border border-border-default rounded-lg p-3.5 font-jetbrains text-md text-primary"
						/>
						<Pressable
							onPress={() => {
								if (!ipInput.trim()) return;
								const url = `http://${ipInput.trim()}:${portInput || "3141"}`;
								reconnect(url);
								setEditingConnection(false);
							}}
							className="bg-primary rounded-lg py-3 items-center"
						>
							<Text className="font-dm-sans text-md font-bold text-white">
								Connect
							</Text>
						</Pressable>
					</View>
				)}

				{isConnected && !editingConnection && (
					<Pressable onPress={() => setEditingConnection(true)} className="mt-2">
						<Text className="font-dm-sans text-base text-primary">
							Change server
						</Text>
					</Pressable>
				)}

				{/* SCAN DIRECTORY */}
				<SectionHeader title="Scan Directory" />
				<Pressable className="bg-card rounded-lg px-3.5 py-3.5 flex-row items-center justify-between">
					<Text
						className="font-jetbrains text-md"
						style={{ color: isConnected ? "#1C1917" : "#A8A29E" }}
					>
						{isConnected ? config?.scanDirectory ?? "" : "Select a directory..."}
					</Text>
					<Feather name="chevron-right" size={18} color="#78716C" />
				</Pressable>

				{/* DEFAULT MODE */}
				<SectionHeader title="Default Mode" />
				<View className="flex-row gap-[10px]">
					<Pressable
						onPress={() => setSelectedMode("autonomous")}
						className="flex-1 rounded-md py-[10px] flex-row items-center justify-center gap-1.5"
						style={{
							backgroundColor: selectedMode === "autonomous" ? "#1C1917" : "#F1F1F1",
						}}
					>
						<Feather name="zap" size={14} color={selectedMode === "autonomous" ? "#FFFFFF" : "#78716C"} />
						<Text
							className="font-dm-sans text-base font-semibold"
							style={{
								color: selectedMode === "autonomous" ? "#FFFFFF" : "#1C1917",
							}}
						>
							Autonomous
						</Text>
					</Pressable>
					<Pressable
						onPress={() => setSelectedMode("interactive")}
						className="flex-1 rounded-md py-[10px] flex-row items-center justify-center gap-1.5"
						style={{
							backgroundColor: selectedMode === "interactive" ? "#1C1917" : "#F1F1F1",
						}}
					>
						<Feather name="eye" size={14} color={selectedMode === "interactive" ? "#FFFFFF" : "#78716C"} />
						<Text
							className="font-dm-sans text-base font-semibold"
							style={{
								color: selectedMode === "interactive" ? "#FFFFFF" : "#1C1917",
							}}
						>
							Interactive
						</Text>
					</Pressable>
				</View>

				{/* PLUGINS */}
				<SectionHeader title="Plugins" />
				{plugins.length > 0 ? (
					<View className="bg-card rounded-lg px-3.5">
						{plugins.map((plugin: string, i: number, arr: string[]) => (
							<View
								key={plugin}
								className="flex-row items-center py-3.5 gap-[10px]"
								style={{
									borderBottomWidth: i < arr.length - 1 ? 1 : 0,
									borderBottomColor: "#E7E5E4",
								}}
							>
								<Feather name="package" size={16} color="#1C1917" />
								<Text className="font-dm-sans text-md text-primary flex-1">
									{plugin}
								</Text>
								<View className="bg-teal/[0.12] rounded-sm px-2 py-[3px]">
									<Text className="font-dm-sans text-xs font-semibold text-teal">
										Enabled
									</Text>
								</View>
							</View>
						))}
					</View>
				) : (
					<View className="bg-card rounded-lg p-5 items-center">
						<Feather name="package" size={20} color="#A8A29E" style={{ marginBottom: 6 }} />
						<Text className="font-dm-sans text-base text-tertiary">
							No plugins configured
						</Text>
					</View>
				)}

				{/* MCP SERVERS */}
				{isConnected && (
					<>
						<SectionHeader title="MCP Servers" />
						{Object.keys(mcpServers).length === 0 ? (
							<View className="bg-card rounded-lg p-5 items-center">
								<Feather name="server" size={20} color="#A8A29E" style={{ marginBottom: 6 }} />
								<Text className="font-dm-sans text-base text-tertiary">
									No MCP servers configured
								</Text>
							</View>
						) : (
							<View className="bg-card rounded-lg px-3.5">
								{Object.entries(mcpServers).map(([name, server], i, arr) => (
									<View
										key={name}
										className="flex-row items-center py-3.5 gap-[10px]"
										style={{
											borderBottomWidth: i < arr.length - 1 ? 1 : 0,
											borderBottomColor: "#E7E5E4",
										}}
									>
										<Feather name="server" size={16} color="#1C1917" />
										<View className="flex-1">
											<Text className="font-dm-sans text-md text-primary">{name}</Text>
											<Text className="font-dm-sans text-sm text-secondary mt-0.5">
												{server.command}
											</Text>
										</View>
									</View>
								))}
							</View>
						)}
					</>
				)}
			</ScrollView>
		</View>
	);
}
