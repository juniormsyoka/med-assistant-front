import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useTheme } from '@react-navigation/native';
import AppHeader from '../components/AppHeader';
import { getLogs } from '../Services/storage';
import { LogEntry, LogStatus } from '../models/LogEntry';
import * as Notifications from 'expo-notifications';
//import { TouchableOpacity } from 'react-native-gesture-handler';

const AnalyticsScreen = ({ navigation }: any) => {

  const [insight, setInsight] = useState<string>('');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    taken: 0,
    missed: 0,
    snoozed: 0,
    skipped: 0,
    late: 0,
    rescheduled: 0,
    adherence: 0,
  });
  const [missRisk, setMissRisk] = useState<number>(0);

  const { colors } = useTheme();

  const loadInsights = async (updatedStats: typeof stats, updatedLogs: LogEntry[]) => {
  try {
    const response = await fetch(
      "https://med-assistant-backend.onrender.com/api/insights",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stats: updatedStats, logs: updatedLogs }),
      }
    );
    const data = await response.json();
    setInsight(data.insight);
  } catch (err) {
    console.error("Error fetching insights:", err);
    setInsight("AI insights unavailable at the moment.");
  }
};


 const loadLogs = async () => {
  try {
    const logEntries = await getLogs(50);
    setLogs(logEntries);

    // Count each status
    const taken = logEntries.filter(log => log.status === "taken").length;
    const missed = logEntries.filter(log => log.status === "missed").length;
    const snoozed = logEntries.filter(log => log.status === "snoozed").length;
    const skipped = logEntries.filter(log => log.status === "skipped").length;
    const late = logEntries.filter(log => log.status === "late").length;
    const rescheduled = logEntries.filter(log => log.status === "rescheduled").length;

    const total = logEntries.length;

    // --- Adherence Calculation ---
    const adherenceScore = taken * 1 + late * 0.5;
    const adherence = total > 0 ? Math.round((adherenceScore / total) * 100) : 0;

    const updatedStats = {
      total,
      taken,
      missed,
      snoozed,
      skipped,
      late,
      rescheduled,
      adherence,
    };
    setStats(updatedStats);

    // --- Simple Missed Dose Predictor ---
    if (logEntries.length > 0) {
      const lastLog = logEntries[0]; // most recent dose
      const prob = predictMissProbability(lastLog);
      setMissRisk(Math.round(prob * 100));
    }

    // --- Fetch AI Insights from backend ---
    try {
      const response = await fetch(
        "https://med-assistant-backend.onrender.com/api/insights",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ stats: updatedStats, logs: logEntries }),
        }
      );

      if (!response.ok) {
        throw new Error(`Backend returned ${response.status}`);
      }

      const data = await response.json();
      setInsight(data.insight || "No insights generated yet.");
    } catch (err) {
      console.error("Error fetching insights:", err);
      setInsight("AI insights unavailable at the moment.");
    }
  } catch (error) {
    console.error("Error loading logs:", error);
  }
};


  // Rule-based prediction
  const predictMissProbability = (log: LogEntry): number => {
    let probability = 0.2; // base risk 20%

    const hour = new Date(log.scheduledTime).getHours();
    const isEvening = hour >= 18;
    const isWeekend = [0, 6].includes(new Date(log.scheduledTime).getDay());

    if (isEvening) probability += 0.3;
    if (isWeekend) probability += 0.2;
    if (log.medicationName?.toLowerCase().includes('antibiotic')) probability += 0.1;

    return Math.min(probability, 1); // cap at 100%
  };

  useEffect(() => {
    loadLogs();
    const unsubscribe = navigation.addListener('focus', loadLogs);
    return unsubscribe;
  }, [navigation]);

  const getStatusColor = (status: LogStatus) => {
    switch (status) {
      case 'taken': return '#4CAF50';
      case 'missed': return '#FF3B30';
      case 'snoozed': return '#FF9800';
      case 'skipped': return '#9C27B0';
      case 'late': return '#2196F3';
      case 'rescheduled': return '#607D8B';
      default: return colors.text;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <AppHeader title="Analytics" />

      <ScrollView style={styles.content}>
        {/* Statistics Cards */}
        <View style={styles.statsContainer}>
          <View style={[styles.statCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.statNumber, { color: colors.primary }]}>{stats.total}</Text>
            <Text style={[styles.statLabel, { color: colors.text }]}>Total Doses</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.statNumber, { color: '#4CAF50' }]}>{stats.taken}</Text>
            <Text style={[styles.statLabel, { color: colors.text }]}>Taken</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.statNumber, { color: '#FF3B30' }]}>{stats.missed}</Text>
            <Text style={[styles.statLabel, { color: colors.text }]}>Missed</Text>
          </View>
        </View>

        {/* Extra Stats Row */}
        <View style={styles.statsContainer}>
          <View style={[styles.statCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.statNumber, { color: '#FF9800' }]}>{stats.snoozed}</Text>
            <Text style={[styles.statLabel, { color: colors.text }]}>Snoozed</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.statNumber, { color: '#9C27B0' }]}>{stats.skipped}</Text>
            <Text style={[styles.statLabel, { color: colors.text }]}>Skipped</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.statNumber, { color: '#2196F3' }]}>{stats.late}</Text>
            <Text style={[styles.statLabel, { color: colors.text }]}>Late</Text>
          </View>
        </View>

        {/* Rescheduled */}
        <View style={[styles.statCard, { backgroundColor: colors.card, marginBottom: 16 }]}>
          <Text style={[styles.statNumber, { color: '#607D8B' }]}>{stats.rescheduled}</Text>
          <Text style={[styles.statLabel, { color: colors.text }]}>Rescheduled</Text>
        </View>

        {/* Adherence Rate */}
        <View style={[styles.adherenceCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.adherenceTitle, { color: colors.text }]}>Adherence Rate</Text>
          <Text style={[styles.adherencePercentage, { color: colors.primary }]}>
            {stats.adherence}%
          </Text>
          <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
            <View
              style={[
                styles.progressFill,
                { width: `${stats.adherence}%`, backgroundColor: colors.primary }
              ]}
            />
          </View>
        </View>


        {/* AI Insights */}
        <View style={[styles.activitySection, { backgroundColor: colors.card, marginBottom: 16 }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Medication Insights</Text>
          <Text style={{ color: colors.text, fontStyle: 'italic' }}>
            {insight || 'Loading personalized insights...'}
          </Text>
        </View>



{/* --- Missed Dose Predictor --- */}
<View style={[styles.predictorCard, { backgroundColor: colors.card }]}>
  <Text style={[styles.predictorTitle, { color: colors.text }]}>Missed Dose Risk</Text>
  <Text
  style={[
    styles.predictorText,
    { color: missRisk > 50 ? '#FF3B30' : colors.primary }
  ]}
>
  You are {missRisk}% likely to miss your next dose of{" "}
  {logs[0]?.medicationName || "your medication"} scheduled on{" "}
  {logs[0] ? `${formatDate(logs[0].scheduledTime)} at ${formatTime(logs[0].scheduledTime)}` : "N/A"}.
</Text>


  {missRisk > 50 && logs.length > 0 && (
    <>
      <Text style={[styles.suggestion, { color: colors.text }]}>
        Would you like an extra notification 30 mins before?
      </Text>
      <TouchableOpacity
        style={styles.notifyButton}
        onPress={async () => {
          const nextLog = logs[0]; // most recent scheduled dose
          const scheduledDate = new Date(nextLog.scheduledTime);
          scheduledDate.setMinutes(scheduledDate.getMinutes() - 30);

          await Notifications.scheduleNotificationAsync({
            content: {
              title: "Extra Reminder 💊",
              body: `Upcoming dose: ${nextLog.medicationName} at ${formatTime(nextLog.scheduledTime)}`,
            },
            trigger: { date: scheduledDate } as Notifications.NotificationTriggerInput,
          });




          alert("✅ Extra reminder scheduled 30 minutes before your next dose!");
        }}
      >
        <Text style={styles.notifyButtonText}>Set Extra Reminder</Text>
      </TouchableOpacity>
    </>
  )}
</View>


        {/* Recent Activity */}
        <View style={[styles.activitySection, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Activity</Text>
          {logs.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.text }]}>
              No activity recorded yet
            </Text>
          ) : (
            logs.slice(0, 7).map((log) => (   // ✅ only show last 7
              <View key={log.id} style={[styles.logItem, { borderBottomColor: colors.border }]}>
                <View style={styles.logInfo}>
                  <Text style={[styles.medName, { color: colors.text }]}>{log.medicationName}</Text>
                  <Text style={[styles.logTime, { color: colors.text }]}>
                    {formatDate(log.scheduledTime)} at {formatTime(log.scheduledTime)}
                  </Text>
                </View>
                <Text style={[styles.logStatus, { color: getStatusColor(log.status) }]}>
                  {log.status.toUpperCase()}
                </Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, padding: 16 },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 4,
    elevation: 1,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: { fontSize: 12, textAlign: 'center' },
  adherenceCard: {
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 24,
    elevation: 1,
  },
  adherenceTitle: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
  adherencePercentage: { fontSize: 32, fontWeight: 'bold', marginBottom: 16 },
  progressBar: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 4 },
  predictorCard: {
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 24,
    elevation: 1,
  },
  predictorTitle: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
  predictorText: { fontSize: 16, fontWeight: '500', marginBottom: 8 },
  suggestion: { fontSize: 12, fontStyle: 'italic' },
  activitySection: {
    padding: 16,
    borderRadius: 12,
    elevation: 1,
  },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  emptyText: { textAlign: 'center', fontStyle: 'italic', padding: 20 },
  logItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  logInfo: { flex: 1 },
  medName: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  logTime: { fontSize: 12 },
  logStatus: { fontSize: 12, fontWeight: 'bold' },
notifyButton: {
  marginTop: 12,
  backgroundColor: '#FF3B30',
  paddingVertical: 10,
  paddingHorizontal: 16,
  borderRadius: 8,
},
notifyButtonText: {
  color: '#fff',
  fontWeight: '600',
  textAlign: 'center',
},


});

export default AnalyticsScreen;
