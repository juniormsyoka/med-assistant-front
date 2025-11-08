import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Medication } from "../../models/Medication";
import { LogStatus } from "../../models/LogEntry";

interface MedCardProps {
  medication: Medication & { nextReminderAt?: string; status?: LogStatus };
  isDue?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  onToggle?: () => void;
  onMarkTaken?: () => void | Promise<void>;
  onMarkMissed?: () => void | Promise<void>;
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
  const status = medication.status ?? (medication.enabled ? "active" : "paused");

  const getStatusConfig = () => {
    switch (status) {
      case "taken":
        return { label: "Taken", color: "#4CAF50", icon: "checkmark-circle", bgColor: "#E8F5E8" };
      case "missed":
        return { label: "Missed", color: "#FF3B30", icon: "close-circle", bgColor: "#FFEBEE" };
      case "snoozed":
        return { label: "Snoozed", color: "#FF9800", icon: "time", bgColor: "#FFF3E0" };
      case "skipped":
        return { label: "Skipped", color: "#9E9E9E", icon: "ban", bgColor: "#FAFAFA" };
      case "late":
        return { label: "Late", color: "#FF6B35", icon: "alert-circle", bgColor: "#FFF3E0" };
      case "rescheduled":
        return { label: "Rescheduled", color: "#9C27B0", icon: "calendar", bgColor: "#F3E5F5" };
      case "active":
        return { label: "Active", color: "#4361EE", icon: "play-circle", bgColor: "#EEF2FF" };
      case "paused":
      default:
        return { label: "Paused", color: "#666", icon: "pause-circle", bgColor: "#F5F5F5" };
    }
  };

  const { label, color, icon, bgColor } = getStatusConfig();

  const formatTime = (timeString: string) => {
    try {
      const [hours, minutes] = timeString.split(":");
      const date = new Date();
      date.setHours(parseInt(hours), parseInt(minutes));
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return timeString;
    }
  };

  return (
    <View
      style={[
        styles.card,
        !medication.enabled && styles.cardDisabled,
        isDue && styles.dueCard,
      ]}
      // 🛡️ CRITICAL: Prevent modal from affecting this card's rendering
      pointerEvents="auto"
      renderToHardwareTextureAndroid={true} // 🛡️ Force hardware rendering
    >
      <View style={[styles.statusIndicator, { backgroundColor: color }]} />

      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.medInfo}>
            <Text style={styles.name}>{medication.name}</Text>
            <View style={styles.detailsRow}>
              <View style={styles.detailChip}>
                <Ionicons name="flask" size={12} color="#666" />
                <Text style={styles.detailText}>{medication.dosage}</Text>
              </View>
              <View style={styles.detailChip}>
                <Ionicons name="time" size={12} color="#666" />
                <Text style={styles.detailText}>{formatTime(medication.time)}</Text>
              </View>
            </View>
          </View>

          <View style={[styles.statusBadge, { backgroundColor: bgColor }]}>
            <Ionicons name={icon as any} size={14} color={color} />
            <Text style={[styles.statusText, { color }]}>{label}</Text>
          </View>
        </View>

