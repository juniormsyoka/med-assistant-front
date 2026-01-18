// components/homescreen/EditTakenMedicationModal.tsx
import React from "react";
import { Modal, View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Medication } from "../../models/Medication";

interface Props {
  visible: boolean;
  medication?: Medication;
  takenTime?: string | null;
  onEdit: () => void;
  onDuplicate: () => void;
  onCancel: () => void;
}

export const EditTakenMedicationModal: React.FC<Props> = ({
  visible,
  medication,
  takenTime,
  onEdit,
  onDuplicate,
  onCancel,
}) => {
  if (!visible || !medication) return null;

  return (
    <Modal transparent animationType="fade" visible={visible}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header with icon */}
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Ionicons name="alert-circle" size={24} color="#FF9800" />
            </View>
            <Text style={styles.title}>Edit Taken Medication</Text>
          </View>

          {/* Medication info */}
          <View style={styles.medicationInfo}>
            <Text style={styles.medicationName}>{medication.name}</Text>
            <View style={styles.detailsRow}>
              <View style={styles.detail}>
                <Ionicons name="flask" size={14} color="#666" />
                <Text style={styles.detailText}>{medication.dosage}</Text>
              </View>
              {takenTime && (
                <View style={styles.detail}>
                  <Ionicons name="time" size={14} color="#666" />
                  <Text style={styles.detailText}>{takenTime}</Text>
                </View>
              )}
            </View>
          </View>

          {/* Warning message */}
          <View style={styles.warningBox}>
            <Ionicons name="information-circle" size={18} color="#FF9800" />
            <Text style={styles.warningText}>
              This medication was marked as taken. Editing may affect your compliance records.
            </Text>
          </View>

          {/* Buttons */}
          <View style={styles.buttonsContainer}>
            <TouchableOpacity 
              style={[styles.button, styles.createNewButton]} 
              onPress={onDuplicate}
            >
              <Ionicons name="copy-outline" size={20} color="#4361EE" />
              <Text style={styles.createNewButtonText}>Create New</Text>
            </TouchableOpacity>

            <View style={styles.bottomActions}>
              <TouchableOpacity 
                style={[styles.button, styles.cancelButton]} 
                onPress={onCancel}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.button, styles.editButton]} 
                onPress={onEdit}
              >
                <Text style={styles.editButtonText}>Edit Anyway</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  container: {
    width: "100%",
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 20,
    maxWidth: 400,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FF980020",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1A1A1A",
    flex: 1,
  },
  medicationInfo: {
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  medicationName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1A1A1A",
    marginBottom: 8,
  },
  detailsRow: {
    flexDirection: "row",
    gap: 12,
  },
  detail: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  detailText: {
    fontSize: 12,
    color: "#666",
    fontWeight: "500",
  },
  warningBox: {
    flexDirection: "row",
    backgroundColor: "#FFF3E0",
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    gap: 10,
    alignItems: "flex-start",
  },
  warningText: {
    fontSize: 13,
    color: "#E65100",
    flex: 1,
    lineHeight: 18,
    fontWeight: "500",
  },
  buttonsContainer: {
    gap: 12,
  },
  button: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  createNewButton: {
    backgroundColor: "#EEF2FF",
    borderWidth: 1,
    borderColor: "#4361EE",
  },
  createNewButtonText: {
    color: "#4361EE",
    fontSize: 16,
    fontWeight: "600",
  },
  bottomActions: {
    flexDirection: "row",
    gap: 10,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  cancelButtonText: {
    color: "#666",
    fontSize: 16,
    fontWeight: "600",
  },
  editButton: {
    flex: 1,
    backgroundColor: "#FF9800",
  },
  editButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default EditTakenMedicationModal;