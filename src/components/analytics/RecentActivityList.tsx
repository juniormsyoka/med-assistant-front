import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { LogEntry } from "../../models/LogEntry";
import { getStatusColor, formatDate, formatTime } from "../../utils/analyticsUtils";

interface Props {
  logs: LogEntry[];
  colors: any;
}

const RecentActivityList: React.FC<Props> = ({ logs, colors }) => (
  <View style={[styles.card, { backgroundColor: colors.card }]}>
    <Text style={[styles.title, { color: colors.text }]}>Recent Activity</Text>
    {logs.length === 0 ? (
      <Text style={[styles.emptyText, { color: colors.text }]}>
        No activity recorded yet
      </Text>
    ) : (
      logs.slice(0, 7).map((log) => (
        <View
          key={log.id}
          style={[styles.logItem, { borderBottomColor: colors.border }]}
        >
          <View style={styles.logInfo}>
            <Text style={[styles.medName, { color: colors.text }]}>
              {log.medicationName}
            </Text>
            <Text style={[styles.logTime, { color: colors.text }]}>
              {formatDate(log.scheduledTime)} at {formatTime(log.scheduledTime)}
            </Text>
          </View>
          <Text style={[styles.status, { color: getStatusColor(log.status) }]}>
            {log.status.toUpperCase()}
          </Text>
        </View>
      ))
    )}
  </View>
);

const styles = StyleSheet.create({
  card: { padding: 16, borderRadius: 12, marginBottom: 16, elevation: 1 },
  title: { fontSize: 18, fontWeight: "bold", marginBottom: 12 },
  emptyText: { textAlign: "center", fontStyle: "italic", padding: 20 },
  logItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  logInfo: { flex: 1 },
  medName: { fontSize: 16, fontWeight: "600", marginBottom: 4 },
  logTime: { fontSize: 12 },
  status: { fontSize: 12, fontWeight: "bold" },
});

export default RecentActivityList;
