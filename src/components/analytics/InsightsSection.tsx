import React from "react";
import { View, Text, StyleSheet } from "react-native";

interface Props {
  insight: string;
  colors: any;
}

const InsightsSection: React.FC<Props> = ({ insight, colors }) => (
  <View style={[styles.card, { backgroundColor: colors.card }]}>
    <Text style={[styles.title, { color: colors.text }]}>Medication Insights</Text>
    <Text style={{ color: colors.text, fontStyle: "italic" }}>
      {insight || "Loading personalized insights..."}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  card: { padding: 16, borderRadius: 12, marginBottom: 16, elevation: 1 },
  title: { fontSize: 18, fontWeight: "bold", marginBottom: 12 },
});

export default InsightsSection;
