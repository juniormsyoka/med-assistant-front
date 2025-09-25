import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Medication } from "../models/Medication";

interface MedCardProps {
  medication: Medication & { nextReminderAt?: string }; // <-- add optional field
  isDue?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  onToggle?: () => void;
  onMarkTaken?: () => Promise<void>;
  onMarkMissed?: () => Promise<void>;
  onSnooze?: (minutes: number) => Promise<void>;
  onSkip?: () => Promise<void>;
  onReschedule?: (newTime: string) => Promise<void>;
  onOpenReminderActions?: () => void;
}

const MedCard: React.FC<MedCardProps> = ({
  medication,
  isDue = false,
  onEdit,
  onDelete,
  onToggle,
  onOpenReminderActions,
}) => {
  const getStatusLabel = () => {
    switch (medication.status) {
      case "taken":
        return { label: "✅ Taken", color: "#4CAF50" };
      case "missed":
        return { label: "❌ Missed", color: "#FF3B30" };
      case "snoozed":
        return { label: "⏰ Snoozed", color: "#FF9800" };
      case "skipped":
        return { label: "🚫 Skipped", color: "#9E9E9E" };
      case "late":
        return { label: "🕑 Late", color: "#FF6B35" };
      case "rescheduled":
        return { label: "📅 Rescheduled", color: "#9C27B0" };
      default:
        return medication.enabled
          ? { label: "Active", color: "#4361EE" }
          : { label: "Paused", color: "#999" };
    }
  };

  const { label, color } = getStatusLabel();

  return (
    <View style={[styles.card, !medication.enabled && styles.cardDisabled]}>
      <View style={styles.content}>
        <Text style={styles.name}>{medication.name}</Text>
        <Text style={styles.details}>
          {medication.dosage} •{" "}
          {new Date(medication.time).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </Text>


        {/* 🔔 Show Next Reminder if available */}
        {medication.nextReminderAt && (
          <Text style={styles.reminderLabel}>
            ⏰ Next:{" "}
            {new Date(medication.nextReminderAt).toLocaleString([], {
              weekday: "short",
              hour: "2-digit",
              minute: "2-digit",
              month: "short",
              day: "numeric",
            })}
          </Text>
        )}

        <Text style={[styles.status, { color }]}>{label}</Text>

        {medication.enabled && isDue && onOpenReminderActions && (
          <TouchableOpacity
            style={styles.reminderButton}
            onPress={onOpenReminderActions}
          >
            <Ionicons
              name="notifications-outline"
              size={18}
              color="#4361EE"
              style={{ marginRight: 6 }}
            />
            <Text style={styles.reminderText}>Open Reminder</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.actions}>
        {onToggle && (
          <TouchableOpacity onPress={onToggle} style={styles.actionButton}>
            <Ionicons
              name={medication.enabled ? "pause" : "play"}
              size={20}
              color="#666"
            />
          </TouchableOpacity>
        )}
        {onEdit && (
          <TouchableOpacity onPress={onEdit} style={styles.actionButton}>
            <Ionicons name="create-outline" size={20} color="#666" />
          </TouchableOpacity>
        )}
        {onDelete && (
          <TouchableOpacity onPress={onDelete} style={styles.actionButton}>
            <Ionicons name="trash-outline" size={20} color="#FF3B30" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  cardDisabled: { opacity: 0.6 },
  content: { flex: 1 },
  name: { fontSize: 18, fontWeight: "bold", color: "#333", marginBottom: 4 },
  details: { fontSize: 14, color: "#666", marginBottom: 4 },
  reminderLabel: {
    fontSize: 13,
    color: "#555",
    marginBottom: 4,
    fontStyle: "italic",
  },
  status: { fontSize: 12, fontWeight: "500" },
  actions: { flexDirection: "row", alignItems: "center" },
  actionButton: { padding: 8, marginLeft: 8 },
  reminderButton: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: "#EEF2FF",
    borderRadius: 8,
  },
  reminderText: { fontSize: 14, color: "#4361EE", fontWeight: "500" },
});

export default MedCard;
