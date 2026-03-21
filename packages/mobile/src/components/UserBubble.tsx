import { Feather } from "@expo/vector-icons";
import React from "react";
import { Text, View } from "react-native";

interface UserBubbleProps {
  content: string;
}

export function UserBubble({ content }: UserBubbleProps) {
  return (
    <View
      style={{
        backgroundColor: "#F1F1F1",
        borderRadius: 14,
        padding: 16,
        gap: 8,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        <Feather name="user" size={16} color="#78716C" />
        <Text
          style={{
            fontFamily: "DMSans_600SemiBold",
            fontSize: 12,
            color: "#78716C",
          }}
        >
          You
        </Text>
      </View>
      <Text
        style={{
          fontFamily: "DMSans_400Regular",
          fontSize: 13,
          color: "#292524",
          lineHeight: 13 * 1.6,
        }}
      >
        {content}
      </Text>
    </View>
  );
}
