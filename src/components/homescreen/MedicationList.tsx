import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Medication } from "../../models/Medication";
import MedCard from "./MedCard";
import { ComplianceInsights } from "../../Services/centalizedMedicalStatus/ComplianceInsightsCalculator";
import { useAuth } from '@/contexts/AuthContext';
import { Ionicons } from "@expo/vector-icons";

interface Props {
  medications: Medication[];
  navigation: any;
  isMedicationDue?: (med: Medication) => boolean;
  onDelete?: (med: Medication) => void | Promise<void>;
  onMarkTaken?: (med: Medication) => void | Promise<void>;
  onMarkMissed?: (med: Medication) => void | Promise<void>;
  onOpenReminderActions?: (med: Medication) => void | Promise<void>;
  complianceInsights?: Record<number, ComplianceInsights>;
  isLoading?: boolean;
  onAddMedication?: () => void;
}

const MedicationList: React.FC<Props> = ({
  medications = [],
  navigation,
  isMedicationDue = () => false,
  onDelete,
  onMarkTaken,
  onMarkMissed,
  onOpenReminderActions,
  complianceInsights = {},
  isLoading = false,
  onAddMedication,
}) => {
  const { user } = useAuth();
  
  // Handle duplicate medication
  const handleDuplicateMedication = (med: Medication) => {
    navigation.navigate("Add", { 
      medication: {
        ...med,
        id: undefined, // Remove ID to create new
        name: `${med.name} (Copy)`, // Suggest duplicate name
        status: 'active', // Reset status
        enabled: true, // Ensure it's enabled
        nextReminderAt: undefined, // Clear next reminder
        // Reset compliance insights
        compliance: undefined
      }
    });
  };
  
  // Loading state
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading medications...</Text>
      </View>
    );
  }
  
  // Guest state (no user logged in)
  if (!user) {
    return (
      <View style={styles.guestContainer}>
        <View style={styles.guestIconContainer}>
          <Ionicons name="medical-outline" size={48} color="#4361EE" />
        </View>
        <Text style={styles.guestTitle}>Track Your Medications</Text>
        <Text style={styles.guestText}>
          Sign in to manage your medications, set reminders, and track your health compliance.
        </Text>
      </View>
    );
  }
  
  // Empty state (user logged in but no medications)
  if (medications.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconContainer}>
          <Ionicons name="medical" size={48} color="#4361EE" />
        </View>
        <Text style={styles.emptyTitle}>No Medications Added</Text>
        <Text style={styles.emptyText}>
          Add your first medication to start tracking your health journey.
        </Text>
        {onAddMedication && (
          <TouchableOpacity 
            style={styles.addButton}
            onPress={onAddMedication}
          >
            <Ionicons name="add-circle" size={20} color="white" />
            <Text style={styles.addButtonText}>Add First Medication</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }
  
  // Normal state (user logged in with medications)
  return (
    <View style={{ marginBottom: 100 }}>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <Text style={{ fontSize: 20, fontWeight: "700" }}>Your Medications</Text>
        <Text style={{ fontSize: 14, color: "#666", fontWeight: "500" }}>
          {medications.length} {medications.length === 1 ? 'item' : 'items'}
        </Text>
      </View>

      {medications.map(med => (
        <MedCard
          key={med.id}
          medication={med}
          complianceInsights={med.id ? complianceInsights[med.id] : undefined}
          isDue={isMedicationDue(med)}
          onEdit={() => navigation.navigate("Add", { medication: med })}
          onDelete={onDelete ? () => onDelete(med) : undefined}
          onMarkTaken={onMarkTaken ? () => onMarkTaken(med) : undefined}
          onMarkMissed={onMarkMissed ? () => onMarkMissed(med) : undefined}
          onOpenReminderActions={onOpenReminderActions ? () => onOpenReminderActions(med) : undefined}
          onDuplicate={() => handleDuplicateMedication(med)} // Pass duplicate handler
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    fontSize: 16,
    color: "#666",
    marginTop: 12,
  },
  guestContainer: {
    padding: 32,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    marginVertical: 16,
  },
  guestIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#4361EE15",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  guestTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
    textAlign: "center",
  },
  guestText: {
    fontSize: 15,
    color: "#666",
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: 8,
  },
  emptyContainer: {
    padding: 32,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    marginVertical: 16,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#4361EE15",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
    textAlign: "center",
  },
  emptyText: {
    fontSize: 15,
    color: "#666",
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: 8,
    marginBottom: 20,
  },
  addButton: {
    flexDirection: "row",
    backgroundColor: "#4361EE",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  addButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default MedicationList;