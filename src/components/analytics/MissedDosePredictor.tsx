import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import * as Notifications from "expo-notifications";
import { ComplianceTracker } from "../../Services/ComplianceTracker";
import { LogEntry } from "../../models/LogEntry";
import { formatTime } from "../../utils/analyticsUtils";

interface Props {
  logs: LogEntry[];
  colors: any;
  // Removed: medicationId, medicationName, scheduledTime - these will come from logs[0]
}

const MissedDosePredictor: React.FC<Props> = ({
  logs,
  colors
}) => {
  const [missRisk, setMissRisk] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [predictionDetails, setPredictionDetails] = useState<any>(null);
  const [confidence, setConfidence] = useState<number>(0);
  const [nextLog, setNextLog] = useState<LogEntry | null>(null);

  useEffect(() => {
    if (logs.length > 0) {
      const upcomingLog = logs[0]; // Get the next scheduled dose
      setNextLog(upcomingLog);
      fetchPrediction(upcomingLog);
    } else {
      setLoading(false);
      setMissRisk(0);
    }
  }, [logs]);

  const fetchPrediction = async (logEntry: LogEntry) => {
    if (!logEntry) {
      setMissRisk(0);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // Get context for prediction
      const userContext = await getUserContext(logEntry);

      // Call backend API
      const response = await fetch('http://your-backend-url/predict-adherence-risk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          medication_id: logEntry.medicationId,
          medication_name: logEntry.medicationName,
          scheduled_time: logEntry.scheduledTime,
          ...userContext
        })
      });

      const data = await response.json();
      if (data.success) {
        setMissRisk(data.prediction.miss_risk_percent || 0);
        setConfidence(data.prediction.confidence_percent || 0);
        setPredictionDetails(data.prediction);
      } else {
        setMissRisk(0);
      }
    } catch (error) {
      console.error('❌ Failed to fetch prediction:', error);
      setMissRisk(0);
    } finally {
      setLoading(false);
    }
  };

  const getUserContext = async (logEntry: LogEntry) => {
    if (!logEntry) return {};

    const records = await ComplianceTracker.getMedicationRecords(logEntry.medicationId);
    const latestRecord = records[records.length - 1];

    // Calculate time since last dose
    let timeSinceLastDose = 24;
    if (latestRecord?.actionTime && logEntry.scheduledTime) {
      const lastTime = new Date(latestRecord.actionTime).getTime();
      const schedTime = new Date(logEntry.scheduledTime).getTime();
      timeSinceLastDose = Math.round((schedTime - lastTime) / (1000 * 60 * 60));
    }

    // Battery level (placeholder - in real app, you'd get this from device)
    const batteryLevel = 80;

    return {
      battery_level: batteryLevel,
      location: latestRecord?.location || 'unknown',
      mood: latestRecord?.mood || 'unknown',
      timeSinceLastDose
    };
  };

  const scheduleExtraReminder = async () => {
    if (!nextLog) return;

    const scheduledDate = new Date(nextLog.scheduledTime);
    scheduledDate.setMinutes(scheduledDate.getMinutes() - 30);

    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Extra Reminder 💊",
        body: `Upcoming dose: ${nextLog.medicationName} at ${formatTime(nextLog.scheduledTime)}`,
      },
      trigger: { date: scheduledDate } as Notifications.NotificationTriggerInput,
    });

    Alert.alert("✅ Extra reminder scheduled 30 minutes before your next dose!");
  };

  // Show loading state
  if (loading) {
    return (
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <ActivityIndicator size="small" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.text }]}>
          Analyzing adherence patterns...
        </Text>
      </View>
    );
  }

  // Show no data state
  if (!nextLog || logs.length === 0) {
    return (
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <Text style={[styles.title, { color: colors.text }]}>
          🧠 AI-Powered Risk Assessment
        </Text>
        <Text style={[styles.text, { color: colors.text }]}>
          No upcoming doses to analyze
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.card, { backgroundColor: colors.card }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>
          🧠 AI-Powered Risk Assessment
        </Text>
        {confidence > 0 && (
          <Text style={[styles.confidence, { color: colors.text }]}>
            Confidence: {confidence}%
          </Text>
        )}
      </View>

      <Text style={[styles.text, { color: missRisk > 50 ? "#FF3B30" : colors.primary }]}>
        You are <Text style={styles.riskText}>{missRisk}%</Text> likely to miss your next dose
      </Text>

      {/* Medication info */}
      <Text style={[styles.medicationInfo, { color: colors.text }]}>
        Next: {nextLog.medicationName} at {formatTime(nextLog.scheduledTime)}
      </Text>

      {predictionDetails?.important_factors && (
        <View style={styles.factorsContainer}>
          <Text style={[styles.factorsTitle, { color: colors.text }]}>Key Risk Factors:</Text>
          {Object.entries(predictionDetails.important_factors).map(([factor, info]: any) => (
            <Text key={factor} style={[styles.factor, { color: colors.text }]}>
              • {factor}: {info.value} (Impact: {info.importance_percent || info.importance}%)
            </Text>
          ))}
        </View>
      )}

      {missRisk > 50 && nextLog && (
        <>
          <Text style={[styles.suggestion, { color: colors.text }]}>
            AI recommends an extra notification 30 mins before
          </Text>
          <TouchableOpacity
            style={[styles.notifyButton, { backgroundColor: missRisk > 70 ? "#FF3B30" : "#FFA726" }]}
            onPress={scheduleExtraReminder}
          >
            <Text style={styles.notifyText}>Set AI-Suggested Reminder</Text>
          </TouchableOpacity>
        </>
      )}

      {missRisk <= 30 && missRisk > 0 && (
        <Text style={[styles.lowRisk, { color: "#4CD964" }]}>
          ✅ Good adherence pattern detected
        </Text>
      )}

      {/* Fallback if API is not available */}
      {missRisk === 0 && confidence === 0 && (
        <Text style={[styles.fallbackText, { color: colors.text }]}>
          AI prediction service temporarily unavailable
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: { 
    padding: 20, 
    borderRadius: 12, 
    marginBottom: 24, 
    elevation: 1 
  },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 12 
  },
  title: { 
    fontSize: 16, 
    fontWeight: "600" 
  },
  confidence: { 
    fontSize: 12, 
    opacity: 0.7 
  },
  text: { 
    fontSize: 16, 
    fontWeight: "500", 
    marginBottom: 8 
  },
  riskText: { 
    fontWeight: "bold", 
    fontSize: 18 
  },
  medicationInfo: {
    fontSize: 14,
    opacity: 0.8,
    marginBottom: 12,
    fontStyle: 'italic'
  },
  factorsContainer: { 
    marginTop: 12, 
    padding: 12, 
    backgroundColor: 'rgba(0,0,0,0.05)', 
    borderRadius: 8, 
    marginBottom: 12 
  },
  factorsTitle: { 
    fontSize: 14, 
    fontWeight: "600", 
    marginBottom: 6 
  },
  factor: { 
    fontSize: 12, 
    marginBottom: 2 
  },
  suggestion: { 
    fontSize: 12, 
    fontStyle: "italic", 
    marginBottom: 12, 
    textAlign: 'center' 
  },
  notifyButton: { 
    paddingVertical: 12, 
    paddingHorizontal: 16, 
    borderRadius: 8, 
    marginBottom: 8 
  },
  notifyText: { 
    color: "#fff", 
    fontWeight: "600", 
    textAlign: 'center' 
  },
  lowRisk: { 
    fontSize: 14, 
    fontWeight: "500", 
    textAlign: 'center', 
    marginTop: 8 
  },
  loadingText: { 
    fontSize: 12, 
    marginTop: 8, 
    textAlign: 'center' 
  },
  fallbackText: {
    fontSize: 12,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 8,
    opacity: 0.7
  }
});

export default MissedDosePredictor;