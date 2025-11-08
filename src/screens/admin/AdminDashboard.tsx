// src/screens/admin/AdminDashboard.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/Services/supabaseClient';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '@react-navigation/native';

type AdminStackParamList = {
  AdminDashboard: undefined;
  DoctorManagement: undefined;
  PatientManagement: undefined;
  AppointmentManagement: undefined;
};

type AdminNavigationProp = NativeStackNavigationProp<AdminStackParamList>;

interface HospitalStats {
  doctorsCount: number;
  patientsCount: number;
  appointmentsToday: number;
  pendingInvitations: number;
}

export default function AdminDashboard() {
  const navigation = useNavigation<AdminNavigationProp>();
  const { user } = useAuth();
  const [stats, setStats] = useState<HospitalStats>({
    doctorsCount: 0,
    patientsCount: 0,
    appointmentsToday: 0,
    pendingInvitations: 0
  });
  const [hospitalName, setHospitalName] = useState('');
  const { colors } = useTheme();

  useEffect(() => {
    loadDashboardData();
  }, [user?.hospital_id]);

  const loadDashboardData = async () => {
    if (!user?.hospital_id) return;

    try {
      // Get hospital name
      const { data: hospitalData } = await supabase
        .from('hospitals')
        .select('name')
        .eq('id', user.hospital_id)
        .single();

      setHospitalName(hospitalData?.name || 'Your Hospital');

      // Get doctors count
      const { count: doctorsCount } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('hospital_id', user.hospital_id)
        .eq('role', 'doctor')
        .eq('is_verified', true);

      // Get patients count
      const { count: patientsCount } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('hospital_id', user.hospital_id)
        .eq('role', 'patient')
        .eq('is_verified', true);

      // Get appointments for today
      const today = new Date().toISOString().split('T')[0];
      const { count: appointmentsToday } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('hospital_id', user.hospital_id)
        .gte('appointment_date', `${today}T00:00:00`)
        .lte('appointment_date', `${today}T23:59:59`);

      // Get pending invitations
      const { count: pendingInvitations } = await supabase
        .from('invitations')
        .select('*', { count: 'exact', head: true })
        .eq('hospital_id', user.hospital_id)
        .eq('is_used', false)
        .gt('expires_at', new Date().toISOString());

      setStats({
        doctorsCount: doctorsCount || 0,
        patientsCount: patientsCount || 0,
        appointmentsToday: appointmentsToday || 0,
        pendingInvitations: pendingInvitations || 0
      });

    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  };

  const menuItems = [
  {
    title: 'Manage Doctors',
    description: 'View and manage hospital doctors',
    icon: 'people',
    screen: 'DoctorManagement',
    color: '#4361EE'
  },
  {
    title: 'Patient Management',
    description: 'View and assign patients to doctors',
    icon: 'person',
    screen: 'PatientAssignments',
    color: '#3A56E4'
  },
  {
    title: 'Doctor Invitations',
    description: 'View and manage doctor invitations',
    icon: 'mail',
    screen: 'DoctorInvitations',
    color: '#7209B7'
  },
  {
    title: 'Verify Doctors',
    description: 'Approve pending doctor accounts',
    icon: 'checkmark-circle',
    screen: 'VerifyDoctors',
    color: '#4CAF50'
  },
  {
    title: 'Invite Doctor',
    description: 'Send invitations to new doctors',
    icon: 'person-add',
    screen: 'InviteDoctor',
    color: '#F15BB5'
  },
  
];

  return (
  <ScrollView
    style={[styles.container, { backgroundColor: colors.background }]}
    stickyHeaderIndices={[0]} // 👈 makes the header sticky
  >
    {/* Header */}
    <View
      style={[
        styles.header,
        { backgroundColor: colors.card, borderBottomColor: colors.border },
      ]}
    >
      <View>
        <Text style={[styles.welcome, { color: colors.text }]}>Welcome, Admin</Text>
        <Text style={[styles.hospitalName, { color: colors.text }]}>{hospitalName}</Text>
      </View>
      <View style={styles.adminBadge}>
        <Ionicons name="shield-checkmark" size={20} color="#4361EE" />
        <Text style={styles.adminBadgeText}>Hospital Admin</Text>
      </View>
    </View>

    {/* Stats Cards */}
    <View style={styles.statsContainer}>
  <View
    style={[
      styles.statCard,
      { backgroundColor: colors.card, borderBottomColor: colors.border },
    ]}
  >
    <Ionicons name="people" size={24} color="#4361EE" />
    <Text style={[styles.statNumber, { color: colors.text }]}>{stats.doctorsCount}</Text>
    <Text style={[styles.statLabel, { color: colors.text }]}>Doctors</Text>
  </View>

  <View
    style={[
      styles.statCard,
      { backgroundColor: colors.card, borderBottomColor: colors.border },
    ]}
  >
    <Ionicons name="person" size={24} color="#3A56E4" />
    <Text style={[styles.statNumber, { color: colors.text }]}>{stats.patientsCount}</Text>
    <Text style={[styles.statLabel, { color: colors.text }]}>Patients</Text>
  </View>

  <View
    style={[
      styles.statCard,
      { backgroundColor: colors.card, borderBottomColor: colors.border },
    ]}
  >
    <Ionicons name="calendar" size={24} color="#7209B7" />
    <Text style={[styles.statNumber, { color: colors.text }]}>{stats.appointmentsToday}</Text>
    <Text style={[styles.statLabel, { color: colors.text }]}>Today's Appointments</Text>
  </View>

  <View
    style={[
      styles.statCard,
      { backgroundColor: colors.card, borderBottomColor: colors.border },
    ]}
  >
    <Ionicons name="mail-unread" size={24} color="#F15BB5" />
    <Text style={[styles.statNumber, { color: colors.text }]}>{stats.pendingInvitations}</Text>
    <Text style={[styles.statLabel, { color: colors.text }]}>Pending Invites</Text>
  </View>
</View>

    {/* Quick Actions 
    <View style={[styles.quickActions,  { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Actions</Text>
      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={styles.quickAction}
          onPress={() => navigation.navigate('DoctorInvitations' as never)}
        >
          <View style={[styles.quickActionIcon, { backgroundColor: '#4361EE20' }]}>
            <Ionicons name="person-add" size={24} color="#4361EE" />
          </View>
          <Text style={[styles.quickActionText, { color: colors.text }]}>Invite Doctor</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.quickAction}>
          <View style={[styles.quickActionIcon, { backgroundColor: '#3A56E420' }]}>
            <Ionicons name="calendar" size={24} color="#3A56E4" />
          </View>
          <Text style={[styles.quickActionText, { color: colors.text }]}>View Schedule</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.quickAction}>
          <View style={[styles.quickActionIcon, { backgroundColor: '#7209B720' }]}>
            <Ionicons name="stats-chart" size={24} color="#7209B7" />
          </View>
          <Text style={[styles.quickActionText, { color: colors.text }]}>Reports</Text>
        </TouchableOpacity>
      </View>
    </View>

    */}

    {/* Management Menu */}
    <View style={[styles.menuContainer,  { backgroundColor: colors.background }]}>
      <Text style={styles.sectionTitle}>Management</Text>
      {menuItems.map((item, index) => (
        <TouchableOpacity
          key={index}
          style={[styles.menuCard, { backgroundColor: colors.card, borderBottomColor: colors.border }]}
          onPress={() => navigation.navigate(item.screen as never)}
        >
          <View style={[styles.iconContainer, { backgroundColor: item.color + '20' }]}>
            <Ionicons name={item.icon as any} size={28} color={item.color} />
          </View>
          <View style={styles.menuContent}>
            <Text style={[styles.menuTitle, { color: colors.text }]}>{item.title}</Text>
            <Text style={styles.menuDescription}>{item.description}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#666" />
        </TouchableOpacity>
      ))}
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
    position: 'relative',
  },
  welcome: {
    fontSize: 27,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
    marginTop: 4,
    paddingTop: 15,
  },
  hospitalName: {
    fontSize: 16,
    color: '#666',
    marginBottom: 7,
  },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4361EE20',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  adminBadgeText: {
    color: '#4361EE',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  statsContainer: {
  flexDirection: 'row',
  flexWrap: 'wrap',
  padding: 16,
  gap: 12,
  justifyContent: 'space-between',
},
statCard: {
  width: '48%', // This ensures 2 cards per row with gap in between
  aspectRatio: 1, // Makes cards square
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: 12,
  padding: 16,
  borderBottomWidth: 3,
  // Remove or adjust these if you want different sizing:
  // minHeight: 120,
},
statNumber: {
  fontSize: 24,
  fontWeight: 'bold',
  marginTop: 8,
  marginBottom: 4,
},
statLabel: {
  fontSize: 14,
  textAlign: 'center',
},
  quickActions: {
    padding: 20,
    backgroundColor: 'white',
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 16,
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
  menuContainer: {
    padding: 20,
  },
  menuCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  menuDescription: {
    fontSize: 14,
    color: '#666',
  },
});