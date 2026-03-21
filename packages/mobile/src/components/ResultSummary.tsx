import { Feather } from "@expo/vector-icons";
import React from "react";
import { Text, View } from "react-native";

interface ResultSummaryProps {
  content: string;
  cost?: number;
}

export function ResultSummary({ content, cost }: ResultSummaryProps) {
  return (
    <View
      style={{
        backgroundColor: "#F1F1F1",
        borderRadius: 14,
        borderLeftWidth: 3,
        borderLeftColor: "#16A34A",
        padding: 16,
        gap: 8,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        <Feather name="check-circle" size={16} color="#16A34A" />
        <Text
          style={{
            fontFamily: "DMSans_600SemiBold",
            fontSize: 12,
            color: "#16A34A",
          }}
        >
          Result
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
      {cost != null && (
        <Text
          style={{
            fontFamily: "JetBrainsMono_400Regular",
            fontSize: 11,
            color: "#78716C",
          }}
        >
          ${cost.toFixed(4)}
        </Text>
      )}
    </View>
  );
}
