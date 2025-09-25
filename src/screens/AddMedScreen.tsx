import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Alert, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import AppHeader from '../components/AppHeader';
import TextInputField from '../components/TextInputField';
import PrimaryButton from '../components/PrimaryButton';
import { addMedication } from '../Services/storage';
import { Medication, CreateMedication } from '../models/Medication';
import { scheduleMedicationReminder } from '../Services/notifications';

const weekdays = [
  { label: 'Sunday', value: 1 },
  { label: 'Monday', value: 2 },
  { label: 'Tuesday', value: 3 },
  { label: 'Wednesday', value: 4 },
  { label: 'Thursday', value: 5 },
  { label: 'Friday', value: 6 },
  { label: 'Saturday', value: 7 },
];

const AddMedScreen = ({ navigation, route }: any) => {
  const editingMedication = route.params?.medication;
  
  const [name, setName] = useState(editingMedication?.name || '');
  const [dosage, setDosage] = useState(editingMedication?.dosage || '');
  const [time, setTime] = useState(() => {
    if (editingMedication?.time) {
      // if stored as ISO, convert to HH:mm for display
      const d = new Date(editingMedication.time);
      return `${d.getHours().toString().padStart(2, '0')}:${d
        .getMinutes()
        .toString()
        .padStart(2, '0')}`;
    }
    return '08:00';
  });
  const [repeatType, setRepeatType] = useState<'daily' | 'weekly' | 'monthly'>(
    editingMedication?.repeatType || 'daily'
  );
  const [weekday, setWeekday] = useState<number>(editingMedication?.weekday || 2);
  const [day, setDay] = useState<number>(editingMedication?.day || 1);
  const [showTimePicker, setShowTimePicker] = useState(false);

  useEffect(() => {
    if (editingMedication) {
      setName(editingMedication.name);
      setDosage(editingMedication.dosage);
      setRepeatType(editingMedication.repeatType || 'daily');
      if (editingMedication.weekday) setWeekday(editingMedication.weekday);
      if (editingMedication.day) setDay(editingMedication.day);
    }
  }, [editingMedication]);

  const handleTimeChange = (event: any, selectedDate?: Date) => {
    setShowTimePicker(Platform.OS === 'ios');
    if (selectedDate) {
      const hours = selectedDate.getHours().toString().padStart(2, '0');
      const minutes = selectedDate.getMinutes().toString().padStart(2, '0');
      setTime(`${hours}:${minutes}`);
    }
  };

  const handleSave = async () => {
    if (!name.trim() || !dosage.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    try {
      // Convert HH:mm into ISO
      const [hours, minutes] = time.split(':').map(Number);
      const scheduledDate = new Date();
      scheduledDate.setHours(hours, minutes, 0, 0);
      const isoTime = scheduledDate.toISOString();

      const medicationData: CreateMedication = {
        name: name.trim(),
        dosage: dosage.trim(),
        time: isoTime, // ✅ store ISO always
        enabled: true,
        repeatType,
        weekday: repeatType === 'weekly' ? weekday : undefined,
        day: repeatType === 'monthly' ? day : undefined,
      };

      const medId = await addMedication(medicationData);

      const medication: Medication = {
        id: medId,
        ...medicationData,
        createdAt: new Date().toISOString(),
      };

      // 🔔 Schedule notification
      const nextReminder = await scheduleMedicationReminder(medication);

      // Make sure it's a Date object before formatting
      const reminderDate =
        nextReminder instanceof Date ? nextReminder : new Date(nextReminder);

      Alert.alert(
        editingMedication ? 'Medication Updated' : 'Medication Added',
        `Next reminder for ${medication.name} will go off at ${reminderDate.toLocaleString([], {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })}`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error('Error saving medication:', error);
      Alert.alert('Error', 'Failed to save medication');
    }
  };

  return (
    <View style={styles.container}>
      <AppHeader
        title={editingMedication ? 'Edit Medication' : 'Add Medication'}
        showBack
        onBackPress={() => navigation.goBack()}
      />
      <ScrollView style={styles.content}>
        <TextInputField
          label="Medication Name"
          placeholder="e.g., Ibuprofen, Vitamin D"
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
        />
        <TextInputField
          label="Dosage"
          placeholder="e.g., 200mg, 1 tablet"
          value={dosage}
          onChangeText={setDosage}
        />
        <TextInputField
          label="Time"
          value={time}
          placeholder="Select time"
          onFocus={() => setShowTimePicker(true)}
          showSoftInputOnFocus={false}
        />
        {showTimePicker && (
          <DateTimePicker
            value={new Date(`2000-01-01T${time}:00`)}
            mode="time"
            is24Hour={true}
            onChange={handleTimeChange}
          />
        )}
        <View style={styles.pickerContainer}>
          <Picker selectedValue={repeatType} onValueChange={(val) => setRepeatType(val)}>
            <Picker.Item label="Daily" value="daily" />
            <Picker.Item label="Weekly" value="weekly" />
            <Picker.Item label="Monthly" value="monthly" />
          </Picker>
        </View>
        {repeatType === 'weekly' && (
          <View style={styles.pickerContainer}>
            <Picker selectedValue={weekday} onValueChange={(val) => setWeekday(val)}>
              {weekdays.map((day) => (
                <Picker.Item key={day.value} label={day.label} value={day.value} />
              ))}
            </Picker>
          </View>
        )}
        {repeatType === 'monthly' && (
          <View style={styles.pickerContainer}>
            <Picker selectedValue={day} onValueChange={(val) => setDay(val)}>
              {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                <Picker.Item key={d} label={`Day ${d}`} value={d} />
              ))}
            </Picker>
          </View>
        )}
        <PrimaryButton
          title={editingMedication ? 'Update Medication' : 'Add Medication'}
          onPress={handleSave}
          disabled={!name.trim() || !dosage.trim()}
          style={styles.saveButton}
        />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  content: { flex: 1, padding: 16 },
  pickerContainer: { backgroundColor: '#fff', borderRadius: 8, marginVertical: 12 },
  saveButton: { marginTop: 24 },
});

export default AddMedScreen;
