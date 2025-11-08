// components/common/LoadingState.tsx
import React from "react";
import { View, ActivityIndicator, StyleSheet, Text } from "react-native";

export const LoadingState = () => {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#4361EE" />
      <Text style={styles.text}>Loading...</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFF",
  },
  text: {
    marginTop: 10,
    fontSize: 16,
    color: "#555",
    fontWeight: "500",
  },
});
