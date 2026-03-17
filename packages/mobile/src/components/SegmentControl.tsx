import React from "react";
import { Pressable, Text, View } from "react-native";

interface SegmentControlProps {
	segments: string[];
	activeIndex: number;
	onPress: (index: number) => void;
}

export function SegmentControl({ segments, activeIndex, onPress }: SegmentControlProps) {
	return (
		<View
			style={{
				backgroundColor: "#F1F1F1",
				height: 38,
				borderRadius: 12,
				gap: 4,
				padding: 4,
				flexDirection: "row",
			}}
		>
			{segments.map((label, index) => {
				const isActive = index === activeIndex;
				return (
					<Pressable
						key={label}
						onPress={() => onPress(index)}
						style={{
							flex: 1,
							borderRadius: 8,
							alignItems: "center",
							justifyContent: "center",
							backgroundColor: isActive ? "#EA580C" : "transparent",
						}}
					>
						<Text
							style={{
								fontFamily: "DM Sans",
								fontSize: 12,
								fontWeight: isActive ? "600" : "500",
								color: isActive ? "#FFFFFF" : "#A8A29E",
							}}
						>
							{label}
						</Text>
					</Pressable>
				);
			})}
		</View>
	);
}
