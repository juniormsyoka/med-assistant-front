import React, { useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { Medication } from "../../models/Medication";

interface ReminderActionModalProps {
  visible: boolean;
  medication: Medication | null;
  onClose: () => void;
  onTaken: () => Promise<void>;
  onMissed: () => Promise<void>;
  onSnooze: (minutes: number) => Promise<void>;
  onReschedule?: () => Promise<void>;
  onFeedback?: (message: string, type?: "success" | "warning" | "info") => void;
}

const { width } = Dimensions.get("window");

const ReminderActionModal: React.FC<ReminderActionModalProps> = ({
  visible,
  medication,
  onClose,
  onTaken,
  onMissed,
  onSnooze,
  onReschedule,
  onFeedback,
}) => {
  // 🧩 Guard: prevent rendering before medication is ready
  if (!visible || !medication) return null;

  // ✅ Safe handler wrappers to prevent race conditions
  const handleTaken = useCallback(async () => {
    try {
      await onTaken();
      onFeedback?.(`✅ Marked ${medication.name} as taken`, "success");
    } catch (err) {
      console.error("Error marking as taken:", err);
      onFeedback?.("❌ Failed to mark as taken", "warning");
    } finally {
      onClose(); // always close last to avoid stale UI
    }
  }, [medication, onTaken, onFeedback, onClose]);

  const handleMissed = useCallback(async () => {
    try {
      await onMissed();
      onFeedback?.(`⚠️ Marked ${medication.name} as missed`, "warning");
    } catch (err) {
      console.error("Error marking as missed:", err);
      onFeedback?.("❌ Failed to mark as missed", "warning");
    } finally {
      onClose();
    }
  }, [medication, onMissed, onFeedback, onClose]);

  const handleSnooze = useCallback(
    async (minutes: number) => {
      try {
        await onSnooze(minutes);
        const timeText = minutes === 15 ? "15 minutes" : "1 hour";
        onFeedback?.(`⏰ ${medication.name} snoozed for ${timeText}`, "info");
      } catch (err) {
        console.error("Error snoozing:", err);
        onFeedback?.("❌ Failed to snooze reminder", "warning");
      } finally {
        onClose();
      }
    },
    [medication, onSnooze, onFeedback, onClose]
  );

  const formatTime = (time: string) => {
    try {
      const date = new Date(`1970-01-01T${time}`);
      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return time;
    }
  };

  const ActionButton = ({
    icon,
    label,
    color,
    backgroundColor,
    onPress,
  }: {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    color: string;
    backgroundColor: string;
    onPress: () => void;
  }) => (
    <TouchableOpacity
      style={[styles.actionButton, { backgroundColor }]}
      activeOpacity={0.8}
      onPress={onPress}
    >
      <View style={[styles.iconContainer, { backgroundColor: color + "20" }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <Text style={[styles.actionLabel, { color }]}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <BlurView intensity={25} tint="light" style={StyleSheet.absoluteFill} />
        <View style={styles.modalContainer}>
          <View style={styles.modal}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.medIcon}>
                <Ionicons name="medical-outline" size={24} color="#4361EE" />
              </View>
              <View style={styles.headerText}>
                <Text style={styles.title}>Medication Reminder</Text>
                <Text style={styles.medName}>{medication.name}</Text>
                <Text style={styles.subtitle}>
                  {formatTime(medication.time)} • {medication.dosage}
                </Text>
              </View>
            </View>

            {/* Prompt */}
            <Text style={styles.prompt}>What would you like to do?</Text>

            {/* Actions Grid */}
            <View style={styles.actionsGrid}>
              <ActionButton
                icon="checkmark-circle"
                label="I just took it"
                color="#4CAF50"
                backgroundColor="#E8F5E8"
                onPress={handleTaken}
              />
              <ActionButton
                icon="close-circle"
                label="I won’t take it"
                color="#FF3B30"
                backgroundColor="#FFEBEE"
                onPress={handleMissed}
              />
              <ActionButton
                icon="time-outline"
                label="15 min later"
                color="#FF9800"
                backgroundColor="#FFF3E0"
                onPress={() => handleSnooze(15)}
              />
              <ActionButton
                icon="time-outline"
                label="1 hour later"
                color="#FF9800"
                backgroundColor="#FFF3E0"
                onPress={() => handleSnooze(60)}
              />
              {onReschedule && (
                <ActionButton
                  icon="calendar-outline"
                  label="Reschedule"
                  color="#9C27B0"
                  backgroundColor="#F3E5F5"
                  onPress={async () => {
                    await onReschedule?.();
                    onFeedback?.(
                      `📅 Rescheduled ${medication.name}`,
                      "info"
                    );
                    onClose();
                  }}
                />
              )}
            </View>

            {/* Cancel */}
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "center", alignItems: "center" },
  modalContainer: { width: width - 40, maxWidth: 400 },
  modal: {
    backgroundColor: "white",
    borderRadius: 24,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 8,
  },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 20 },
  medIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#EEF2FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  headerText: { flex: 1 },
  title: { fontSize: 16, fontWeight: "600", color: "#666" },
  medName: { fontSize: 20, fontWeight: "700", color: "#1A1A1A" },
  subtitle: { fontSize: 14, color: "#666" },
  prompt: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 20,
    textAlign: "center",
  },
  actionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  actionButton: {
    width: "48%",
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
    marginBottom: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  actionLabel: { fontSize: 14, fontWeight: "600", textAlign: "center" },
  cancelButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: "#F5F5F5",
  },
  cancelText: { color: "#666", fontWeight: "600", fontSize: 16 },
});

export default ReminderActionModal;
