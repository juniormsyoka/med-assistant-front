import React from "react";
import { View, Text } from "react-native";
import { Medication } from "../../models/Medication";
import MedCard from "./MedCard";

interface Props {
  medications: Medication[];
  navigation: any;
  isMedicationDue: (med: Medication) => boolean;
  onDelete: (med: Medication) => void | Promise<void>;
  onMarkTaken?: (med: Medication) => void | Promise<void>;
  onMarkMissed?: (med: Medication) => void | Promise<void>;
  onOpenReminderActions?: (med: Medication) => void | Promise<void>;
}

const MedicationList: React.FC<Props> = ({
  medications,
  navigation,
  isMedicationDue,
  onDelete,
  onMarkTaken,
  onMarkMissed,
  onOpenReminderActions,
}) => {
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
          {medications.length} items
        </Text>
      </View>

      {medications.map((med) => (
        <MedCard
          key={med.id}
          medication={med}
          isDue={isMedicationDue(med)}
          onEdit={() => navigation.navigate("Add", { medication: med })}
          onDelete={() => onDelete(med)}
          onToggle={() => console.log("Toggle medication")}
          onMarkTaken={() => onMarkTaken?.(med)}
          onMarkMissed={() => onMarkMissed?.(med)}
          onOpenReminderActions={() => onOpenReminderActions?.(med)}
        />
      ))}
    </View>
  );
};

export default MedicationList;