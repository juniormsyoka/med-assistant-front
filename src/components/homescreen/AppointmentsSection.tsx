// components/homescreen/AppointmentsSection.tsx
import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useTheme } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { StyleSheet } from 'react-native'; // Add StyleSheet

interface Props {
  appointments?: any[]; // Make optional
  onAddAppointment: () => void;
  onViewAllAppointments?: () => void; // Make optional
  onEditAppointment?: (appointment: any) => void;
  onCompleteAppointment?: (id: number) => void;
  isLoading?: boolean; // Add loading
}

export const AppointmentsSection: React.FC<Props> = ({
  appointments = [], // Default to empty array
  onAddAppointment,
  onViewAllAppointments,
  onEditAppointment,
  onCompleteAppointment,
  isLoading = false,
}) => {
  const { colors } = useTheme();
  const { user } = useAuth();
  
  // Guest state (no user logged in)
  if (!user) {
    return (
      <View style={[styles.guestContainer, { backgroundColor: colors.card }]}>
        <View style={[styles.guestIconContainer, { backgroundColor: `${colors.primary}15` }]}>
          <Ionicons name="calendar" size={40} color={colors.primary} />
        </View>
        <Text style={[styles.guestTitle, { color: colors.text }]}>
          Manage Your Appointments
        </Text>
        <Text style={[styles.guestText, { color: colors.text, opacity: 0.7 }]}>
          Sign in to schedule and track your medical appointments and reminders.
        </Text>
      </View>
    );
  }
  
  const isDoctor = user?.role === 'doctor';

  // Loading state
  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.card }]}>
        <Ionicons name="time-outline" size={48} color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.text }]}>
          Loading appointments...
        </Text>
      </View>
    );
  }

  // Filter and prepare appointments based on user role
  const getDisplayAppointments = () => {
    const now = new Date();
    
    if (isDoctor) {
      // For doctors: show upcoming appointments with their patients
      return appointments
        .filter(apt => {
          const aptDate = new Date(apt.appointment_date || `${apt.date}T${apt.time}:00`);
          return aptDate >= now && apt.status !== 'completed' && apt.status !== 'cancelled';
        })
        .slice(0, 5);
    } else {
      // For patients: show upcoming appointments (both personal and medical)
      return appointments
        .filter(apt => {
          const aptDate = new Date(apt.appointment_date || `${apt.date}T${apt.time}:00`);
          return aptDate >= now && 
                 (apt.status !== 'completed' && apt.status !== 'cancelled') &&
                 (!apt.isCompleted);
        })
        .slice(0, 5);
    }
  };

  const displayAppointments = getDisplayAppointments();

  const handleAppointmentPress = (appointment: any) => {
    if (onEditAppointment) {
      onEditAppointment(appointment);
    } else {
      Alert.alert(
        'Appointment Details',
        `Title: ${appointment.title || appointment.notes?.split('Title:')[1]?.split('\n')[0]}\nDate: ${new Date(appointment.appointment_date || `${appointment.date}T${appointment.time}:00`).toLocaleString()}`,
        [{ text: 'OK' }]
      );
    }
  };

  const getAppointmentTitle = (appointment: any) => {
    if (appointment.title) return appointment.title;
    if (appointment.notes?.includes('Title:')) {
      return appointment.notes.split('Title:')[1]?.split('\n')[0]?.trim();
    }
    return 'Appointment';
  };

  const getAppointmentDateTime = (appointment: any) => {
    const dateTime = appointment.appointment_date || `${appointment.date}T${appointment.time}:00`;
    const date = new Date(dateTime);
    return {
      date: date.toLocaleDateString('en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric' 
      }),
      time: date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
      })
    };
  };

  const getPatientName = (appointment: any) => {
    if (appointment.patient_name) return appointment.patient_name;
    if (appointment.patients?.full_name) return appointment.patients.full_name;
    if (appointment.notes?.includes('Patient:')) {
      return appointment.notes.split('Patient:')[1]?.split('\n')[0]?.trim();
    }
    return 'Patient';
  };

  const getAppointmentType = (appointment: any) => {
    if (appointment.type) return appointment.type;
    if (appointment.source === 'local') return 'personal';
    return 'medical';
  };

  // Empty state (no appointments)
  if (displayAppointments.length === 0) {
    return (
      <View style={{ marginVertical: 16 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingHorizontal: 16 }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.text }}>
            {isDoctor ? '👨‍⚕️ Upcoming Appointments' : '🗓️ Upcoming Appointments'}
          </Text>
          <TouchableOpacity onPress={onAddAppointment}>
            <Ionicons name="add-circle" size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity 
          style={[styles.emptyContainer, { borderColor: colors.border }]}
          onPress={onAddAppointment}
        >
          <Ionicons 
            name={isDoctor ? "medical" : "calendar"} 
            size={32} 
            color={colors.primary} 
            style={{ marginBottom: 8 }}
          />
          <Text style={{ color: colors.text, marginBottom: 8, textAlign: 'center' }}>
            {isDoctor 
              ? 'No upcoming appointments with patients' 
              : 'No upcoming appointments'
            }
          </Text>
          <Text style={{ color: colors.primary, fontWeight: '600' }}>
            {isDoctor ? 'Schedule Appointment' : 'Add Your First Appointment'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Normal state (with appointments)
  return (
    <View style={{ marginVertical: 16 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingHorizontal: 16 }}>
        <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.text }}>
          {isDoctor ? '👨‍⚕️ Upcoming Appointments' : '🗓️ Upcoming Appointments'}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          {onViewAllAppointments && (
            <TouchableOpacity onPress={onViewAllAppointments}>
              <Text style={{ color: colors.primary, fontWeight: '600', fontSize: 14 }}>
                View All
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={onAddAppointment}>
            <Ionicons name="add-circle" size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 8 }}
      >
        {displayAppointments.map((appointment, index) => {
          const { date, time } = getAppointmentDateTime(appointment);
          const title = getAppointmentTitle(appointment);
          const type = getAppointmentType(appointment);
          const isMedical = type === 'medical';
          
          return (
            <TouchableOpacity
              key={appointment.id || index}
              style={{
                width: 280,
                marginHorizontal: 8,
                backgroundColor: colors.card,
                borderRadius: 12,
                padding: 16,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: 3,
                borderLeftWidth: 4,
                borderLeftColor: isMedical ? '#4361EE' : '#666',
              }}
              onPress={() => handleAppointmentPress(appointment)}
            >
              {/* Appointment Header */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: 'bold', color: colors.text, marginBottom: 4 }}>
                    {title}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons 
                      name={isMedical ? "medical" : "calendar-outline"} 
                      size={14} 
                      color={isMedical ? "#4361EE" : "#666"} 
                    />
                    <Text style={{ fontSize: 12, color: isMedical ? "#4361EE" : "#666", fontWeight: '500' }}>
                      {isMedical ? 'Medical' : 'Personal'}
                    </Text>
                  </View>
                </View>
                <View style={{
                  backgroundColor: appointment.status === 'scheduled' ? '#4361EE20' : '#4CAF5020',
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderRadius: 12,
                }}>
                  <Text style={{
                    fontSize: 12,
                    fontWeight: '500',
                    color: appointment.status === 'scheduled' ? '#4361EE' : '#4CAF50',
                  }}>
                    {appointment.status?.charAt(0).toUpperCase() + appointment.status?.slice(1) || 'Scheduled'}
                  </Text>
                </View>
              </View>

              {/* Appointment Details */}
              <View style={{ gap: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name="calendar" size={14} color="#666" />
                  <Text style={{ fontSize: 14, color: colors.text }}>{date}</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name="time" size={14} color="#666" />
                  <Text style={{ fontSize: 14, color: colors.text }}>{time}</Text>
                </View>
                
                {/* Patient Name for Doctors */}
                {isDoctor && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Ionicons name="person" size={14} color="#4361EE" />
                    <Text style={{ fontSize: 14, color: '#4361EE', fontWeight: '600' }}>
                      {getPatientName(appointment)}
                    </Text>
                  </View>
                )}
                
                {/* Doctor Name for Patients */}
                {!isDoctor && isMedical && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Ionicons name="medical" size={14} color="#4361EE" />
                    <Text style={{ fontSize: 14, color: '#4361EE' }}>
                      Dr. {appointment.doctor_name || 'Your Doctor'}
                    </Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

// Add styles
const styles = StyleSheet.create({
  guestContainer: {
    padding: 32,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 16,
  },
  guestIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  guestTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 12,
    textAlign: "center",
  },
  guestText: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: 8,
  },
  loadingContainer: {
    padding: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 16,
  },
  loadingText: {
    fontSize: 16,
    marginTop: 16,
    fontWeight: "500",
  },
  emptyContainer: {
    padding: 20,
    borderWidth: 1,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 16,
  },
});

export default AppointmentsSection;