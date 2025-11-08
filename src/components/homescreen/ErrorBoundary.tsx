// components/common/ErrorBoundary.tsx
import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";

interface Props {
  error: string | null;
  onRetry: () => void | Promise<void>;
}

export const ErrorBoundary: React.FC<Props> = ({ error, onRetry }) => {
  if (!error) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Something went wrong</Text>
      <Text style={styles.message}>{error}</Text>
      <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
        <Text style={styles.retryText}>Try Again</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20 },
  title: { fontSize: 18, fontWeight: "700", marginBottom: 10, color: "#FF3B30" },
  message: { fontSize: 14, color: "#444", marginBottom: 20, textAlign: "center" },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#4361EE",
  },
  retryText: { color: "#FFF", fontWeight: "600" },
});
