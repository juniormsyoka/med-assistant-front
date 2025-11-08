import React from "react";
import { View, Text, StyleSheet } from "react-native";

interface Props {
  adherence: number;
  colors: any;
}

const AdherenceCard: React.FC<Props> = ({ adherence, colors }) => (
  <View style={[styles.adherenceCard, { backgroundColor: colors.card }]}>
    <Text style={[styles.adherenceTitle, { color: colors.text }]}>Adherence Rate</Text>
    <Text style={[styles.adherencePercentage, { color: colors.primary }]}>
      {adherence}%
    </Text>
    <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
      <View
        style={[
          styles.progressFill,
          { width: `${adherence}%`, backgroundColor: colors.primary },
        ]}
      />
    </View>
  </View>
);

const styles = StyleSheet.create({
  adherenceCard: {
    padding: 20,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 24,
    elevation: 1,
  },
  adherenceTitle: { fontSize: 16, fontWeight: "600", marginBottom: 8 },
  adherencePercentage: { fontSize: 32, fontWeight: "bold", marginBottom: 16 },
  progressBar: { width: "100%", height: 8, borderRadius: 4, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 4 },
});

export default AdherenceCard;
