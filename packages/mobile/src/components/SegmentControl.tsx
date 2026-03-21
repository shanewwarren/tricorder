import React from "react";
import { Pressable, Text, View } from "react-native";

interface SegmentControlProps {
	segments: string[];
	activeIndex: number;
	onPress: (index: number) => void;
}

export function SegmentControl({ segments, activeIndex, onPress }: SegmentControlProps) {
	return (
		<View className="bg-surface-card h-[38px] rounded-lg gap-1 p-1 flex-row">
			{segments.map((label, index) => {
				const isActive = index === activeIndex;
				return (
					<Pressable
						key={label}
						onPress={() => onPress(index)}
						className="flex-1 rounded items-center justify-center"
						style={{
							backgroundColor: isActive ? "#EA580C" : "transparent",
						}}
					>
						<Text
							className="font-dm-sans text-sm"
							style={{
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
