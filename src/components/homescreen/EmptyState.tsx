// components/homescreen/EmptyState.tsx
import React from "react";
import { View, Text, Animated, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface Props {
  fadeAnim?: Animated.Value;
  theme: {
    primary: string;
    background: string;
    card: string;
    text: string;
    border: string;
    notification: string;
  };
  onAddMedication: () => void;
}

const EmptyState: React.FC<Props> = ({ fadeAnim, theme, onAddMedication }) => {
  return (
    <Animated.View
      style={{
        alignItems: "center",
        justifyContent: "center",
        padding: 40,
        borderRadius: 20,
        marginTop: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
        backgroundColor: theme.card,
        opacity: fadeAnim,
      }}
    >
      <View style={{ marginBottom: 16, opacity: 0.8 }}>
        <Ionicons name="medical-outline" size={80} color={theme.primary} />
      </View>
      <Text
        style={{
          fontSize: 20,
          fontWeight: "600",
          marginBottom: 8,
          textAlign: "center",
          color: theme.text,
        }}
      >
        No medications yet
      </Text>
      <Text
        style={{
          fontSize: 14,
          textAlign: "center",
          opacity: 0.7,
          lineHeight: 20,
          color: theme.text,
        }}
      >
        Add your first medication to get started with reminders
      </Text>

      <TouchableOpacity
        style={{
          marginTop: 20,
          paddingVertical: 12,
          paddingHorizontal: 24,
          backgroundColor: theme.primary,
          borderRadius: 12,
        }}
        onPress={onAddMedication}
      >
        <Text style={{ color: "#fff", fontWeight: "600", fontSize: 16 }}>
          Add Medication
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

export default EmptyState;
