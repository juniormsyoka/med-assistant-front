// components/homescreen/AppointmentsSection.tsx
import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useTheme } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Appointment } from '../../models/Appointment';
import { AppointmentCard } from '../appointments/AppointmentCard';

interface Props {
  appointments: Appointment[];
  onAddAppointment: () => void;
  onEditAppointment: (appointment: Appointment) => void;
  onCompleteAppointment: (id: number) => void;
}

export const AppointmentsSection: React.FC<Props> = ({
  appointments,
  onAddAppointment,
  onEditAppointment,
  onCompleteAppointment,
}) => {
  const { colors } = useTheme();

  const upcomingAppointments = appointments
    .filter(apt => !apt.isCompleted)
    .slice(0, 5); // Show max 5 upcoming

  if (upcomingAppointments.length === 0) {
    return (
      <View style={{ marginVertical: 16 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingHorizontal: 16 }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.text }}>
            🗓️ Upcoming Appointments
          </Text>
          <TouchableOpacity onPress={onAddAppointment}>
            <Ionicons name="add-circle" size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity 
          style={{
            padding: 20,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 8,
            alignItems: 'center',
            marginHorizontal: 16,
          }}
          onPress={onAddAppointment}
        >
          <Text style={{ color: colors.text, marginBottom: 8 }}>No upcoming appointments</Text>
          <Text style={{ color: colors.primary }}>Add your first appointment</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ marginVertical: 16 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingHorizontal: 16 }}>
        <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.text }}>
          🗓️ Upcoming Appointments
        </Text>
        <TouchableOpacity onPress={onAddAppointment}>
          <Ionicons name="add-circle" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 8 }}
      >
        {upcomingAppointments.map((appointment) => (
          <View key={appointment.id} style={{ width: 280, marginHorizontal: 8 }}>
            <AppointmentCard
              appointment={appointment}
              onPress={onEditAppointment}
              onComplete={onCompleteAppointment}
            />
          </View>
        ))}
      </ScrollView>
    </View>
  );
};