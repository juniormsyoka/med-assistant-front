import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Medication } from "../../models/Medication";
import { LogStatus } from "../../models/LogEntry";
import { MedicationStatusService } from "../../Services/centalizedMedicalStatus/MedicationStatusService";
import { ComplianceInsights } from "../../Services/centalizedMedicalStatus/ComplianceInsightsCalculator";
import { ComplianceAction } from "../../Services/ComplianceTracker";
import EditTakenMedicationModal from "../homescreen/EditTakenMedicationModal";


interface MedCardProps {
  medication: Medication & { nextReminderAt?: string; status?: LogStatus };
  complianceInsights?: ComplianceInsights;
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
  onDuplicate?: () => void; // New prop for duplication
}

const MedCard: React.FC<MedCardProps> = ({
  medication,
  complianceInsights,
  isDue = false,
  onEdit,
  onDelete,
  onToggle,
  onOpenReminderActions,
  onDuplicate,
}) => {

  const [showEditTakenModal, setShowEditTakenModal] = useState(false);

  // ✅ Use centralized service for status determination
  const status = MedicationStatusService.getEffectiveStatus(medication, complianceInsights);
  
  // ✅ Use centralized service for status configuration
  const statusConfig = MedicationStatusService.getStatusConfig(status);
  const { label, color, icon, bgColor } = statusConfig;

  // Determine if medication is taken
  const isTaken = status === 'taken';
  const takenTime = complianceInsights?.lastActionTime 
    ? new Date(complianceInsights.lastActionTime) 
    : null;
  
  // Format taken time for display
  const formatTakenTime = () => {
    if (!takenTime) return '';
    const now = new Date();
    const diffHours = Math.floor((now.getTime() - takenTime.getTime()) / (1000 * 60 * 60));
    
    if (diffHours < 1) {
      const diffMinutes = Math.floor((now.getTime() - takenTime.getTime()) / (1000 * 60));
      return `${diffMinutes} min ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hr ago`;
    } else {
      return takenTime.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

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

  // ✅ Centralized compliance percentage calculation
  const getCompliancePercentage = () => {
    if (!complianceInsights?.compliancePercentage) {
      return null;
    }
    return complianceInsights.compliancePercentage;
  };

  const compliancePercentage = getCompliancePercentage();

  // ✅ Use centralized date check
  const isLastActionToday = () => {
    return MedicationStatusService.isDateToday(complianceInsights?.lastActionTime);
  };

  // ✅ Get icon and color for last action
  const getLastActionConfig = (action?: ComplianceAction) => {
    switch (action) {
      case 'taken':
        return { icon: 'checkmark-circle' as const, color: '#4CAF50' };
      case 'missed':
        return { icon: 'close-circle' as const, color: '#FF3B30' };
      case 'snoozed':
        return { icon: 'time' as const, color: '#FF9800' };
      case 'skipped':
        return { icon: 'ban' as const, color: '#9E9E9E' };
      case 'late':
        return { icon: 'alert-circle' as const, color: '#FF6B35' };
      default:
        return { icon: 'time' as const, color: '#FF9800' };
    }
  };

  // ✅ Get action label
  const getLastActionLabel = (action?: ComplianceAction) => {
    switch (action) {
      case 'taken': return 'Taken';
      case 'missed': return 'Missed';
      case 'snoozed': return 'Snoozed';
      case 'skipped': return 'Skipped';
      case 'late': return 'Late';
      default: return 'Snoozed';
    }
  };

  const lastActionConfig = getLastActionConfig(complianceInsights?.lastAction);
  const lastActionLabel = getLastActionLabel(complianceInsights?.lastAction);

  // Handle edit press with warning for taken medications
  const handleEditPress = () => {
  if (!onEdit) return;

  if (isTaken) {
    setShowEditTakenModal(true);
  } else {
    onEdit();
  }
};


  return (
    <View
      style={[
        styles.card,
        !medication.enabled && styles.cardDisabled,
        isDue && styles.dueCard,
        isTaken && styles.takenCard,
      ]}
      pointerEvents="auto"
      renderToHardwareTextureAndroid={true}
    >
      <View style={[styles.statusIndicator, { backgroundColor: color }]} />

      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.medInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.name}>{medication.name}</Text>
              {isTaken && (
                <View style={styles.takenBadge}>
                  <Ionicons name="checkmark-circle" size={12} color="#4CAF50" />
                  <Text style={styles.takenBadgeText}>
                    Taken{takenTime ? ` • ${formatTakenTime()}` : ''}
                  </Text>
                </View>
              )}
            </View>
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

        {/* Compliance Insights Section */}
        {complianceInsights && complianceInsights.totalRecords && complianceInsights.totalRecords > 0 && (
          <View style={styles.complianceSection}>
            <View style={styles.complianceRow}>
              <View style={styles.complianceBadge}>
                <Ionicons name="stats-chart" size={12} color="#0284C7" />
                <Text style={styles.complianceText}>
                  {complianceInsights.takenCount || 0}/{complianceInsights.totalRecords} doses
                </Text>
              </View>
              
              {compliancePercentage !== null && (
                <View style={[
                  styles.compliancePercentageBadge,
                  { 
                    backgroundColor: compliancePercentage >= 80 ? '#DCFCE7' : 
                    compliancePercentage >= 50 ? '#FEF9C3' : '#FEE2E2' 
                  }
                ]}>
                  <Text style={[
                    styles.compliancePercentageText,
                    { 
                      color: compliancePercentage >= 80 ? '#166534' : 
                      compliancePercentage >= 50 ? '#854D0E' : '#991B1B' 
                    }
                  ]}>
                    {compliancePercentage}% compliance
                  </Text>
                </View>
              )}
            </View>
            
            {/* Last Action Today Indicator */}
            {isLastActionToday() && complianceInsights.lastAction && (
              <View style={styles.lastActionRow}>
                <Ionicons 
                  name={lastActionConfig.icon} 
                  size={12} 
                  color={lastActionConfig.color} 
                />
                <Text style={styles.lastActionText}>
                  {lastActionLabel} today
                </Text>
              </View>
            )}
          </View>
        )}

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
                onPress={handleEditPress} 
                style={[styles.iconButton, isTaken && styles.editButtonTaken]}
                onPressIn={(e) => e.stopPropagation()}
              >
                <Ionicons 
                  name={isTaken ? "document-text-outline" : "create-outline"} 
                  size={18} 
                  color={isTaken ? "#FF9800" : "#666"} 
                />
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
        <EditTakenMedicationModal
  visible={showEditTakenModal}
  medication={medication}
  takenTime={takenTime ? `Taken ${formatTakenTime()}` : null}
  onCancel={() => setShowEditTakenModal(false)}
  onEdit={() => {
    setShowEditTakenModal(false);
    onEdit?.();
  }}
  onDuplicate={() => {
    setShowEditTakenModal(false);
    if (onDuplicate) {
      onDuplicate();
    } else {
      onEdit?.();
    }
  }}
/>

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
    elevation: 8,
    overflow: "hidden",
    opacity: 1,
    minHeight: 100,
    zIndex: 1,
  },
  cardDisabled: { 
    opacity: 0.6,
    elevation: 4,
  },
  dueCard: {
    borderColor: "#4361EE",
    borderWidth: 2,
    backgroundColor: "#EEF2FF",
    shadowColor: "#4361EE",
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 10,
  },
  takenCard: {
    borderLeftColor: "#4CAF50",
    borderLeftWidth: 3,
  },
  statusIndicator: { 
    width: 4,
    opacity: 1,
  },
  content: { 
    flex: 1, 
    padding: 16,
    overflow: 'visible',
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  medInfo: { flex: 1 },
  nameRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  name: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1A1A1A",
    flex: 1,
    opacity: 1,
  },
  takenBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#4CAF5010",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 8,
  },
  takenBadgeText: {
    fontSize: 11,
    color: "#4CAF50",
    marginLeft: 4,
    fontWeight: "600",
  },
  detailsRow: { 
    flexDirection: "row", 
    flexWrap: "wrap",
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
    opacity: 1,
  },
  detailText: { 
    fontSize: 12, 
    color: "#666", 
    marginLeft: 4, 
    fontWeight: "500",
    opacity: 1,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    opacity: 1,
  },
  statusText: { 
    fontSize: 12, 
    fontWeight: "600", 
    marginLeft: 4,
    opacity: 1,
  },
  // New compliance styles
  complianceSection: {
    marginBottom: 12,
  },
  complianceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  complianceBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0F9FF",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  complianceText: {
    fontSize: 11,
    color: "#0284C7",
    marginLeft: 4,
    fontWeight: "500",
  },
  compliancePercentageBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  compliancePercentageText: {
    fontSize: 11,
    fontWeight: "600",
  },
  lastActionRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  lastActionText: {
    fontSize: 11,
    color: "#666",
    marginLeft: 6,
    fontWeight: "500",
  },
  reminderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    padding: 8,
    backgroundColor: "#F8F9FA",
    borderRadius: 8,
    opacity: 1,
  },
  reminderText: { 
    fontSize: 12, 
    color: "#666", 
    marginLeft: 6,
    opacity: 1,
  },
  actions: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    alignItems: "center",
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
    opacity: 1,
  },
  primaryActionText: { 
    fontSize: 14, 
    color: "#FFF", 
    fontWeight: "600", 
    marginLeft: 6,
    opacity: 1,
  },
  secondaryActions: { 
    flexDirection: "row",
    opacity: 1,
  },
  iconButton: {
    padding: 8,
    marginLeft: 4,
    borderRadius: 8,
    backgroundColor: "#F5F5F5",
    opacity: 1,
  },
  editButtonTaken: {
    backgroundColor: "#FF980015",
  },
});

export default MedCard;