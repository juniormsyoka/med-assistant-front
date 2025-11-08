// components/homescreen/DeleteConfirmationModal.tsx
import React from "react";
import { Modal, View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Medication } from "../../models/Medication";

interface Props {
  visible: boolean;
  medication?: Medication | null;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void | Promise<void>;
}

export const DeleteConfirmationModal: React.FC<Props> = ({
  visible,
  medication,
  onConfirm,
  onCancel,
}) => {
  if (!visible) return null;

  return (
    <Modal transparent animationType="fade" visible={visible}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Text style={styles.title}>Delete Medication</Text>
          <Text style={styles.message}>
            Are you sure you want to delete{" "}
            <Text style={{ fontWeight: "700" }}>
              {medication?.name ?? "this medication"}
            </Text>
            ?
          </Text>

          <View style={styles.actions}>
            <TouchableOpacity style={[styles.button, styles.cancel]} onPress={onCancel}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, styles.confirm]} onPress={onConfirm}>
              <Text style={styles.confirmText}>Delete</Text>
            </TouchableOpacity>
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
  },
  title: { fontSize: 18, fontWeight: "700", marginBottom: 10 },
  message: { fontSize: 14, color: "#444", marginBottom: 20 },
  actions: { flexDirection: "row", justifyContent: "flex-end" },
  button: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    marginLeft: 10,
  },
  cancel: { backgroundColor: "#EEE" },
  confirm: { backgroundColor: "#FF3B30" },
  cancelText: { color: "#333", fontWeight: "600" },
  confirmText: { color: "#FFF", fontWeight: "600" },
});
