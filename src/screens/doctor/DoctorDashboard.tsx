// src/screens/doctor/DoctorDashboard.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, FlatList, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/Services/supabaseClient';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

type DoctorStackParamList = {
  DoctorDashboard: undefined;
  PatientDetail: { patientId: string };
  ChatRoom: any;
  AppointmentSchedule: undefined;
};

type DoctorNavigationProp = NativeStackNavigationProp<DoctorStackParamList>;

interface Patient {
  id: string;
  full_name: string;
  email: string;
  last_chat_date?: string;
  upcoming_appointment?: string;
}

interface Appointment {
  id: string;
  patient_name: string;
  appointment_date: string;
  status: 'scheduled' | 'completed' | 'cancelled';
}

export default function DoctorDashboard() {
  const navigation = useNavigation<DoctorNavigationProp>();
  const { user } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [todayAppointments, setTodayAppointments] = useState<Appointment[]>([]);
  const [stats, setStats] = useState({
    totalPatients: 0,
    appointmentsToday: 0,
    unreadMessages: 0
  });

  useEffect(() => {
    loadDoctorData();
  }, [user?.id]);

  const loadDoctorData = async () => {
  if (!user?.id) return;

  try {
    // Get assigned patients
    const { data: patientsData, error: patientsError } = await supabase
      .from('patient_doctor')
      .select(`
        patient_id,
        patients:patient_id (
          id,
          full_name,
          email,
          created_at
        )
      `)
      .eq('doctor_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5);

    if (patientsError) {
      console.error('Error loading patients:', patientsError);
      throw patientsError;
    }

    const formattedPatients: Patient[] = patientsData?.map(assignment => {
      const patient = assignment.patients?.[0];
      return {
        id: assignment.patient_id,
        full_name: patient?.full_name || 'Unknown Patient',
        email: patient?.email || '',
        last_chat_date: undefined,
        upcoming_appointment: undefined
      };
    }) || [];

    setPatients(formattedPatients);

    // Get today's appointments
    const today = new Date().toISOString().split('T')[0];
    const { data: appointmentsData, error: appointmentsError } = await supabase
      .from('appointments')
      .select(`
        id,
        appointment_date,
        status,
        patients:patient_id (full_name)
      `)
      .eq('doctor_id', user.id)
      .gte('appointment_date', `${today}T00:00:00`)
      .lte('appointment_date', `${today}T23:59:59`)
      .order('appointment_date', { ascending: true });

    if (appointmentsError) {
      console.error('Error loading appointments:', appointmentsError);
      throw appointmentsError;
    }

    const formattedAppointments = appointmentsData?.map(apt => ({
      id: apt.id,
      patient_name: apt.patients?.[0]?.full_name || 'Unknown Patient',
      appointment_date: apt.appointment_date,
      status: apt.status
    })) || [];

    setTodayAppointments(formattedAppointments);

    // ✅ STATS SECTION - Add this code here:
    // Get total patients count
    const { count: totalPatients, error: countError } = await supabase
      .from('patient_doctor')
      .select('*', { count: 'exact', head: true })
      .eq('doctor_id', user.id);

    if (countError) {
      console.error('Error counting patients:', countError);
      throw countError;
    }

    // Update stats
    setStats({
      totalPatients: totalPatients || 0,
      appointmentsToday: formattedAppointments.length,
      unreadMessages: 0 // You can implement this later
    });

  } catch (error) {
    console.error('Error loading doctor data:', error);
    Alert.alert('Error', 'Failed to load dashboard data');
  }
};

  const handleStartChat = (patient: Patient) => {
    navigation.navigate('ChatRoom', {
      mode: 'doctor',
      conversationId: `doctor-${user?.id}-patient-${patient.id}`,
      userRole: 'doctor',
      userId: user?.id,
      assignedDoctorId: user?.id,
      patientId: patient.id,
      patientName: patient.full_name
    });
  };

  const renderPatientItem = ({ item }: { item: Patient }) => (
    <TouchableOpacity 
      style={styles.patientCard}
      onPress={() => handleStartChat(item)}
    >
      <View style={styles.patientAvatar}>
        <Ionicons name="person" size={24} color="#4361EE" />
      </View>
      <View style={styles.patientInfo}>
        <Text style={styles.patientName}>{item.full_name}</Text>
        <Text style={styles.patientEmail}>{item.email}</Text>
      </View>
      <TouchableOpacity 
        style={styles.chatButton}
        onPress={() => handleStartChat(item)}
      >
        <Ionicons name="chatbubble" size={20} color="#4361EE" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderAppointmentItem = ({ item }: { item: Appointment }) => (
    <View style={styles.appointmentCard}>
      <View style={styles.appointmentTime}>
        <Text style={styles.appointmentHour}>
          {new Date(item.appointment_date).toLocaleTimeString([], { 
            hour: '2-digit', minute: '2-digit' 
          })}
        </Text>
      </View>
      <View style={styles.appointmentInfo}>
        <Text style={styles.appointmentPatient}>{item.patient_name}</Text>
        <View style={[
          styles.statusBadge,
          { backgroundColor: 
            item.status === 'scheduled' ? '#4361EE20' : 
            item.status === 'completed' ? '#4CAF5020' : '#FF6B6B20'
          }
        ]}>
          <Text style={[
            styles.statusText,
            { color: 
              item.status === 'scheduled' ? '#4361EE' : 
              item.status === 'completed' ? '#4CAF50' : '#FF6B6B'
            }
          ]}>
            {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.welcome}>Welcome, Dr. {user?.full_name?.split(' ')[0]}</Text>
          <Text style={styles.subtitle}>Today's Schedule</Text>
        </View>
        <View style={styles.doctorBadge}>
          <Ionicons name="medical" size={20} color="#4361EE" />
          <Text style={styles.doctorBadgeText}>Doctor</Text>
        </View>
      </View>

      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Ionicons name="people" size={24} color="#4361EE" />
          <Text style={styles.statNumber}>{stats.totalPatients}</Text>
          <Text style={styles.statLabel}>Patients</Text>
        </View>
        
        <View style={styles.statCard}>
          <Ionicons name="calendar" size={24} color="#7209B7" />
          <Text style={styles.statNumber}>{stats.appointmentsToday}</Text>
          <Text style={styles.statLabel}>Today</Text>
        </View>
        
        <View style={styles.statCard}>
          <Ionicons name="chatbubbles" size={24} color="#F15BB5" />
          <Text style={styles.statNumber}>{stats.unreadMessages}</Text>
          <Text style={styles.statLabel}>Messages</Text>
        </View>
      </View>

      {/* Today's Appointments */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Today's Appointments</Text>
          <TouchableOpacity>
            <Text style={styles.seeAllText}>See All</Text>
          </TouchableOpacity>
        </View>
        {todayAppointments.length > 0 ? (
          <FlatList
            data={todayAppointments}
            keyExtractor={(item) => item.id}
            renderItem={renderAppointmentItem}
            scrollEnabled={false}
          />
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={48} color="#ccc" />
            <Text style={styles.emptyText}>No appointments today</Text>
          </View>
        )}
      </View>

      {/* My Patients */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>My Patients</Text>
          <TouchableOpacity>
            <Text style={styles.seeAllText}>See All</Text>
          </TouchableOpacity>
        </View>
        {patients.length > 0 ? (
          <FlatList
            data={patients}
            keyExtractor={(item) => item.id}
            renderItem={renderPatientItem}
            scrollEnabled={false}
          />
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={48} color="#ccc" />
            <Text style={styles.emptyText}>No patients assigned yet</Text>
          </View>
        )}
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.quickAction}>
            <View style={[styles.quickActionIcon, { backgroundColor: '#4361EE20' }]}>
              <Ionicons name="calendar" size={24} color="#4361EE" />
            </View>
            <Text style={styles.quickActionText}>Schedule</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.quickAction}>
            <View style={[styles.quickActionIcon, { backgroundColor: '#3A56E420' }]}>
              <Ionicons name="document-text" size={24} color="#3A56E4" />
            </View>
            <Text style={styles.quickActionText}>Prescriptions</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.quickAction}>
            <View style={[styles.quickActionIcon, { backgroundColor: '#7209B720' }]}>
              <Ionicons name="stats-chart" size={24} color="#7209B7" />
            </View>
            <Text style={styles.quickActionText}>Reports</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
  },
  welcome: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  doctorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4361EE20',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  doctorBadgeText: {
    color: '#4361EE',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  statCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    flex: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginVertical: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  section: {
    backgroundColor: 'white',
    marginTop: 8,
    padding: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  seeAllText: {
    color: '#4361EE',
    fontSize: 14,
    fontWeight: '500',
  },
  appointmentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    marginBottom: 8,
  },
  appointmentTime: {
    marginRight: 12,
  },
  appointmentHour: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  appointmentInfo: {
    flex: 1,
  },
  appointmentPatient: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  patientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    marginBottom: 8,
  },
  patientAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4361EE20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  patientInfo: {
    flex: 1,
  },
  patientName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  patientEmail: {
    fontSize: 14,
    color: '#666',
  },
  chatButton: {
    padding: 8,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 8,
  },
  quickActions: {
    padding: 20,
    backgroundColor: 'white',
    marginTop: 8,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickAction: {
    alignItems: 'center',
    flex: 1,
  },
  quickActionIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
});