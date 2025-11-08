import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import * as Notifications from "expo-notifications";
import { LogEntry } from "../../models/LogEntry";
import { formatDate, formatTime } from "../../utils/analyticsUtils";

interface Props {
  missRisk: number;
  logs: LogEntry[];
  colors: any;
}

const MissedDosePredictor: React.FC<Props> = ({ missRisk, logs, colors }) => {
  const nextLog = logs[0];

  return (
    <View style={[styles.card, { backgroundColor: colors.card }]}>
      <Text style={[styles.title, { color: colors.text }]}>Missed Dose Risk</Text>
      <Text
        style={[
          styles.text,
          { color: missRisk > 50 ? "#FF3B30" : colors.primary },
        ]}
      >
        You are {missRisk}% likely to miss your next dose of{" "}
        {nextLog?.medicationName || "your medication"} scheduled on{" "}
        {nextLog ? `${formatDate(nextLog.scheduledTime)} at ${formatTime(nextLog.scheduledTime)}` : "N/A"}.
      </Text>

      {missRisk > 50 && nextLog && (
        <>
          <Text style={[styles.suggestion, { color: colors.text }]}>
            Would you like an extra notification 30 mins before?
          </Text>
          <TouchableOpacity
            style={styles.notifyButton}
            onPress={async () => {
              const scheduledDate = new Date(nextLog.scheduledTime);
              scheduledDate.setMinutes(scheduledDate.getMinutes() - 30);

              await Notifications.scheduleNotificationAsync({
                content: {
                  title: "Extra Reminder 💊",
                  body: `Upcoming dose: ${nextLog.medicationName} at ${formatTime(
                    nextLog.scheduledTime
                  )}`,
                },
                trigger: { date: scheduledDate } as Notifications.NotificationTriggerInput,
              });

              alert("✅ Extra reminder scheduled 30 minutes before your next dose!");
            }}
          >
            <Text style={styles.notifyText}>Set Extra Reminder</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: { padding: 20, borderRadius: 12, marginBottom: 24, alignItems: "center", elevation: 1 },
  title: { fontSize: 16, fontWeight: "600", marginBottom: 8 },
  text: { fontSize: 16, fontWeight: "500", marginBottom: 8, textAlign: "center" },
  suggestion: { fontSize: 12, fontStyle: "italic", marginBottom: 12 },
  notifyButton: { backgroundColor: "#FF3B30", paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8 },
  notifyText: { color: "#fff", fontWeight: "600" },
});

export default MissedDosePredictor;
