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

import { supabase } from '@/Services/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';

import TextInputField from '../components/chat/TextInputField';
import PrimaryButton from '../components/homescreen/PrimaryButton';
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
  const { user } = useAuth();
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
  
  // Role-based state
  const isDoctor = user?.role === 'doctor';
  const [appointmentType, setAppointmentType] = useState<'personal' | 'medical'>(
    isDoctor ? 'medical' : 'personal'
  );
  const [assignedDoctor, setAssignedDoctor] = useState<any>(null);
  const [loadingDoctor, setLoadingDoctor] = useState(false);
  
  // Doctor-specific state
  const [assignedPatients, setAssignedPatients] = useState<any[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [loadingPatients, setLoadingPatients] = useState(false);

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
      
      // Determine if editing appointment is personal or medical
      if (editingAppointment.patient_id && editingAppointment.doctor_id) {
        setAppointmentType('medical');
      } else {
        setAppointmentType('personal');
      }
    } else {
      if (isDoctor) {
        loadAssignedPatients();
      } else {
        loadAssignedDoctor();
      }
    }
  }, [editingAppointment, user?.id, isDoctor]);

  const loadAssignedDoctor = async () => {
    if (!user?.id) return;
    
    setLoadingDoctor(true);
    try {
      // Get the patient's assigned doctor
      const { data, error } = await supabase
        .from('patient_doctor')
        .select(`
          doctor_id,
          doctors:doctor_id (id, full_name, specialization)
        `)
        .eq('patient_id', user.id)
        .single();

      if (data && !error && data.doctors) {
        setAssignedDoctor(data.doctors);
      }
    } catch (error) {
      console.error('Error loading assigned doctor:', error);
    } finally {
      setLoadingDoctor(false);
    }
  };

 /* const loadAssignedPatients = async () => {
    if (!user?.id) return;
    
    setLoadingPatients(true);
    try {
      // Get the doctor's assigned patients
      const { data, error } = await supabase
        .from('patient_doctor')
        .select(`
          patient_id,
          patients:patient_id (id, full_name, email)
        `)
        .eq('doctor_id', user.id);

      if (data && !error) {
        const patients = data.map(item => item.patients).filter(Boolean);
        setAssignedPatients(patients);
        
        // Auto-select first patient if only one exists
        if (patients.length === 1) {
          setSelectedPatient(patients[0]);
        }
      }
    } catch (error) {
      console.error('Error loading assigned patients:', error);
    } finally {
      setLoadingPatients(false);
    }
  };*/

  // In AddAppointmentScreen.tsx - Update the loadAssignedPatients function