        {medication.nextReminderAt && (
          <View style={styles.reminderRow}>
            <Ionicons name="notifications" size={14} color="#666" />
            <Text style={styles.reminderText}>
              Next:{" "}
              {new Date(medication.nextReminderAt).toLocaleString([], {
                weekday: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Text>
          </View>
        )}

        <View style={styles.actions}>
          {isDue && onOpenReminderActions && (
            <TouchableOpacity
              style={styles.primaryAction}
              onPress={onOpenReminderActions}
              // 🛡️ Prevent event propagation issues
              onPressIn={(e) => e.stopPropagation()}
            >
              <Ionicons name="notifications" size={16} color="#FFF" />
              <Text style={styles.primaryActionText}>Open Reminder</Text>
            </TouchableOpacity>
          )}

          <View style={styles.secondaryActions}>
            {onToggle && (
              <TouchableOpacity 
                onPress={onToggle} 
                style={styles.iconButton}
                onPressIn={(e) => e.stopPropagation()}
              >
                <Ionicons
                  name={medication.enabled ? "pause" : "play"}
                  size={18}
                  color="#666"
                />
              </TouchableOpacity>
            )}
            {onEdit && (
              <TouchableOpacity 
                onPress={onEdit} 
                style={styles.iconButton}
                onPressIn={(e) => e.stopPropagation()}
              >
                <Ionicons name="create-outline" size={18} color="#666" />
              </TouchableOpacity>
            )}
            {onDelete && (
              <TouchableOpacity 
                onPress={onDelete} 
                style={styles.iconButton}
                onPressIn={(e) => e.stopPropagation()}
              >
                <Ionicons name="trash-outline" size={18} color="#FF3B30" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    marginBottom: 12,
    flexDirection: "row",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8, // 🛡️ Increased elevation to stay above modal backdrop
    overflow: "hidden",
    // 🛡️ Force consistent rendering properties
    opacity: 1,
    minHeight: 80,
    zIndex: 1, // 🛡️ Ensure proper stacking context
  },
  cardDisabled: { 
    opacity: 0.6,
    // 🛡️ Even when disabled, ensure it's visible
    elevation: 4,
  },
  dueCard: {
    borderColor: "#4361EE",
    borderWidth: 2,
    backgroundColor: "#EEF2FF",
    shadowColor: "#4361EE",
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 10, // 🛡️ Higher elevation for due cards
  },
  statusIndicator: { 
    width: 4,
    // 🛡️ Ensure status indicator is always visible
    opacity: 1,
  },
  content: { 
    flex: 1, 
    padding: 16,
    // 🛡️ Prevent content from being clipped
    overflow: 'visible',
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  medInfo: { flex: 1 },
  name: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 8,
    // 🛡️ Ensure text is always readable
    opacity: 1,
  },
  detailsRow: { 
    flexDirection: "row", 
    flexWrap: "wrap",
    // 🛡️ Prevent row from collapsing
    minHeight: 24,
  },
  detailChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 4,
    // 🛡️ Ensure chips are always visible
    opacity: 1,
  },
  detailText: { 
    fontSize: 12, 
    color: "#666", 
    marginLeft: 4, 
    fontWeight: "500",
    opacity: 1, // 🛡️ Force text opacity
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    // 🛡️ Ensure badge is always visible
    opacity: 1,
  },
  statusText: { 
    fontSize: 12, 
    fontWeight: "600", 
    marginLeft: 4,
    opacity: 1, // 🛡️ Force text opacity
  },
  reminderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    padding: 8,
    backgroundColor: "#F8F9FA",
    borderRadius: 8,
    // 🛡️ Ensure reminder row is always visible
    opacity: 1,
  },
  reminderText: { 
    fontSize: 12, 
    color: "#666", 
    marginLeft: 6,
    opacity: 1, // 🛡️ Force text opacity
  },
  actions: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    alignItems: "center",
    // 🛡️ Ensure actions are always visible
    opacity: 1,
    minHeight: 40,
  },
  primaryAction: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#4361EE",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    flex: 1,
    marginRight: 12,
    justifyContent: "center",
    // 🛡️ Ensure button is always visible
    opacity: 1,
  },
  primaryActionText: { 
    fontSize: 14, 
    color: "#FFF", 
    fontWeight: "600", 
    marginLeft: 6,
    opacity: 1, // 🛡️ Force text opacity
  },
  secondaryActions: { 
    flexDirection: "row",
    // 🛡️ Ensure secondary actions are always visible
    opacity: 1,
  },
  iconButton: {
    padding: 8,
    marginLeft: 4,
    borderRadius: 8,
    backgroundColor: "#F5F5F5",
    // 🛡️ Ensure icon buttons are always visible
    opacity: 1,
  },
});

export default MedCard;