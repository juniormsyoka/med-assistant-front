// screens/AddMedScreen.tsx
import React, { useState, useEffect } from 'react';
import { 
  View, 
  ScrollView, 
  StyleSheet, 
  Alert, 
  Platform, 
  Text,
  TouchableOpacity 
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import { useTheme } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import TextInputField from '../components/chat/TextInputField';
import PrimaryButton from '../components/homescreen/PrimaryButton';
//import { addMedication, updateMedication } from '../Services/storage';
import { Medication, CreateMedication } from '../models/Medication';
import { scheduleMedicationReminder } from '../Services/notifications';
import { dataService } from '../Services/dataService';


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
  const { colors } = useTheme();

  const [name, setName] = useState(editingMedication?.name || '');
  const [dosage, setDosage] = useState(editingMedication?.dosage || '');
  const [time, setTime] = useState(() => {
    if (editingMedication?.time) {
      if (editingMedication.time.includes('T')) {
        const d = new Date(editingMedication.time);
        return `${d.getHours().toString().padStart(2, '0')}:${d
          .getMinutes()
          .toString()
          .padStart(2, '0')}`;
      }
      return editingMedication.time;
    }
    return '08:00';
  });
  const [repeatType, setRepeatType] = useState<'once'|'daily' | 'weekly' | 'monthly'>(
    editingMedication?.repeatType || 'daily'
  );
  const [weekday, setWeekday] = useState<number>(editingMedication?.weekday || 2);
  const [day, setDay] = useState<number>(editingMedication?.day || 1);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Supply tracking states
  const [trackSupply, setTrackSupply] = useState(!!editingMedication?.supplyInfo);
  const [totalQuantity, setTotalQuantity] = useState(
    editingMedication?.supplyInfo?.totalQuantity?.toString() || '30'
  );
  const [units, setUnits] = useState<'pills' | 'bottles' | 'puffs' | 'patches' | 'doses'>(
    editingMedication?.supplyInfo?.units || 'pills'
  );
  const [dosagePerUse, setDosagePerUse] = useState(
    editingMedication?.supplyInfo?.dosagePerUse?.toString() || '1'
  );

  useEffect(() => {
    if (editingMedication) {
      setName(editingMedication.name);
      setDosage(editingMedication.dosage);
      setRepeatType(editingMedication.repeatType || 'daily');
      if (editingMedication.weekday) setWeekday(editingMedication.weekday);
      if (editingMedication.day) setDay(editingMedication.day);
      if (editingMedication.supplyInfo) {
        setTrackSupply(true);
        setTotalQuantity(editingMedication.supplyInfo.totalQuantity.toString());
        setUnits(editingMedication.supplyInfo.units);
        setDosagePerUse(editingMedication.supplyInfo.dosagePerUse.toString());
      }
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
      const medicationData: CreateMedication = {
        name: name.trim(),
        dosage: dosage.trim(),
        time: time,
        enabled: true,
        status: 'active',
        repeatType,
        weekday: repeatType === 'weekly' ? weekday : undefined,
        day: repeatType === 'monthly' ? day : undefined,
        supplyInfo: trackSupply ? {
          totalQuantity: parseInt(totalQuantity) || 0,
          units,
          dosagePerUse: parseInt(dosagePerUse) || 1,
        } : undefined,
      };

      let medId: number;

        if (editingMedication?.id) {
          await dataService.updateMedication(editingMedication.id, medicationData);
          medId = editingMedication.id;
        } else {
          medId = await dataService.addMedication(medicationData);
        }


      const medication: Medication = {
        id: medId,
        ...medicationData,
        createdAt: new Date().toISOString(),
      };

     // const nextReminder = await scheduleMedicationReminder(medication);
    //  const reminderDate = nextReminder instanceof Date ? nextReminder : new Date(nextReminder);

    const nextReminder = await scheduleMedicationReminder(medication);

if (!nextReminder) {
  // No reminder scheduled (e.g., one-time past reminder)
  Alert.alert('Reminder skipped', 'The scheduled medication time has already passed.');
  return;
}

// nextReminder is guaranteed to be a Date here
const reminderDate = nextReminder;

      Alert.alert(
        editingMedication ? 'Medication Updated' : 'Medication Added',
        `Next reminder for ${medication.name} will go off at ${reminderDate.toLocaleString([], {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })}`,
        [{ 
          text: 'OK', 
          onPress: () => {
            navigation.navigate('Home', { refresh: true });
          }
        }]
      );
    } catch (error) {
      console.error('Error saving medication:', error);
      Alert.alert('Error', 'Failed to save medication');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Custom Header */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {editingMedication ? 'Edit Medication' : 'Add Medication'}
        </Text>
        <View style={styles.headerPlaceholder} />
      </View>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Basic Information Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Basic Information
          </Text>
          <View style={[styles.sectionCard, { backgroundColor: colors.card }]}>
            <TextInputField
              label="Medication Name"
              placeholder="e.g., Ibuprofen, Vitamin D"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              icon="medical"
            />
            <TextInputField
              label="Dosage"
              placeholder="e.g., 200mg, 1 tablet"
              value={dosage}
              onChangeText={setDosage}
              icon="fitness"
            />
          </View>
        </View>

        {/* Schedule Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Schedule
          </Text>
          <View style={[styles.sectionCard, { backgroundColor: colors.card }]}>
            <TouchableOpacity 
              style={[styles.timeInput, { backgroundColor: colors.background }]}
              onPress={() => setShowTimePicker(true)}
            >
              <Ionicons name="time" size={20} color={colors.primary} />
              <Text style={[styles.timeText, { color: colors.text }]}>{time}</Text>
              <Ionicons name="chevron-down" size={20} color={colors.text} />
            </TouchableOpacity>
            {showTimePicker && (
              <DateTimePicker
                value={new Date(`2000-01-01T${time}:00`)}
                mode="time"
                is24Hour={false}
                onChange={handleTimeChange}
              />
            )}

            <View style={styles.pickerContainer}>
              <Text style={[styles.pickerLabel, { color: colors.text }]}>Repeat</Text>
              <Picker
                selectedValue={repeatType}
                onValueChange={(val: 'once'|'daily' | 'weekly' | 'monthly') => setRepeatType(val)}
                style={{ color: colors.text }}
                dropdownIconColor={colors.text}
              >
                <Picker.Item label="Once" value="once" />
                <Picker.Item label="Daily" value="daily" />
                <Picker.Item label="Weekly" value="weekly" />
                <Picker.Item label="Monthly" value="monthly" />
              </Picker>

            </View>

            {repeatType === 'weekly' && (
              <View style={styles.pickerContainer}>
                <Text style={[styles.pickerLabel, { color: colors.text }]}>Day of Week</Text>
                <Picker
                  selectedValue={weekday}
                  onValueChange={(val: number) => setWeekday(val)}
                  style={{ color: colors.text }}
                  dropdownIconColor={colors.text}
                >
                  {weekdays.map((day) => (
                    <Picker.Item key={day.value} label={day.label} value={day.value} />
                  ))}
                </Picker>

              </View>
            )}

            {repeatType === 'monthly' && (
              <View style={styles.pickerContainer}>
                <Text style={[styles.pickerLabel, { color: colors.text }]}>Day of Month</Text>
                <Picker
                  selectedValue={day}
                  onValueChange={(val: number) => setDay(val)}
                  style={{ color: colors.text }}
                  dropdownIconColor={colors.text}
                >
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                    <Picker.Item key={d} label={`Day ${d}`} value={d} />
                  ))}
                </Picker>

              </View>
            )}
          </View>
        </View>

        {/* Supply Tracking Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Supply Tracking
          </Text>
          <View style={[styles.sectionCard, { backgroundColor: colors.card }]}>
            <TouchableOpacity 
              style={styles.toggleRow}
              onPress={() => setTrackSupply(!trackSupply)}
            >
              <Text style={[styles.toggleLabel, { color: colors.text }]}>
                Track Medication Supply
              </Text>
              <View style={[
                styles.toggle,
                { backgroundColor: trackSupply ? colors.primary : colors.border }
              ]}>
                <View style={[
                  styles.toggleThumb,
                  { 
                    backgroundColor: colors.background,
                    transform: [{ translateX: trackSupply ? 20 : 0 }]
                  }
                ]} />
              </View>
            </TouchableOpacity>

            {trackSupply && (
              <View style={styles.supplyFields}>
                <View style={styles.row}>
                  <View style={[styles.inputContainer, { flex: 2 }]}>
                    <Text style={[styles.inputLabel, { color: colors.text }]}>Total Quantity</Text>
                    <TextInputField
                      placeholder="30"
                      value={totalQuantity}
                      onChangeText={setTotalQuantity}
                      keyboardType="numeric"
                      style={styles.smallInput}
                    />
                  </View>
                  <View style={[styles.inputContainer, { flex: 1, marginLeft: 12 }]}>
                    <Text style={[styles.inputLabel, { color: colors.text }]}>Units</Text>
                    <View style={[styles.pickerContainer, { height: 50 }]}>
                      <Picker
                        selectedValue={units}
                        onValueChange={(val: 'pills' | 'bottles' | 'puffs' | 'patches' | 'doses') => setUnits(val)}
                        style={{ color: colors.text, fontSize: 14 }}
                        dropdownIconColor={colors.text}
                      >
                        <Picker.Item label="Pills" value="pills" />
                        <Picker.Item label="Bottles" value="bottles" />
                        <Picker.Item label="Puffs" value="puffs" />
                        <Picker.Item label="Patches" value="patches" />
                        <Picker.Item label="Doses" value="doses" />
                      </Picker>

                    </View>
                  </View>
                </View>
                <TextInputField
                  label="Dosage Per Use"
                  placeholder="e.g., 1"
                  value={dosagePerUse}
                  onChangeText={setDosagePerUse}
                  keyboardType="numeric"
                  icon="speedometer"
                />
              </View>
            )}
          </View>
        </View>

        <PrimaryButton
          title={editingMedication ? 'Update Medication' : 'Add Medication'}
          onPress={handleSave}
          disabled={!name.trim() || !dosage.trim()}
          style={styles.saveButton}
          icon="checkmark-circle"
        />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    paddingTop: 30 ,
    marginBottom: 70
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerPlaceholder: {
    width: 32,
  },
  content: { 
    flex: 1, 
    padding: 16 
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    marginLeft: 4,
  },
  sectionCard: {
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  timeInput: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  timeText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
  },
  pickerContainer: {
    marginVertical: 8,
  },
  pickerLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
    marginLeft: 4,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  toggle: {
    width: 50,
    height: 28,
    borderRadius: 14,
    padding: 2,
  },
  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  supplyFields: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  row: {
    flexDirection: 'row',
  },
  inputContainer: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
    marginLeft: 4,
  },
  smallInput: {
    fontSize: 14,
    paddingVertical: 8,
    color: 'grey',
  },
  saveButton: { 
    marginTop: 8, 
    marginBottom: 32 
  },
});

export default AddMedScreen;