const loadAssignedPatients = async () => {
  if (!user?.id) return;
  
  setLoadingPatients(true);
  try {
    // Get the doctor's assigned patients with proper data
    const { data, error } = await supabase
      .from('patient_doctor')
      .select(`
        patient_id,
        patients:patient_id (id, full_name, email)
      `)
      .eq('doctor_id', user.id);

    if (error) {
      console.error('Error loading patients:', error);
      throw error;
    }

    console.log('📊 Raw patient data:', data); // Debug log

    if (data && data.length > 0) {
      // Extract patient data properly - handle array structure
      const patients = data.map(item => {
        // The patients field might be an array, get the first item
        const patientData = Array.isArray(item.patients) 
          ? item.patients[0] 
          : item.patients;

        console.log('👤 Processing patient:', patientData); // Debug log

        return {
          id: item.patient_id,
          full_name: patientData?.full_name || 'Unknown Patient',
          email: patientData?.email || 'No email'
        };
      }).filter(patient => patient.full_name !== 'Unknown Patient'); // Filter out invalid patients

      console.log('✅ Final patients list:', patients); // Debug log
      
      setAssignedPatients(patients);
      
      // Auto-select first patient if only one exists
      if (patients.length === 1) {
        setSelectedPatient(patients[0]);
      }
    } else {
      console.log('⚠️ No patients found for doctor:', user.id);
      setAssignedPatients([]);
    }
  } catch (error) {
    console.error('Error loading assigned patients:', error);
    setAssignedPatients([]);
  } finally {
    setLoadingPatients(false);
  }
};
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

    if (!user?.id) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }

    // Doctor validation - must select a patient
    if (isDoctor && !selectedPatient) {
      Alert.alert('Select Patient', 'Please select a patient for this appointment.');
      return;
    }

    // Patient validation for medical appointments
    if (!isDoctor && appointmentType === 'medical' && !assignedDoctor) {
      Alert.alert('Medical Appointment', 'You need an assigned doctor to create a medical appointment. Please contact support or use personal reminder instead.');
      return;
    }

    try {
      let savedAppointment;
      const appointmentDateTime = `${date}T${time}:00`;

      if (isDoctor || appointmentType === 'medical') {
        // Save to Supabase as medical appointment
        const patientId = isDoctor ? selectedPatient.id : user.id;
        const doctorId = isDoctor ? user.id : assignedDoctor.id;
        
        const doctorDisplayName = isDoctor 
          ? `Dr. ${user.full_name?.split(' ')[0] || 'Doctor'}`
          : (doctorName || assignedDoctor.full_name);

        // In AddAppointmentScreen.tsx - Update the save logic for medical appointments
          // In AddAppointmentScreen.tsx - Update the supabaseData creation
          const supabaseData = {
            patient_id: patientId,
            doctor_id: doctorId,
            appointment_date: appointmentDateTime,
            status: 'scheduled' as const,
            notes: `Title: ${title.trim()}
          Type: ${type}
          Location: ${location || 'Not specified'}
          Doctor: ${doctorDisplayName}
          Additional Notes: ${notes || 'None'}
          CreatedBy: ${isDoctor ? 'doctor' : 'patient'}`, // ✅ Add this line to track creator
            metadata: {
              created_by: isDoctor ? 'doctor' : 'patient', // ✅ Also store in metadata for easy access
              patient_id: patientId,
              doctor_id: doctorId
            }
          };

        if (editingAppointment?.id) {
          const { data, error } = await supabase
            .from('appointments')
            .update(supabaseData)
            .eq('id', editingAppointment.id)
            .select()
            .single();

          if (error) throw error;
          savedAppointment = data;
        } else {
          const { data, error } = await supabase
            .from('appointments')
            .insert([supabaseData])
            .select()
            .single();

          if (error) throw error;
          savedAppointment = data;
        }
      } else {
        // Save to local storage as personal reminder
        const localAppointmentData: CreateAppointment = {
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
          await dataService.updateAppointment(editingAppointment.id, localAppointmentData);
          savedAppointment = { id: editingAppointment.id };
        } else {
          const appointmentId = await dataService.addAppointment(localAppointmentData);
          savedAppointment = { id: appointmentId };
        }
      }

      // Schedule local notifications for both types
      const fullAppointment = {
        id: savedAppointment.id,
        title: title.trim(),
        type,
        date,
        time,
        location: location.trim() || undefined,
        doctorName: isDoctor 
          ? `Dr. ${user.full_name?.split(' ')[0] || 'Doctor'}` 
          : (doctorName.trim() || (appointmentType === 'medical' ? assignedDoctor.full_name : undefined)),
        notes: notes.trim() || undefined,
        reminderMinutes: selectedReminders,
        isCompleted: false,
        appointmentType: isDoctor ? 'medical' : appointmentType,
      };
      
      await scheduleAppointmentReminder(fullAppointment);

      let successMessage;
      if (isDoctor) {
        successMessage = `Appointment scheduled for ${selectedPatient.full_name}!`;
      } else if (appointmentType === 'medical') {
        successMessage = 'Medical appointment scheduled successfully! Your doctor will be notified.';
      } else {
        successMessage = 'Personal reminder added successfully';
      }

      Alert.alert(
        'Success', 
        successMessage,
        [
          { text: 'View Appointments', onPress: () => navigation.navigate(isDoctor ? 'DoctorDashboard' : 'PatientAppointments') },
          { text: 'OK', onPress: () => navigation.goBack() }
        ]
      );
    } catch (error) {
      console.error('Error saving appointment:', error);
      let errorMessage = 'Failed to save appointment';
      if (isDoctor) errorMessage = 'Failed to schedule appointment for patient';
      else if (appointmentType === 'personal') errorMessage = 'Failed to save personal reminder';
      
      Alert.alert('Error', errorMessage);
    }
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

  const getButtonTitle = () => {
    if (editingAppointment) return 'Update Appointment';
    
    if (isDoctor) return 'Schedule for Patient';
    
    return appointmentType === 'personal' 
      ? 'Create Personal Reminder' 
      : 'Schedule Medical Appointment';
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
          {editingAppointment ? 'Edit Appointment' : (isDoctor ? 'Schedule Appointment' : 'New Appointment')}
        </Text>
        <View style={styles.headerPlaceholder} />
      </View>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Patient Selection Section - For Doctors Only */}
        {isDoctor && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Select Patient
            </Text>
            <View style={[styles.sectionCard, { backgroundColor: colors.card }]}>
              {loadingPatients ? (
                <Text style={[styles.loadingText, { color: colors.text }]}>
                  Loading patients...
                </Text>
              ) : assignedPatients.length > 0 ? (
                <View>
                  <Text style={[styles.pickerLabel, { color: colors.text }]}>
                    Choose a patient for this appointment:
                  </Text>
                  <Picker
                    selectedValue={selectedPatient?.id}
                    onValueChange={(patientId) => {
                      const patient = assignedPatients.find(p => p.id === patientId);
                      setSelectedPatient(patient || null);
                    }}
                    style={{ color: colors.text }}
                    dropdownIconColor={colors.text}
                  >
                    <Picker.Item label="Select a patient..." value={null} />
                    {assignedPatients.map(patient => (
                      <Picker.Item 
                        key={patient.id} 
                        label={`${patient.full_name} (${patient.email})`} 
                        value={patient.id} 
                      />
                    ))}
                  </Picker>
                  
                  {selectedPatient && (
                    <View style={[styles.patientInfo, { backgroundColor: '#4361EE10' }]}>
                      <Ionicons name="person" size={20} color="#4361EE" />
                      <Text style={styles.patientInfoText}>
                        Scheduling for: <Text style={styles.patientName}>{selectedPatient.full_name}</Text>
                      </Text>
                    </View>
                  )}
                </View>
              ) : (
                <View style={[styles.patientInfo, { backgroundColor: '#FF6B6B10' }]}>
                  <Ionicons name="warning" size={20} color="#FF6B6B" />
                  <Text style={styles.patientInfoText}>
                    You don't have any assigned patients yet.
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Appointment Type Section - For Patients Only */}
        {!isDoctor && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Appointment Type
            </Text>
            <View style={[styles.sectionCard, { backgroundColor: colors.card }]}>
              <Text style={[styles.typeDescription, { color: colors.text }]}>
                Choose whether this is a personal reminder or a medical appointment with your doctor
              </Text>
              
              <View style={styles.typeOptions}>
                {/* Personal Reminder Option */}
                <TouchableOpacity
                  style={[
                    styles.typeOption,
                    { 
                      backgroundColor: colors.background,
                      borderColor: appointmentType === 'personal' ? colors.primary : colors.border
                    }
                  ]}
                  onPress={() => setAppointmentType('personal')}
                >
                  <View style={styles.typeOptionContent}>
                    <View style={styles.typeIconContainer}>
                      <Ionicons 
                        name="calendar-outline" 
                        size={24} 
                        color={appointmentType === 'personal' ? colors.primary : colors.text} 
                      />
                    </View>
                    <View style={styles.typeTextContainer}>
                      <Text style={[
                        styles.typeTitle, 
                        { color: appointmentType === 'personal' ? colors.primary : colors.text }
                      ]}>
                        Personal Reminder
                      </Text>
                      <Text style={[styles.typeSubtitle, { color: colors.text }]}>
                        For personal health reminders, medication refills, or self-care
                      </Text>
                      <Text style={[styles.typeNote, { color: '#666' }]}>
                        Only visible to you • Stored locally
                      </Text>
                    </View>
                    <View style={[
                      styles.radio,
                      { borderColor: appointmentType === 'personal' ? colors.primary : colors.border }
                    ]}>
                      {appointmentType === 'personal' && (
                        <View style={[styles.radioSelected, { backgroundColor: colors.primary }]} />
                      )}
                    </View>
                  </View>
                </TouchableOpacity>

                {/* Medical Appointment Option */}
                <TouchableOpacity
                  style={[
                    styles.typeOption,
                    { 
                      backgroundColor: colors.background,
                      borderColor: appointmentType === 'medical' ? '#4361EE' : colors.border
                    }
                  ]}
                  onPress={() => setAppointmentType('medical')}
                  disabled={loadingDoctor}
                >
                  <View style={styles.typeOptionContent}>
                    <View style={styles.typeIconContainer}>
                      <Ionicons 
                        name="medical" 
                        size={24} 
                        color={appointmentType === 'medical' ? '#4361EE' : (loadingDoctor ? '#999' : colors.text)} 
                      />
                    </View>
                    <View style={styles.typeTextContainer}>
                      <Text style={[
                        styles.typeTitle, 
                        { color: appointmentType === 'medical' ? '#4361EE' : (loadingDoctor ? '#999' : colors.text) }
                      ]}>
                        Medical Appointment
                        {loadingDoctor && ' (Loading...)'}
                      </Text>
                      <Text style={[styles.typeSubtitle, { color: loadingDoctor ? '#999' : colors.text }]}>
                        Official appointment with your healthcare provider
                      </Text>
                      <Text style={[styles.typeNote, { color: '#666' }]}>
                        Visible to you and your doctor • Synced securely
                      </Text>
                    </View>
                    <View style={[
                      styles.radio,
                      { borderColor: appointmentType === 'medical' ? '#4361EE' : colors.border }
                    ]}>
                      {appointmentType === 'medical' && (
                        <View style={[styles.radioSelected, { backgroundColor: '#4361EE' }]} />
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              </View>

              {/* Doctor Info for Medical Appointments */}
              {appointmentType === 'medical' && assignedDoctor && (
                <View style={[styles.doctorInfo, { backgroundColor: '#4361EE10' }]}>
                  <Ionicons name="information-circle" size={20} color="#4361EE" />
                  <Text style={styles.doctorInfoText}>
                    This appointment will be shared with your doctor: <Text style={styles.doctorName}>{assignedDoctor.full_name}</Text>
                    {assignedDoctor.specialization && ` • ${assignedDoctor.specialization}`}
                  </Text>
                </View>
              )}

              {appointmentType === 'medical' && !assignedDoctor && !loadingDoctor && (
                <View style={[styles.doctorInfo, { backgroundColor: '#FF6B6B10' }]}>
                  <Ionicons name="warning" size={20} color="#FF6B6B" />
                  <Text style={styles.doctorInfoText}>
                    You don't have an assigned doctor. Medical appointments require a doctor assignment.
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

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

            {(!isDoctor && appointmentType === 'personal') && (
              <TextInputField
                label="Doctor/Provider Name (Optional)"
                placeholder="e.g., Dr. Smith"
                value={doctorName}
                onChangeText={setDoctorName}
                icon="person"
              />
            )}

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
          title={getButtonTitle()}
          onPress={handleSave}
          disabled={
            !title.trim() || 
            (isDoctor && !selectedPatient) ||
            (!isDoctor && appointmentType === 'medical' && !assignedDoctor)
          }
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
  // Patient selection styles
  loadingText: {
    textAlign: 'center',
    fontSize: 14,
    padding: 16,
  },
  patientInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    gap: 8,
  },
  patientInfoText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 18,
  },
  patientName: {
    fontWeight: '600',
    color: '#4361EE',
  },
  // Appointment type styles
  typeDescription: {
    fontSize: 14,
    marginBottom: 16,
    opacity: 0.8,
    lineHeight: 20,
  },
  typeOptions: {
    gap: 12,
  },
  typeOption: {
    borderWidth: 2,
    borderRadius: 12,
    padding: 16,
  },
  typeOptionContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  typeIconContainer: {
    marginRight: 12,
  },
  typeTextContainer: {
    flex: 1,
  },
  typeTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  typeSubtitle: {
    fontSize: 14,
    marginBottom: 4,
    opacity: 0.9,
  },
  typeNote: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  radioSelected: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  doctorInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    gap: 8,
  },
  doctorInfoText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 18,
  },
  doctorName: {
    fontWeight: '600',
    color: '#4361EE',
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