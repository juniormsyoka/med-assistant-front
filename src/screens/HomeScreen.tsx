import React, { useState, useEffect } from "react";
import { View,Text,StyleSheet,ScrollView} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@react-navigation/native";
import * as Notifications from "expo-notifications";

import AppHeader from "../components/AppHeader";
import MedCard from "../components/MedCard";
import PrimaryButton from "../components/PrimaryButton";
import ConfirmDialog from "../components/ConfirmDialogue";
import ReminderActionModal from "../components/ReminderActionModal";
import { getMedications,deleteMedication,addLogEntry} from "../Services/storage";
import { Medication } from "../models/Medication";
import { settingsService } from "../Services/Settings"; 

const HomeScreen = ({ navigation }: any) => {
  const [medications, setMedications] = useState<Medication[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [selectedMed, setSelectedMed] = useState<Medication | null>(null);
  const [profileName, setProfileName] = useState<string | null>(null);
  // --- Reminder modal states ---
  const [activeMedication, setActiveMedication] = useState<Medication | null>(
    null
  );
  const [reminderModalVisible, setReminderModalVisible] = useState(false);

  const { colors } = useTheme();

  const loadMedications = async () => {
    setRefreshing(true);
    try {
      const meds = await getMedications();
      setMedications(meds);
    } catch (error) {
      console.error("Error loading medications:", error);
    }
    setRefreshing(false);
  };

  useEffect(() => {
    loadMedications();
    const unsubscribe = navigation.addListener("focus", loadMedications);
    return unsubscribe;
  }, [navigation]);

  // ✅ Single notification listener (removed duplicate)
  useEffect(() => {
    const subscription = Notifications.addNotificationReceivedListener(
      (notification) => {
        const medId = notification.request.content.data.medicationId;
        const med = medications.find((m) => m.id === medId);
        if (med) {
          openReminderModal(med);
        }
      }
    );

    

    return () => subscription.remove();
  }, [medications]);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const profile = await settingsService.initialize();
        // Only set if the user actually filled out a name (not default "User")
        if (profile.name && profile.name.trim() !== "" && profile.name !== "User") {
          setProfileName(profile.name);
        }
      } catch (err) {
        console.error("Error loading profile:", err);
      }
    };

    loadProfile();
  }, []);

  const openDeleteDialog = (medication: Medication) => {
    setSelectedMed(medication);
    setDeleteDialogVisible(true);
  };

  // --- Log status ---
  const logStatus = async (
    med: Medication,
    status: Medication["status"],
    actualTime?: string
  ) => {
    await addLogEntry({
      medicationId: med.id!,
      medicationName: med.name,
      status: status as any,
      scheduledTime: med.time,
      actualTime: actualTime ?? new Date().toISOString(),
    });
    loadMedications();
  };

  const handleMarkTaken = async (med: Medication) => {
    await logStatus(med, "taken");
  };

  const handleMarkMissed = (med: Medication) => logStatus(med, "missed");

  const handleSnooze = (med: Medication, minutes: number) => {
    const trigger: Notifications.TimeIntervalTriggerInput = {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: minutes * 60,
      repeats: false,
    };

    Notifications.scheduleNotificationAsync({
      content: {
        title: `Reminder: ${med.name}`,
        body: "Time to take your medication",
        data: { medicationId: med.id },
      },
      trigger,
    });

    setReminderModalVisible(false);
  };

  // --- Determine if medication is due ---
  const isMedicationDue = (med: Medication): boolean => {
    if (!med.enabled) return false;
    if (
      med.status !== undefined &&
      ["taken", "missed", "skipped", "rescheduled"].includes(
        med.status as string
      )
    )
      return false;

    const now = new Date();
    const [hours, minutes] = med.time.split(":").map(Number);
    const medTime = new Date();
    medTime.setHours(hours, minutes, 0, 0);

    // ✅ Respect repeatType
    if (med.repeatType === "weekly" && med.weekday !== now.getDay() + 1) {
      return false; // weekday is 1–7 (Sunday–Saturday)
    }

    if (med.repeatType === "monthly" && med.day !== now.getDate()) {
      return false;
    }

    // Daily meds or matching weekly/monthly → check time
    return Math.abs(now.getTime() - medTime.getTime()) <= 5 * 60 * 1000;
  };

  // --- Open reminder modal ---
  const openReminderModal = (med: Medication) => {
    setActiveMedication(med);
    setReminderModalVisible(true);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <AppHeader title="Medication Reminder" />

      <ScrollView style={styles.content}>
        <View style={styles.welcomeSection}>
           <Text style={[styles.welcomeTitle, { color: colors.text }]}>
        {profileName ? `Welcome, ${profileName}! 👋` : "Welcome! 👋"}
      </Text>
          <Text style={[styles.welcomeSubtitle, { color: colors.text }]}>
            You have {medications.length} medication
            {medications.length !== 1 ? "s" : ""} scheduled
          </Text>
        </View>

        {medications.length === 0 ? (
          <View style={[styles.emptyState, { backgroundColor: colors.card }]}>
            <Ionicons name="medical" size={64} color={colors.border} />
            <Text style={[styles.emptyText, { color: colors.text }]}>
              No medications added yet
            </Text>
            <Text style={[styles.emptySubtext, { color: colors.text }]}>
              Add your first medication to get started
            </Text>
          </View>
        ) : (
          <View style={styles.medicationsList}>
            {medications.map((med) => (
              <MedCard
                key={med.id}
                medication={med}
                isDue={isMedicationDue(med)}
                onEdit={() => navigation.navigate("Add", { medication: med })}
                onDelete={() => openDeleteDialog(med)}
                onToggle={() => console.log("Toggle medication")}
                onMarkTaken={() => handleMarkTaken(med)}
                onMarkMissed={() => handleMarkMissed(med)}
                onOpenReminderActions={() => openReminderModal(med)}
              />
            ))}
          </View>
        )}
      </ScrollView>

      <View style={styles.fabContainer}>
        <PrimaryButton
          title="Add Medication"
          onPress={() => navigation.navigate("Add")}
          style={styles.fabButton}
        />
      </View>

      {/* --- ReminderActionModal --- */}
      {activeMedication && (
        <ReminderActionModal
          visible={reminderModalVisible}
          medication={activeMedication}
          onClose={() => setReminderModalVisible(false)}
          onTaken={() => {
            handleMarkTaken(activeMedication);
            setReminderModalVisible(false);
          }}
          onMissed={() => {
            handleMarkMissed(activeMedication);
            setReminderModalVisible(false);
          }}
          onSnooze={(minutes) => handleSnooze(activeMedication, minutes)}
        />
      )}

      {/* --- Delete Confirmation Dialog --- */}
      <ConfirmDialog
        visible={deleteDialogVisible}
        title="Delete Medication"
        message={`Are you sure you want to delete ${selectedMed?.name}?`}
        onConfirm={async () => {
          if (selectedMed?.id) await deleteMedication(selectedMed.id);
          setDeleteDialogVisible(false);
          setSelectedMed(null);
          loadMedications();
        }}
        onCancel={() => {
          setDeleteDialogVisible(false);
          setSelectedMed(null);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, padding: 16 },
  welcomeSection: { marginBottom: 24 },
  welcomeTitle: { fontSize: 28, fontWeight: "bold", marginBottom: 8 },
  welcomeSubtitle: { fontSize: 16 },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
    borderRadius: 12,
    marginTop: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: { fontSize: 14, textAlign: "center" },
  medicationsList: { marginBottom: 80 },
  fabContainer: { position: "absolute", bottom: 24, right: 24, left: 24 },
  fabButton: { borderRadius: 25 },
});

export default HomeScreen;
