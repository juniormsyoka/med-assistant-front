// screens/AddAppointmentScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  Platform,
  Text,
  TouchableOpacity,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import { useTheme } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import TextInputField from '../components/chat/TextInputField';
import PrimaryButton from '../components/homescreen/PrimaryButton';
//import { addAppointment, updateAppointment } from '../Services/storage';
import { Appointment, CreateAppointment } from '../models/Appointment';
import { scheduleAppointmentReminder } from '../Services/notifications';
import { dataService } from '../Services/dataService';


const appointmentTypes = [
  { label: 'Doctor Visit', value: 'doctor', icon: 'medical' },
  { label: 'Dentist', value: 'dentist', icon: 'accessibility' },
  { label: 'Specialist', value: 'specialist', icon: 'person' },
  { label: 'Lab Work', value: 'lab', icon: 'flask' },
  { label: 'Surgery', value: 'surgery', icon: 'cut' },
  { label: 'Other', value: 'other', icon: 'calendar' },
];

const reminderOptions = [
  { label: '15 minutes before', value: 15, icon: 'time' },
  { label: '30 minutes before', value: 30, icon: 'time' },
  { label: '1 hour before', value: 60, icon: 'time' },
  { label: '1 day before', value: 1440, icon: 'calendar' },
  { label: '2 days before', value: 2880, icon: 'calendar' },
];

