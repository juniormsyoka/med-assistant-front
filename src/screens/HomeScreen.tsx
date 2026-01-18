import { useState, useEffect, useCallback, useRef } from "react";
import { View, ScrollView, RefreshControl, Animated, TouchableWithoutFeedback, TouchableOpacity, StyleSheet, Text } from "react-native";
import { useFocusEffect, useTheme } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import * as Notifications from "expo-notifications";

import { useMedicationStore } from "../stores/medicationStore";
import { useUserProfile } from "../hooks/useUserProfile";
import { useFeedback } from "../contexts/FeedbackContext";

import { WelcomeSection } from "../components/homescreen/WelcomeSection";
import StatsSection from "../components/homescreen/StatsSection";
import MedicationList from "../components/homescreen/MedicationList";
import EmptyState from "../components/homescreen/EmptyState";
import { ReminderPanel } from "../components/homescreen/ReminderPanel";
import { DeleteConfirmationModal } from "../components/homescreen/DeleteConfirmationModal";
import { AppointmentsSection } from "../components/homescreen/AppointmentsSection";
import { RefillAlertBanner } from "../components/homescreen/RefillAlertBanner";
import { LoadingState } from "../components/homescreen/LoadingState";
import { ErrorBoundary } from "../components/homescreen/ErrorBoundary";

import { getUpcomingAppointments, markAppointmentCompleted } from "../Services/storage";
import { getLowSupplyMedications, markRefillCompleted } from "../Services/storage";
import { Appointment } from "../models/Appointment";

import { ComplianceTracker } from "../Services/ComplianceTracker";
import { MedicationActionService } from "../Services/centalizedMedicalStatus/MedicationActionService";

import { useAuth } from "../contexts/AuthContext";
import { useMedicationStatus } from "../hooks/useMedicationStatus";

