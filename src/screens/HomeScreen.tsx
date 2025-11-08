import React, { useState, useEffect, useCallback, useRef } from "react";
import { View, ScrollView, RefreshControl, Animated, TouchableWithoutFeedback , StyleSheet} from "react-native";
import { useFocusEffect, useTheme } from "@react-navigation/native";
import * as Notifications from "expo-notifications";

import { useMedicationStore } from "../stores/medicationStore";
import { useUserProfile } from "../hooks/useUserProfile";
import { useFeedback } from "../contexts/FeedbackContext";

import { WelcomeSection } from "../components/homescreen/WelcomeSection";
import StatsSection from "../components/homescreen/StatsSection";
import MedicationList from "../components/homescreen/MedicationList";
import EmptyState from "../components/homescreen/EmptyState";
import { ReminderPanel } from "../components/homescreen/ReminderPanel"; // ✅ New Pure JS Component
import { DeleteConfirmationModal } from "../components/homescreen/DeleteConfirmationModal";
import { AppointmentsSection } from "../components/homescreen/AppointmentsSection";
import { RefillAlertBanner } from "../components/homescreen/RefillAlertBanner";
import { LoadingState } from "../components/homescreen/LoadingState";
import { ErrorBoundary } from "../components/homescreen/ErrorBoundary";

import { isMedicationDue } from "../utils/medicationUtils";
import { getUpcomingAppointments, markAppointmentCompleted } from "../Services/storage";
import { getLowSupplyMedications, markRefillCompleted } from "../Services/storage";
import { Appointment } from "../models/Appointment";

const HomeScreen = ({ navigation }: any) => {
  const { colors } = useTheme();
  const { showFeedback } = useFeedback();
  const { profile, loading: profileLoading } = useUserProfile();

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
    handleAction,
    closeReminderModal,
    confirmDelete,
    cancelDelete,
  } = useMedicationStore();

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [refillAlerts, setRefillAlerts] = useState<Array<{ medication: any; refill: any }>>([]);
  const [loadingAppointments, setLoadingAppointments] = useState(true);

  const alreadyShownRef = useRef<Set<string>>(new Set());
  const overlayOpacity = useRef(new Animated.Value(0)).current; // ✅ Animated fade background

  const stats = {
    total: medications.length,
    taken: medications.filter((m) => m.status === "taken").length,
    missed: medications.filter((m) => m.status === "missed").length,
    snoozed: medications.filter((m) => m.status === "snoozed").length,
    skipped: medications.filter((m) => m.status === "skipped").length,
    late: medications.filter((m) => m.status === "late").length,
    rescheduled: medications.filter((m) => m.status === "rescheduled").length,
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
        const actionable = med.status !== "taken" && med.status !== "missed";

        if (now >= scheduledTime && actionable && !alreadyShownRef.current.has(medId) && !reminderVisible) {
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
            onRefresh={() => {
              refresh();
              loadAdditionalData();
            }}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={{ padding: 20 }}>
          <WelcomeSection
            userName={profile?.name}
            profilePicture={profile?.profilePicture}
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
          <StatsSection stats={stats} />
        </View>

        <AppointmentsSection
          appointments={appointments}
          onAddAppointment={handleAddAppointment}
          onEditAppointment={handleEditAppointment}
          onCompleteAppointment={handleCompleteAppointment}
        />

        <View style={{ padding: 20 }}>
          {medications.length === 0 ? (
            <EmptyState onAddMedication={() => navigation.navigate("Add")} theme={colors} />
          ) : (
            <MedicationList
              medications={medications}
              navigation={navigation}
              isMedicationDue={isMedicationDue}
              onDelete={(m) => handleAction({ type: "delete", medication: m })}
              onMarkTaken={(m) => handleAction({ type: "take", medication: m })}
              onMarkMissed={(m) => handleAction({ type: "miss", medication: m })}
              onOpenReminderActions={(m) => handleAction({ type: "reminder", medication: m })}
            />
          )}
        </View>
      </ScrollView>

      {/* ✅ Fade background overlay */}
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

      {/* ✅ New Pure JS Reminder Panel */}
      <ReminderPanel
        visible={reminderVisible}
        medication={activeMedication}
        onClose={closeReminderModal}
        onTaken={async () => {
          if (!activeMedication) return;
          await handleAction({ type: "take", medication: activeMedication });
          showFeedback(`✅ ${activeMedication.name} marked as taken!`, "success");
          setTimeout(closeReminderModal, 500);
        }}
        onMissed={async () => {
          if (!activeMedication) return;
          await handleAction({ type: "miss", medication: activeMedication });
          showFeedback(`⚠️ ${activeMedication.name} marked as missed`, "warning");
          setTimeout(closeReminderModal, 500);
        }}
        onSnooze={async (minutes: number) => {
          if (!activeMedication) return;
          await handleAction({
            type: "snooze",
            medication: activeMedication,
            data: { minutes },
          });
          showFeedback(`⏰ ${activeMedication.name} snoozed for ${minutes} minutes`, "info");
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

export default HomeScreen;
