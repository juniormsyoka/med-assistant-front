// components/homescreen/StatsSection.tsx
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "@react-navigation/native";

interface Stats {
  total: number;
  taken: number;
  missed: number;
  snoozed: number;
  skipped: number;
  late: number;
  rescheduled: number;
}

interface Props {
  stats: Stats;
}

const StatsSection: React.FC<Props> = ({ stats }) => {
  const { colors } = useTheme();

  return (
    <>
      <View style={styles.statsContainer}>
        <View style={[styles.statCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.statNumber, { color: colors.primary }]}>
            {stats.total}
          </Text>
          <Text style={[styles.statLabel, { color: colors.text }]}>
            Total Doses
          </Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.statNumber, { color: "#4CAF50" }]}>{stats.taken}</Text>
          <Text style={[styles.statLabel, { color: colors.text }]}>Taken</Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.statNumber, { color: "#FF3B30" }]}>{stats.missed}</Text>
          <Text style={[styles.statLabel, { color: colors.text }]}>Missed</Text>
        </View>
      </View>

      <View style={styles.statsContainer}>
        <View style={[styles.statCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.statNumber, { color: "#FF9800" }]}>{stats.snoozed}</Text>
          <Text style={[styles.statLabel, { color: colors.text }]}>Snoozed</Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.statNumber, { color: "#9C27B0" }]}>{stats.skipped}</Text>
          <Text style={[styles.statLabel, { color: colors.text }]}>Skipped</Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.statNumber, { color: "#2196F3" }]}>{stats.late}</Text>
          <Text style={[styles.statLabel, { color: colors.text }]}>Late</Text>
        </View>
      </View>

      <View style={[styles.statCard, { backgroundColor: colors.card, marginBottom: 16 }]}>
        <Text style={[styles.statNumber, { color: "#607D8B" }]}>{stats.rescheduled}</Text>
        <Text style={[styles.statLabel, { color: colors.text }]}>Rescheduled</Text>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginHorizontal: 4,
    elevation: 1,
  },
  statNumber: { fontSize: 24, fontWeight: "bold", marginBottom: 4 },
  statLabel: { fontSize: 12, textAlign: "center" },
});

export default StatsSection;
