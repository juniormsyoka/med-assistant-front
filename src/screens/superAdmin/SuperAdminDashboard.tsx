// src/screens/superadmin/SuperAdminDashboard.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/Services/supabaseClient';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SuperAdminStackParamList } from '@/types/navigation';

type SuperAdminStackNavigation = NativeStackNavigationProp<SuperAdminStackParamList>;

interface DashboardStats {
  hospitalsCount: number;
  adminsCount: number;
  pendingHospitals: number;
}

export default function SuperAdminDashboard() {
  const navigation = useNavigation<SuperAdminStackNavigation>();
 // const navigation = useNavigation();
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    hospitalsCount: 0,
    adminsCount: 0,
    pendingHospitals: 0
  });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      // Get hospitals count
      const { count: hospitalsCount } = await supabase
        .from('hospitals')
        .select('*', { count: 'exact', head: true });

      // Get admins count
      const { count: adminsCount } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'admin');

      // Get pending hospitals (example - you might have an approval system)
      const { count: pendingHospitals } = await supabase
        .from('hospitals')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', false);

      setStats({
        hospitalsCount: hospitalsCount || 0,
        adminsCount: adminsCount || 0,
        pendingHospitals: pendingHospitals || 0
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const menuItems = [
    {
      title: 'Manage Hospitals',
      description: 'Create and manage hospital organizations',
      icon: 'business',
      screen: 'HospitalManagement',
      color: '#4361EE'
    },
     {
        title: 'Verify Admins',  // ← ADD THIS
        description: 'Approve administrator access requests',
        icon: 'shield-checkmark',
        screen: 'VerifyAdmins',
        color: '#3A56E4'
      },
   /* {
      title: 'System Admins',
      description: 'Manage platform administrators',
      icon: 'shield-checkmark',
      screen: 'AdminManagement',
      color: '#3A56E4'
    },
    {
      title: 'Platform Analytics',
      description: 'View system-wide usage statistics',
      icon: 'stats-chart',
      screen: 'PlatformAnalytics',
      color: '#7209B7'
    },
    {
      title: 'System Settings',
      description: 'Configure platform settings',
      icon: 'settings',
      screen: 'SystemSettings',
      color: '#F15BB5'
    }*/
  ];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Super Admin Dashboard</Text>
        <Text style={styles.subtitle}>Platform Management</Text>
      </View>

      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Ionicons name="business" size={24} color="#4361EE" />
          <Text style={styles.statNumber}>{stats.hospitalsCount}</Text>
          <Text style={styles.statLabel}>Hospitals</Text>
        </View>
        
        <View style={styles.statCard}>
          <Ionicons name="people" size={24} color="#3A56E4" />
          <Text style={styles.statNumber}>{stats.adminsCount}</Text>
          <Text style={styles.statLabel}>Admins</Text>
        </View>
        
        <View style={styles.statCard}>
          <Ionicons name="time" size={24} color="#F15BB5" />
          <Text style={styles.statNumber}>{stats.pendingHospitals}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
      </View>

      {/* Management Menu */}
      <View style={styles.menuContainer}>
        {menuItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={styles.menuCard}
             onPress={() => navigation.navigate(item.screen as any)}
          >
            <View style={[styles.iconContainer, { backgroundColor: item.color + '20' }]}>
              <Ionicons name={item.icon as any} size={28} color={item.color} />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>{item.title}</Text>
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
    paddingTop: 60,
    padding: 20,
    backgroundColor: 'white',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 20,
    justifyContent: 'space-between',
  },
  statCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 4,
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