const HomeScreen = ({ navigation }: any) => {
  const { colors } = useTheme();
  const { showFeedback } = useFeedback();
  const { profile, loading: profileLoading } = useUserProfile();
  const { user } = useAuth();

  const {
    medications,
    loading,
    error,
    refreshing,
    reminderVisible,
    activeMedication,
    deleteVisible,
    medicationToDelete,
    refresh,
    handleAction, // Keep for delete and reminder actions
    closeReminderModal,
    confirmDelete,
    cancelDelete,
  } = useMedicationStore();

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [refillAlerts, setRefillAlerts] = useState<Array<{ medication: any; refill: any }>>([]);
  const [loadingAppointments, setLoadingAppointments] = useState(true);
  const [complianceInsights, setComplianceInsights] = useState<Record<number, any>>({});

  const alreadyShownRef = useRef<Set<string>>(new Set());
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  // ✅ Use centralized medication status hook
  const { medsWithStatus, stats: enhancedStats, isLoading: statusLoading } = useMedicationStatus(
    medications,
    complianceInsights,
    loading
  );

  // Role-based appointment button component
  const RoleBasedAppointmentButton = () => {
    if (user?.role === 'doctor') {
      return (
        <TouchableOpacity 
          style={[styles.appointmentButton, { backgroundColor: colors.card, borderLeftColor: '#FF6B6B' }]}
          onPress={() => navigation.navigate('DoctorDashboard' as any)}
        >
          <View style={styles.buttonContent}>
            <Ionicons name="medical" size={24} color="#FF6B6B" />
            <View style={styles.buttonText}>
              <Text style={[styles.buttonTitle, { color: colors.text }]}>
                Doctor Dashboard
              </Text>
              <Text style={[styles.buttonSubtitle, { color: colors.text }]}>
                Manage patient appointments
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.text} />
          </View>
        </TouchableOpacity>
      );
    } else {
      return (
        <TouchableOpacity 
          style={[styles.appointmentButton, { backgroundColor: colors.card, borderLeftColor: '#4361EE' }]}
          onPress={() => navigation.navigate('PatientAppointments' as any)}
        >
          <View style={styles.buttonContent}>
            <Ionicons name="calendar" size={24} color="#4361EE" />
            <View style={styles.buttonText}>
              <Text style={[styles.buttonTitle, { color: colors.text }]}>
                My Appointments
              </Text>
              <Text style={[styles.buttonSubtitle, { color: colors.text }]}>
                View and manage all appointments
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.text} />
          </View>
        </TouchableOpacity>
      );
    }
  };

  // -----------------------------
  // Load appointments and refills
  // -----------------------------
  const loadAdditionalData = useCallback(async () => {
    try {
      const [upcomingAppts, lowSupplyMeds] = await Promise.all([
        getUpcomingAppointments(7),
        getLowSupplyMedications(),
      ]);
      setAppointments(upcomingAppts);
      setRefillAlerts(lowSupplyMeds);
    } catch (err) {
      console.error("Error loading additional data:", err);
    } finally {
      setLoadingAppointments(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
      loadAdditionalData();
    }, [refresh, loadAdditionalData])
  );

  type MedicationNotificationData = {
    medicationId?: string;
    type?: string;
  };

  // -----------------------------
  // Notification listener
  // -----------------------------
  useEffect(() => {
    const subscription = Notifications.addNotificationReceivedListener((notification) => {
      const data = notification.request.content.data as MedicationNotificationData;
      const { medicationId, type } = data;

      if (type !== "medication" || !medicationId) return;

      const med = medications.find((m) => m.id?.toString() === medicationId);
      if (!med) return;

      const now = new Date();
      const scheduledTime = med.nextReminderAt
        ? new Date(med.nextReminderAt)
        : new Date(med.time);

      if (now >= scheduledTime && !alreadyShownRef.current.has(medicationId) && !reminderVisible) {
        alreadyShownRef.current.add(medicationId);
        // Use store's handleAction for reminder
        handleAction({ type: "reminder", medication: med });
      }
    });

    return () => subscription.remove();
  }, [medications, reminderVisible, handleAction]);

  // -----------------------------
  // Fallback polling (every 30s)
  // -----------------------------
  useEffect(() => {
    const checkDue = () => {
      const now = new Date();
      medications.forEach((med) => {
        const medId = med.id?.toString();
        if (!medId) return;

        const scheduledTime = med.nextReminderAt
          ? new Date(med.nextReminderAt)
          : new Date(med.time);
        
        // Check if medication is active and due
        const isActive = med.enabled && med.status !== "taken" && med.status !== "missed";
        
        if (now >= scheduledTime && isActive && !alreadyShownRef.current.has(medId) && !reminderVisible) {
          alreadyShownRef.current.add(medId);
          handleAction({ type: "reminder", medication: med });
        }
      });
    };

    const interval = setInterval(checkDue, 30000);
    checkDue();
    return () => clearInterval(interval);
  }, [medications, reminderVisible, handleAction]);

  // -----------------------------
  // Reset snoozed meds
  // -----------------------------
  useEffect(() => {
    if (!reminderVisible && activeMedication) {
      const medId = activeMedication.id?.toString();
      if (medId && activeMedication.status === "snoozed") {
        alreadyShownRef.current.delete(medId);
      }
    }
  }, [reminderVisible, activeMedication]);

  // -----------------------------
  // Overlay animation
  // -----------------------------
  useEffect(() => {
    Animated.timing(overlayOpacity, {
      toValue: reminderVisible ? 0.5 : 0,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [reminderVisible]);

  // -----------------------------
  // Load compliance insights
  // -----------------------------
  useEffect(() => {
    let isMounted = true;
    
    const loadComplianceInsights = async () => {
      if (medications.length === 0 || loading) return;
      
      try {
        const newInsights: Record<number, any> = {};
        
        for (const med of medications) {
          if (med.id && !complianceInsights[med.id]) {
            // Get compliance stats
            const stats = await useMedicationStore.getState().getComplianceInsights(med.id);
            
            // Get detailed records for enhanced insights
            const records = await ComplianceTracker.getMedicationRecords(med.id);
            const latestRecord = records.sort((a, b) => 
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            )[0];
            
            newInsights[med.id] = {
              ...stats,
              lastAction: latestRecord?.actualAction,
              lastActionTime: latestRecord?.createdAt,
              takenCount: records.filter(r => r.actualAction === 'taken').length,
              missedCount: records.filter(r => r.actualAction === 'missed').length,
              snoozedCount: records.filter(r => r.actualAction === 'snoozed').length,
              skippedCount: records.filter(r => r.actualAction === 'skipped').length,
              lateCount: records.filter(r => r.actualAction === 'late').length,
              totalRecords: records.length,
            };
          }
        }
        
        if (isMounted && Object.keys(newInsights).length > 0) {
          setComplianceInsights(prev => ({ ...prev, ...newInsights }));
        }
      } catch (error) {
        console.error('❌ Failed to load compliance insights:', error);
      }
    };
    
    const timeoutId = setTimeout(loadComplianceInsights, 500);
    
    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [medications, loading]);

  // Clear insights when no medications
  useEffect(() => {
    if (medications.length === 0) {
      setComplianceInsights({});
    }
  }, [medications.length]);

  const handleRefresh = useCallback(() => {
    refresh();
    loadAdditionalData();
    setComplianceInsights({}); // Clear insights to force reload
  }, [refresh, loadAdditionalData]);

  // -----------------------------
  // New centralized action handlers
  // -----------------------------
  const handleCentralizedAction = useCallback(async (
    actionType: "take" | "miss" | "snooze" | "skip" | "refill",
    medication: any,
    data?: any
  ) => {
    try {
      const result = await MedicationActionService.handleAction(
        medication,
        actionType,
        data
      );

      if (result.success) {
        // Show appropriate feedback
        const feedbackMessages = {
          take: `✅ ${medication.name} marked as taken!`,
          miss: `⚠️ ${medication.name} marked as missed`,
          snooze: `⏰ ${medication.name} snoozed for ${data?.minutes || 15} minutes`,
          skip: `⏭️ ${medication.name} skipped`,
          refill: `🔄 ${medication.name} refilled`
        };
        
        showFeedback(feedbackMessages[actionType], 
          actionType === "take" ? "success" : 
          actionType === "miss" ? "warning" : "info");
        
        // Clear compliance insights for this medication
        if (medication.id) {
          setComplianceInsights(prev => {
            const updated = { ...prev };
            delete updated[medication.id!];
            return updated;
          });
        }
        
        // Refresh data
        await refresh();
        
        return { success: true, result };
      } else {
        showFeedback(result.message || `Failed to ${actionType} medication`, "warning");
        return { success: false, error: result.message };
      }
    } catch (error) {
      console.error(`❌ ${actionType} action failed:`, error);
      showFeedback(`Failed to ${actionType} medication`, "warning");
      return { success: false, error };
    }
  }, [showFeedback, refresh]);

  // -----------------------------
  // Profile & navigation
  // -----------------------------
  const handleProfilePress = () => navigation.navigate("Settings");
  const handleAddAppointment = () => navigation.navigate("AddAppointment");
  const handleEditAppointment = (appt: Appointment) =>
    navigation.navigate("AddAppointment", { appointment: appt });
  const handleCompleteAppointment = async (apptId: number) => {
    await markAppointmentCompleted(apptId);
    loadAdditionalData();
  };

  const handleDismissRefillAlert = (medicationId: string) =>
    setRefillAlerts((prev) => prev.filter((a) => a.medication.id !== medicationId));

  const handleMarkRefilled = async (medicationId: string) => {
    await markRefillCompleted(parseInt(medicationId), 30);
    loadAdditionalData();
  };

  // -----------------------------
  // Loading / Error
  // -----------------------------
  if (profileLoading || loading || loadingAppointments) {
    return <LoadingState />;
  }
  if (error) {
    return <ErrorBoundary error={error} onRetry={refresh} />;
  }

  // -----------------------------
  // MAIN RENDER
  // -----------------------------
  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: 30, marginBottom: 70 }}>
      <ScrollView
        style={{ flex: 1 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={{ padding: 20 }}>
          <WelcomeSection
            theme={colors}
            onProfilePress={handleProfilePress}
          />
        </View>

        <RefillAlertBanner
          alerts={refillAlerts}
          onDismiss={handleDismissRefillAlert}
          onRefill={handleMarkRefilled}
        />

        <View style={{ paddingHorizontal: 20 }}>
          <StatsSection 
              medications={medications}
              complianceInsightsMap={complianceInsights}
              isLoading={statusLoading}
            />
        </View>

        {/* Role-based appointment button */}
        <RoleBasedAppointmentButton />

        <AppointmentsSection
          appointments={appointments}
          onAddAppointment={handleAddAppointment}
          onEditAppointment={handleEditAppointment}
          onCompleteAppointment={handleCompleteAppointment}
          onViewAllAppointments={() => {
            if (user?.role === 'doctor') {
              navigation.navigate('DoctorDashboard' as any);
            } else {
              navigation.navigate('PatientAppointments' as any);
            }
          }}
        />

        <View style={{ padding: 20 }}>
          {medications.length === 0 ? (
            <EmptyState onAddMedication={() => navigation.navigate("Add")} theme={colors} />
          ) : (
            <MedicationList
              medications={medsWithStatus} // ✅ Use medsWithStatus instead of raw medications
              navigation={navigation}
              onDelete={(m) => handleAction({ type: "delete", medication: m })}
                onMarkTaken={async (m) => {
                  await handleCentralizedAction("take", m);
                }}
                onMarkMissed={async (m) => {
                  await handleCentralizedAction("miss", m);
                }}
              onOpenReminderActions={(m) => handleAction({ type: "reminder", medication: m })}
              complianceInsights={complianceInsights}
            />
          )}
        </View>
      </ScrollView>

      {/* Fade background overlay */}
      {reminderVisible && (
        <TouchableWithoutFeedback onPress={closeReminderModal}>
          <Animated.View
            style={{
              ...StyleSheet.absoluteFillObject,
              backgroundColor: "black",
              opacity: overlayOpacity,
            }}
          />
        </TouchableWithoutFeedback>
      )}

      {/* Updated ReminderPanel with centralized actions */}
      <ReminderPanel
        visible={reminderVisible}
        medication={activeMedication}
        onClose={closeReminderModal}
        onTaken={async () => {
          if (!activeMedication) return;
          await handleCentralizedAction("take", activeMedication);
          setTimeout(closeReminderModal, 500);
        }}
        onMissed={async () => {
          if (!activeMedication) return;
          await handleCentralizedAction("miss", activeMedication);
          setTimeout(closeReminderModal, 500);
        }}
        onSnooze={async (minutes: number) => {
          if (!activeMedication) return;
          await handleCentralizedAction("snooze", activeMedication, { minutes });
          setTimeout(closeReminderModal, 500);
        }}
        onSkip={async () => {
          if (!activeMedication) return;
          await handleCentralizedAction("skip", activeMedication);
          setTimeout(closeReminderModal, 500);
        }}
      />

      <DeleteConfirmationModal
        visible={deleteVisible}
        medication={medicationToDelete}
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  appointmentButton: {
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  buttonText: {
    flex: 1,
  },
  buttonTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  buttonSubtitle: {
    fontSize: 14,
    opacity: 0.7,
  },
});

export default HomeScreen;