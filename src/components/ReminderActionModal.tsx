import React from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Medication } from '../models/Medication';

interface ReminderActionModalProps {
  visible: boolean;
  medication: Medication | null;
  onClose: () => void;
  onTaken: () => void;
  onMissed: () => void;
  onSnooze: (minutes: number) => void;
  onReschedule?: () => void;
}

const ReminderActionModal: React.FC<ReminderActionModalProps> = ({
  visible,
  medication,
  onClose,
  onTaken,
  onMissed,
  onSnooze,
  onReschedule,
}) => {
  if (!medication) return null;

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.title}>Reminder: {medication.name}</Text>
          <Text style={styles.subtitle}>What would you like to do?</Text>

          <TouchableOpacity style={styles.option} onPress={onTaken}>
            <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
            <Text style={styles.optionText}>I just took it</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.option} onPress={onMissed}>
            <Ionicons name="close-circle" size={24} color="#FF3B30" />
            <Text style={styles.optionText}>I won’t take it</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.option} onPress={() => onSnooze(15)}>
            <Ionicons name="time-outline" size={24} color="#FF9800" />
            <Text style={styles.optionText}>Remind me in 15 minutes</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.option} onPress={() => onSnooze(60)}>
            <Ionicons name="time-outline" size={24} color="#FF9800" />
            <Text style={styles.optionText}>Remind me in 1 hour</Text>
          </TouchableOpacity>

          {onReschedule && (
            <TouchableOpacity style={styles.option} onPress={onReschedule}>
              <Ionicons name="calendar-outline" size={24} color="#9C27B0" />
              <Text style={styles.optionText}>Reschedule</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.cancel} onPress={onClose}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    width: '85%',
  },
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#666', marginBottom: 16 },
  option: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  optionText: { marginLeft: 12, fontSize: 16 },
  cancel: { marginTop: 16, alignSelf: 'center' },
  cancelText: { color: '#FF3B30', fontWeight: '500' },
});

export default ReminderActionModal;
