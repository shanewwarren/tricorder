import { Feather } from "@expo/vector-icons";
import React, { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// TODO: Replace mock data with tRPC queries
// const { data: config } = trpc.config.get.useQuery();
// const { data: plugins } = trpc.config.plugins.useQuery();
// const { data: mcpServers } = trpc.config.mcpServers.useQuery();

type Mode = "autonomous" | "interactive";

const MOCK_CONFIG = {
	tailscaleIp: "100.64.1.42",
	port: "3284",
	connected: true,
	scanDirectory: "~/code/",
	defaultMode: "autonomous" as Mode,
};

const MOCK_PLUGINS = [
	{ name: "superpowers", enabled: true },
	{ name: "code-review", enabled: true },
];

const MOCK_MCP_SERVERS = [
	{ name: "filesystem", subtitle: "Local file access" },
	{ name: "github", subtitle: "GitHub API integration" },
];

function SectionHeader({ title }: { title: string }) {
	return (
		<Text
			style={{
				fontFamily: "JetBrains Mono",
				fontSize: 11,
				fontWeight: "700",
				color: "#A8A29E",
				letterSpacing: 1.5,
				textTransform: "uppercase",
				marginTop: 24,
				marginBottom: 10,
			}}
		>
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
		<View
			style={{
				flexDirection: "row",
				alignItems: "center",
				justifyContent: "space-between",
				paddingVertical: 14,
				borderBottomWidth: 1,
				borderBottomColor: "#F1F1F1",
			}}
		>
			<Text
				style={{
					fontFamily: "DM Sans",
					fontSize: 14,
					color: "#1C1917",
				}}
			>
				{label}
			</Text>
			{rightElement ??
				(value ? (
					<Text
						style={{
							fontFamily: "JetBrains Mono",
							fontSize: 14,
							color: "#1C1917",
						}}
					>
						{value}
					</Text>
				) : null)}
		</View>
	);
}

export default function SettingsScreen() {
	const insets = useSafeAreaInsets();
	const [defaultMode, setDefaultMode] = useState<Mode>(MOCK_CONFIG.defaultMode);

	// Toggle this to see the first-run variant
	const isConnected = MOCK_CONFIG.connected;

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
						paddingBottom: 12,
						gap: 12,
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
						Settings
					</Text>
				</View>

				{/* First-run welcome banner */}
				{!isConnected && (
					<View
						style={{
							backgroundColor: "#EA580C",
							borderRadius: 16,
							padding: 20,
							marginBottom: 8,
						}}
					>
						<Text
							style={{
								fontFamily: "DM Sans",
								fontSize: 18,
								fontWeight: "700",
								color: "#FFFFFF",
								marginBottom: 4,
							}}
						>
							Welcome to Tricorder
						</Text>
						<Text
							style={{
								fontFamily: "DM Sans",
								fontSize: 14,
								color: "rgba(255,255,255,0.85)",
								marginBottom: 14,
							}}
						>
							Connect to your server to start managing Claude Code sessions remotely.
						</Text>
						<Pressable
							style={{
								backgroundColor: "#FFFFFF",
								borderRadius: 12,
								paddingVertical: 10,
								alignItems: "center",
								flexDirection: "row",
								justifyContent: "center",
								gap: 6,
							}}
						>
							<Feather name="link" size={16} color="#EA580C" />
							<Text
								style={{
									fontFamily: "DM Sans",
									fontSize: 14,
									fontWeight: "700",
									color: "#EA580C",
								}}
							>
								Connect Server
							</Text>
						</Pressable>
					</View>
				)}

				{/* SERVER CONNECTION */}
				<SectionHeader title="Server Connection" />
				<View
					style={{
						backgroundColor: isConnected ? "#F1F1F1" : "#FFFFFF",
						borderRadius: 12,
						paddingHorizontal: 14,
						borderWidth: isConnected ? 0 : 1,
						borderColor: "#E7E5E4",
					}}
				>
					<SettingRow
						label="Tailscale IP"
						value={isConnected ? MOCK_CONFIG.tailscaleIp : undefined}
						rightElement={
							!isConnected ? (
								<Text
									style={{
										fontFamily: "JetBrains Mono",
										fontSize: 14,
										color: "#A8A29E",
									}}
								>
									Enter IP address
								</Text>
							) : undefined
						}
					/>
					<SettingRow
						label="Port"
						value={isConnected ? MOCK_CONFIG.port : undefined}
						rightElement={
							!isConnected ? (
								<Text
									style={{
										fontFamily: "JetBrains Mono",
										fontSize: 14,
										color: "#A8A29E",
									}}
								>
									Enter port
								</Text>
							) : undefined
						}
					/>
					<SettingRow
						label="Status"
						rightElement={
							<View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
								<View
									style={{
										width: 8,
										height: 8,
										borderRadius: 4,
										backgroundColor: isConnected ? "#16A34A" : "#DC2626",
									}}
								/>
								<Text
									style={{
										fontFamily: "DM Sans",
										fontSize: 14,
										fontWeight: "600",
										color: isConnected ? "#16A34A" : "#DC2626",
									}}
								>
									{isConnected ? "Connected" : "Not connected"}
								</Text>
							</View>
						}
					/>
				</View>

				{/* SCAN DIRECTORY */}
				<SectionHeader title="Scan Directory" />
				<Pressable
					style={{
						backgroundColor: "#F1F1F1",
						borderRadius: 12,
						paddingHorizontal: 14,
						paddingVertical: 14,
						flexDirection: "row",
						alignItems: "center",
						justifyContent: "space-between",
					}}
				>
					<Text
						style={{
							fontFamily: "JetBrains Mono",
							fontSize: 14,
							color: isConnected ? "#1C1917" : "#A8A29E",
						}}
					>
						{isConnected ? MOCK_CONFIG.scanDirectory : "Select a directory..."}
					</Text>
					<Feather name="chevron-right" size={18} color="#78716C" />
				</Pressable>

				{/* DEFAULT MODE */}
				<SectionHeader title="Default Mode" />
				<View style={{ flexDirection: "row", gap: 10 }}>
					<Pressable
						onPress={() => setDefaultMode("autonomous")}
						style={{
							flex: 1,
							backgroundColor: defaultMode === "autonomous" ? "#1C1917" : "#F1F1F1",
							borderRadius: 10,
							paddingVertical: 10,
							flexDirection: "row",
							alignItems: "center",
							justifyContent: "center",
							gap: 6,
						}}
					>
						<Feather name="zap" size={14} color={defaultMode === "autonomous" ? "#FFFFFF" : "#78716C"} />
						<Text
							style={{
								fontFamily: "DM Sans",
								fontSize: 13,
								fontWeight: "600",
								color: defaultMode === "autonomous" ? "#FFFFFF" : "#1C1917",
							}}
						>
							Autonomous
						</Text>
					</Pressable>
					<Pressable
						onPress={() => setDefaultMode("interactive")}
						style={{
							flex: 1,
							backgroundColor: defaultMode === "interactive" ? "#1C1917" : "#F1F1F1",
							borderRadius: 10,
							paddingVertical: 10,
							flexDirection: "row",
							alignItems: "center",
							justifyContent: "center",
							gap: 6,
						}}
					>
						<Feather name="eye" size={14} color={defaultMode === "interactive" ? "#FFFFFF" : "#78716C"} />
						<Text
							style={{
								fontFamily: "DM Sans",
								fontSize: 13,
								fontWeight: "600",
								color: defaultMode === "interactive" ? "#FFFFFF" : "#1C1917",
							}}
						>
							Interactive
						</Text>
					</Pressable>
				</View>

				{/* PLUGINS */}
				<SectionHeader title="Plugins" />
				{isConnected ? (
					<View
						style={{
							backgroundColor: "#F1F1F1",
							borderRadius: 12,
							paddingHorizontal: 14,
						}}
					>
						{MOCK_PLUGINS.map((plugin, i) => (
							<View
								key={plugin.name}
								style={{
									flexDirection: "row",
									alignItems: "center",
									paddingVertical: 14,
									borderBottomWidth: i < MOCK_PLUGINS.length - 1 ? 1 : 0,
									borderBottomColor: "#E7E5E4",
									gap: 10,
								}}
							>
								<Feather name="package" size={16} color="#1C1917" />
								<Text
									style={{
										fontFamily: "DM Sans",
										fontSize: 14,
										color: "#1C1917",
										flex: 1,
									}}
								>
									{plugin.name}
								</Text>
								<View
									style={{
										backgroundColor: "rgba(20, 184, 166, 0.12)",
										borderRadius: 6,
										paddingHorizontal: 8,
										paddingVertical: 3,
									}}
								>
									<Text
										style={{
											fontFamily: "DM Sans",
											fontSize: 11,
											fontWeight: "600",
											color: "#14B8A6",
										}}
									>
										Enabled
									</Text>
								</View>
							</View>
						))}
					</View>
				) : (
					<View
						style={{
							backgroundColor: "#F1F1F1",
							borderRadius: 12,
							padding: 20,
							alignItems: "center",
						}}
					>
						<Feather name="package" size={20} color="#A8A29E" style={{ marginBottom: 6 }} />
						<Text
							style={{
								fontFamily: "DM Sans",
								fontSize: 13,
								color: "#A8A29E",
							}}
						>
							No plugins configured
						</Text>
					</View>
				)}

				{/* MCP SERVERS */}
				{isConnected && (
					<>
						<SectionHeader title="MCP Servers" />
						<View
							style={{
								backgroundColor: "#F1F1F1",
								borderRadius: 12,
								paddingHorizontal: 14,
							}}
						>
							{MOCK_MCP_SERVERS.map((server, i) => (
								<View
									key={server.name}
									style={{
										flexDirection: "row",
										alignItems: "center",
										paddingVertical: 14,
										borderBottomWidth: i < MOCK_MCP_SERVERS.length - 1 ? 1 : 0,
										borderBottomColor: "#E7E5E4",
										gap: 10,
									}}
								>
									<Feather name="server" size={16} color="#1C1917" />
									<View style={{ flex: 1 }}>
										<Text
											style={{
												fontFamily: "DM Sans",
												fontSize: 14,
												color: "#1C1917",
											}}
										>
											{server.name}
										</Text>
										<Text
											style={{
												fontFamily: "DM Sans",
												fontSize: 12,
												color: "#78716C",
												marginTop: 2,
											}}
										>
											{server.subtitle}
										</Text>
									</View>
								</View>
							))}
						</View>
					</>
				)}
			</ScrollView>
		</View>
	);
}