const AddAppointmentScreen = ({ navigation, route }: any) => {
  const editingAppointment = route.params?.appointment;
  const { colors } = useTheme();

  const [title, setTitle] = useState(editingAppointment?.title || '');
  const [type, setType] = useState<Appointment['type']>(editingAppointment?.type || 'doctor');
  const [date, setDate] = useState(editingAppointment?.date || new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState(editingAppointment?.time || '09:00');
  const [location, setLocation] = useState(editingAppointment?.location || '');
  const [doctorName, setDoctorName] = useState(editingAppointment?.doctorName || '');
  const [notes, setNotes] = useState(editingAppointment?.notes || '');
  const [selectedReminders, setSelectedReminders] = useState<number[]>(
    editingAppointment?.reminderMinutes || [60, 1440]
  );
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  useEffect(() => {
    if (editingAppointment) {
      setTitle(editingAppointment.title);
      setType(editingAppointment.type);
      setDate(editingAppointment.date);
      setTime(editingAppointment.time);
      setLocation(editingAppointment.location || '');
      setDoctorName(editingAppointment.doctorName || '');
      setNotes(editingAppointment.notes || '');
      setSelectedReminders(editingAppointment.reminderMinutes);
    }
  }, [editingAppointment]);

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setDate(selectedDate.toISOString().split('T')[0]);
    }
  };

  const handleTimeChange = (event: any, selectedDate?: Date) => {
    setShowTimePicker(Platform.OS === 'ios');
    if (selectedDate) {
      const hours = selectedDate.getHours().toString().padStart(2, '0');
      const minutes = selectedDate.getMinutes().toString().padStart(2, '0');
      setTime(`${hours}:${minutes}`);
    }
  };

  const toggleReminder = (minutes: number) => {
    setSelectedReminders(prev =>
      prev.includes(minutes)
        ? prev.filter(m => m !== minutes)
        : [...prev, minutes]
    );
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter an appointment title');
      return;
    }

    try {
      const appointmentData: CreateAppointment = {
        title: title.trim(),
        type,
        date,
        time,
        location: location.trim() || undefined,
        doctorName: doctorName.trim() || undefined,
        notes: notes.trim() || undefined,
        reminderMinutes: selectedReminders,
        isCompleted: false,
      };

      if (editingAppointment?.id) {
       // await updateAppointment(editingAppointment.id, appointmentData);
       await dataService.updateAppointment(editingAppointment.id, appointmentData);
        Alert.alert('Success', 'Appointment updated successfully');
      } else {
       // await addAppointment(appointmentData);
        await dataService.addAppointment(appointmentData);
        Alert.alert('Success', 'Appointment added successfully');
      }

      const fullAppointment: Appointment = {
        id: editingAppointment?.id || Date.now(),
        ...appointmentData,
      };
      await scheduleAppointmentReminder(fullAppointment);

      navigation.goBack();
    } catch (error) {
      console.error('Error saving appointment:', error);
      Alert.alert('Error', 'Failed to save appointment');
    }
  };

  const getAppointmentIcon = (appointmentType: string) => {
    const type = appointmentTypes.find(t => t.value === appointmentType);
    return type?.icon || 'calendar';
  };

  const formatDisplayDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
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
          {editingAppointment ? 'Edit Appointment' : 'New Appointment'}
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
            Appointment Details
          </Text>
          <View style={[styles.sectionCard, { backgroundColor: colors.card }]}>
            <TextInputField
              label="Appointment Title"
              placeholder="e.g., Annual Checkup, Dental Cleaning"
              value={title}
              onChangeText={setTitle}
              autoCapitalize="words"
              icon="document-text"
            />

            <View style={styles.pickerContainer}>
              <Text style={[styles.pickerLabel, { color: colors.text }]}>Appointment Type</Text>
              <Picker
                selectedValue={type}
                onValueChange={(val) => setType(val)}
                style={{ color: colors.text }}
                dropdownIconColor={colors.text}
              >
                {appointmentTypes.map(aptType => (
                  <Picker.Item 
                    key={aptType.value} 
                    label={aptType.label} 
                    value={aptType.value} 
                  />
                ))}
              </Picker>
            </View>
          </View>
        </View>

        {/* Date & Time Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Date & Time
          </Text>
          <View style={[styles.sectionCard, { backgroundColor: colors.card }]}>
            <TouchableOpacity 
              style={[styles.dateTimeInput, { backgroundColor: colors.background }]}
              onPress={() => setShowDatePicker(true)}
            >
              <Ionicons name="calendar" size={20} color={colors.primary} />
              <Text style={[styles.dateTimeText, { color: colors.text }]}>
                {formatDisplayDate(date)}
              </Text>
              <Ionicons name="chevron-down" size={20} color={colors.text} />
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={new Date(date)}
                mode="date"
                display="default"
                onChange={handleDateChange}
                minimumDate={new Date()}
              />
            )}

            <TouchableOpacity 
              style={[styles.dateTimeInput, { backgroundColor: colors.background }]}
              onPress={() => setShowTimePicker(true)}
            >
              <Ionicons name="time" size={20} color={colors.primary} />
              <Text style={[styles.dateTimeText, { color: colors.text }]}>{time}</Text>
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
          </View>
        </View>

        {/* Additional Information Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Additional Information
          </Text>
          <View style={[styles.sectionCard, { backgroundColor: colors.card }]}>
            <TextInputField
              label="Location (Optional)"
              placeholder="e.g., City Hospital, Dental Clinic"
              value={location}
              onChangeText={setLocation}
              icon="location"
            />

            <TextInputField
              label="Doctor Name (Optional)"
              placeholder="e.g., Dr. Smith"
              value={doctorName}
              onChangeText={setDoctorName}
              icon="person"
            />

            <TextInputField
              label="Notes (Optional)"
              placeholder="Any special instructions or notes"
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
              icon="clipboard"
            />
          </View>
        </View>

        {/* Reminders Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Reminders
          </Text>
          <View style={[styles.sectionCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.remindersDescription, { color: colors.text }]}>
              Get notified before your appointment
            </Text>
            
            {reminderOptions.map(option => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.reminderOption,
                  { 
                    backgroundColor: colors.background,
                    borderColor: selectedReminders.includes(option.value) 
                      ? colors.primary 
                      : colors.border
                  }
                ]}
                onPress={() => toggleReminder(option.value)}
              >
                <View style={styles.reminderOptionLeft}>
                  <Ionicons 
                    name={option.icon as any} 
                    size={18} 
                    color={colors.primary} 
                  />
                  <Text style={[styles.reminderLabel, { color: colors.text }]}>
                    {option.label}
                  </Text>
                </View>
                <View style={[
                  styles.checkbox,
                  { 
                    backgroundColor: selectedReminders.includes(option.value) 
                      ? colors.primary 
                      : 'transparent',
                    borderColor: selectedReminders.includes(option.value) 
                      ? colors.primary 
                      : colors.border
                  }
                ]}>
                  {selectedReminders.includes(option.value) && (
                    <Ionicons name="checkmark" size={14} color="#FFF" />
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <PrimaryButton
          title={editingAppointment ? 'Update Appointment' : 'Create Appointment'}
          onPress={handleSave}
          disabled={!title.trim()}
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
    marginBottom: 60
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
  pickerContainer: {
    marginVertical: 8,
  },
  pickerLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
    marginLeft: 4,
  },
  dateTimeInput: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  dateTimeText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
  },
  remindersDescription: {
    fontSize: 14,
    marginBottom: 12,
    opacity: 0.8,
  },
  reminderOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
    marginBottom: 8,
  },
  reminderOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  reminderLabel: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButton: { 
    marginTop: 8, 
    marginBottom: 32 
  },
});

export default AddAppointmentScreen;