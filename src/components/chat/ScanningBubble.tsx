import { ActivityIndicator } from "react-native";
import React from "react";
import { View, Text } from "react-native";

export const ScanningBubble = () => (
  <View style={{
    backgroundColor: '#F1F1F1',
    borderRadius: 16,
    padding: 12,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center'
  }}>
    <ActivityIndicator size="small" color="#4361EE" />
    <Text style={{ marginLeft: 8 }}>Scanning prescription…</Text>
  </View>
);
