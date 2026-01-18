// components/homescreen/StatsSection.tsx
import React from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { useTheme } from "@react-navigation/native";
import { useAuth } from '@/contexts/AuthContext';
import { Ionicons } from "@expo/vector-icons";
import { useMedicationStatus } from "@/hooks/useMedicationStatus";
import { Medication } from "@/models/Medication";
import { ComplianceInsights } from "@/Services/centalizedMedicalStatus/ComplianceInsightsCalculator";

interface Props {
  medications?: Medication[];
  complianceInsightsMap?: Record<number, ComplianceInsights>;
  isLoading?: boolean;
  error?: string | null;
}

const StatsSection: React.FC<Props> = ({ 
  medications = [], 
  complianceInsightsMap = {}, 
  isLoading = false, 
  error = null 
}) => {
  const { colors } = useTheme();
  const { user } = useAuth();

  // ✅ Use the centralized hook
  const { stats } = useMedicationStatus(medications, complianceInsightsMap);
  const isGuest = !user;

  // Calculate compliance rate color
  const getComplianceColor = (rate?: number) => {
    if (!rate) return "#666";
    if (rate >= 90) return "#4CAF50";
    if (rate >= 70) return "#FF9800";
    return "#FF3B30";
  };

  // LOADING STATE
  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.card }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.text }]}>
          Loading statistics...
        </Text>
      </View>
    );
  }

  // ERROR STATE
  if (error) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: colors.card }]}>
        <Ionicons name="alert-circle-outline" size={48} color="#FF3B30" />
        <Text style={[styles.errorTitle, { color: colors.text }]}>
          Unable to Load Stats
        </Text>
        <Text style={[styles.errorText, { color: colors.text, opacity: 0.7 }]}>
          {error}
        </Text>
      </View>
    );
  }

  // GUEST STATE (No user logged in)
  if (isGuest) {
    return (
      <View style={[styles.guestContainer, { backgroundColor: colors.card }]}>
        <View style={[styles.guestIconContainer, { backgroundColor: `${colors.primary}15` }]}>
          <Ionicons name="stats-chart" size={40} color={colors.primary} />
        </View>
        <Text style={[styles.guestTitle, { color: colors.text }]}>
          Track Your Medications
        </Text>
        <Text style={[styles.guestText, { color: colors.text, opacity: 0.7 }]}>
          Sign in to view your medication statistics, track compliance, and get personalized insights.
        </Text>
      </View>
    );
  }

  // EMPTY STATE (User logged in but no data)
  if (stats.total === 0 && !stats.avgComplianceRate) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: colors.card }]}>
        <View style={[styles.emptyIconContainer, { backgroundColor: `${colors.primary}15` }]}>
          <Ionicons name="medical-outline" size={40} color={colors.primary} />
        </View>
        <Text style={[styles.emptyTitle, { color: colors.text }]}>
          No Medications Yet
        </Text>
        <Text style={[styles.emptyText, { color: colors.text, opacity: 0.7 }]}>
          Add your first medication to start tracking and see statistics here.
        </Text>
      </View>
    );
  }

  // MAIN CONTENT (User logged in with data)
  return (
    <>
      <View style={styles.statsContainer}>
        <View style={[styles.statCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.statNumber, { color: colors.primary }]}>
            {stats.total}
          </Text>
          <Text style={[styles.statLabel, { color: colors.text }]}>
            Total Meds
          </Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.statNumber, { color: "#4CAF50" }]}>
            {stats.taken}
          </Text>
          <Text style={[styles.statLabel, { color: colors.text }]}>
            Taken
          </Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.statNumber, { color: "#FF3B30" }]}>
            {stats.missed}
          </Text>
          <Text style={[styles.statLabel, { color: colors.text }]}>
            Missed
          </Text>
        </View>
      </View>

      {/* COMPLIANCE INSIGHTS ROW */}
      {stats.avgComplianceRate !== undefined && (
        <View style={styles.statsContainer}>
          <View style={[styles.statCard, { backgroundColor: colors.card }]}>
            <Text style={[
              styles.statNumber, 
              { color: getComplianceColor(stats.avgComplianceRate) }
            ]}>
              {stats.avgComplianceRate}%
            </Text>
            <Text style={[styles.statLabel, { color: colors.text }]}>
              Avg Compliance
            </Text>
            {stats.medicationsWithData !== undefined && stats.medicationsWithData > 0 && (
              <Text style={[styles.statSubLabel, { color: colors.text, opacity: 0.7 }]}>
                ({stats.medicationsWithData} meds tracked)
              </Text>
            )}
          </View>

          <View style={[styles.statCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.statNumber, { color: "#FF9800" }]}>
              {stats.snoozed}
            </Text>
            <Text style={[styles.statLabel, { color: colors.text }]}>
              Snoozed
            </Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.statNumber, { color: "#9C27B0" }]}>
              {stats.skipped}
            </Text>
            <Text style={[styles.statLabel, { color: colors.text }]}>
              Skipped
            </Text>
          </View>
        </View>
      )}

      {/* ORIGINAL ROW (if no compliance data) */}
      {stats.avgComplianceRate === undefined && (
        <View style={styles.statsContainer}>
          <View style={[styles.statCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.statNumber, { color: "#FF9800" }]}>
              {stats.snoozed}
            </Text>
            <Text style={[styles.statLabel, { color: colors.text }]}>
              Snoozed
            </Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.statNumber, { color: "#9C27B0" }]}>
              {stats.skipped}
            </Text>
            <Text style={[styles.statLabel, { color: colors.text }]}>
              Skipped
            </Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.statNumber, { color: "#2196F3" }]}>
              {stats.late}
            </Text>
            <Text style={[styles.statLabel, { color: colors.text }]}>
              Late
            </Text>
          </View>
        </View>
      )}

      {/* BOTTOM ROW */}
      <View style={styles.statsContainer}>
        <View style={[styles.statCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.statNumber, { color: "#607D8B" }]}>
            {stats.rescheduled}
          </Text>
          <Text style={[styles.statLabel, { color: colors.text }]}>
            Rescheduled
          </Text>
        </View>

        {/* Optional: Show total compliance records */}
        {stats.totalComplianceRecords !== undefined && stats.totalComplianceRecords > 0 && (
          <View style={[styles.statCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.statNumber, { color: "#795548" }]}>
              {stats.totalComplianceRecords}
            </Text>
            <Text style={[styles.statLabel, { color: colors.text }]}>
              Data Points
            </Text>
            <Text style={[styles.statSubLabel, { color: colors.text, opacity: 0.7 }]}>
              For ML Analysis
            </Text>
          </View>
        )}

        {/* Empty card to maintain layout */}
        {(stats.totalComplianceRecords === undefined || stats.totalComplianceRecords === 0) && (
          <View style={[styles.statCard, { backgroundColor: 'transparent' }]} />
        )}
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  // Original styles
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  statNumber: { 
    fontSize: 24, 
    fontWeight: "bold", 
    marginBottom: 4 
  },
  statLabel: { 
    fontSize: 12, 
    textAlign: "center",
    fontWeight: "600"
  },
  statSubLabel: {
    fontSize: 10,
    textAlign: "center",
    marginTop: 2,
  },

  // Loading state
  loadingContainer: {
    padding: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  loadingText: {
    fontSize: 16,
    marginTop: 16,
    fontWeight: "500",
  },

  // Error state
  errorContainer: {
    padding: 32,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },

  // Guest state
  guestContainer: {
    padding: 32,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  guestIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  guestTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 12,
    textAlign: "center",
  },
  guestText: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: 8,
  },

  // Empty state (logged in, no data)
  emptyContainer: {
    padding: 32,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 12,
    textAlign: "center",
  },
  emptyText: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: 8,
  },
});

export default StatsSection;