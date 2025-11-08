// components/appointments/AppointmentCard.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Appointment } from '../../models/Appointment';

interface Props {
  appointment: Appointment;
  onPress: (appointment: Appointment) => void;
  onComplete: (id: number) => void;
}

export const AppointmentCard: React.FC<Props> = ({ appointment, onPress, onComplete }) => {
  const { colors } = useTheme();

  const getAppointmentIcon = (type: string) => {
    switch (type) {
      case 'doctor': return 'medical';
      case 'dentist': return 'accessibility';
      case 'lab': return 'flask';
      case 'surgery': return 'cut';
      default: return 'calendar';
    }
  };

  const getAppointmentColor = (type: string) => {
    switch (type) {
      case 'doctor': return '#4361EE';
      case 'dentist': return '#06D6A0';
      case 'lab': return '#7209B7';
      case 'surgery': return '#EF476F';
      default: return '#118AB2';
    }
  };

  const appointmentDate = new Date(appointment.date);
  const isToday = appointmentDate.toDateString() === new Date().toDateString();
  const isTomorrow = new Date(appointmentDate.getTime() - 24 * 60 * 60 * 1000).toDateString() === new Date().toDateString();

  const getDateText = () => {
    if (isToday) return 'Today';
    if (isTomorrow) return 'Tomorrow';
    return appointmentDate.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  return (
    <TouchableOpacity 
      style={[styles.card, { backgroundColor: colors.card }]}
      onPress={() => onPress(appointment)}
    >
      <View style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor: getAppointmentColor(appointment.type) }]}>
          <Ionicons name={getAppointmentIcon(appointment.type)} size={16} color="#FFF" />
        </View>
        <Text style={[styles.type, { color: getAppointmentColor(appointment.type) }]}>
          {appointment.type.toUpperCase()}
        </Text>
        {!appointment.isCompleted && (
          <TouchableOpacity 
            style={styles.completeButton}
            onPress={() => appointment.id && onComplete(appointment.id)}
          >
            <Ionicons name="checkmark-circle" size={20} color="#06D6A0" />
          </TouchableOpacity>
        )}
      </View>

      <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
        {appointment.title}
      </Text>

      {appointment.doctorName && (
        <Text style={[styles.doctor, { color: colors.text }]} numberOfLines={1}>
          Dr. {appointment.doctorName}
        </Text>
      )}

      <View style={styles.footer}>
        <View style={styles.timeContainer}>
          <Ionicons name="time" size={14} color={colors.text} />
          <Text style={[styles.time, { color: colors.text }]}>
            {getDateText()} at {appointment.time}
          </Text>
        </View>
        
        {appointment.location && (
          <View style={styles.locationContainer}>
            <Ionicons name="location" size={12} color={colors.text} />
            <Text style={[styles.location, { color: colors.text }]} numberOfLines={1}>
              {appointment.location}
            </Text>
          </View>
        )}
      </View>

      {appointment.isCompleted && (
        <View style={styles.completedBadge}>
          <Text style={styles.completedText}>Completed</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: 12,
    marginVertical: 4,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  iconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  type: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  completeButton: {
    padding: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  doctor: {
    fontSize: 14,
    marginBottom: 8,
    opacity: 0.8,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  time: {
    fontSize: 12,
    marginLeft: 4,
    opacity: 0.8,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'flex-end',
  },
  location: {
    fontSize: 11,
    marginLeft: 4,
    opacity: 0.7,
  },
  completedBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#06D6A0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  completedText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
});