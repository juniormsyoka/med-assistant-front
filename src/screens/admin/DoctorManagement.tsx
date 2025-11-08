// src/screens/admin/ActiveDoctorsScreen.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/Services/supabaseClient';
import EmptyState from '@/components/admin/EmptyState';

export default function DoctorManagement() {
  const [doctors, setDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadActiveDoctors = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, email, hospital_id, created_at, is_verified')
        .eq('role', 'doctor')
        .eq('is_verified', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading doctors:', error);
        Alert.alert('Error', 'Failed to load doctors');
        return;
      }

      setDoctors(data || []);
    } catch (error) {
      console.error('Unexpected error:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadActiveDoctors();
    setRefreshing(false);
  };

  useEffect(() => {
    loadActiveDoctors();
  }, []);

  const handleDeleteDoctor = async (doctorId: string, doctorName: string) => {
    Alert.alert(
      'Remove Doctor',
      `Are you sure you want to remove ${doctorName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove', 
          style: 'destructive', 
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('users')
                .update({ is_verified: false })
                .eq('id', doctorId);

              if (error) throw error;
              
              Alert.alert('Success', 'Doctor has been removed');
              await loadActiveDoctors();
            } catch (error) {
              Alert.alert('Error', 'Failed to remove doctor');
            }
          }
        },
      ]
    );
  };

  const renderItem = ({ item }: any) => (
    <View style={styles.item}>
      <View style={styles.doctorInfo}>
        <Text style={styles.name}>{item.full_name}</Text>
        <Text style={styles.email}>{item.email}</Text>
        <Text style={styles.hospital}>Hospital ID: {item.hospital_id}</Text>
        <Text style={styles.date}>
          Joined: {new Date(item.created_at).toLocaleDateString()}
        </Text>
      </View>
      <TouchableOpacity 
        onPress={() => handleDeleteDoctor(item.id, item.full_name)}
        style={styles.deleteButton}
      >
        <Ionicons name="person-remove" size={20} color="#FF6B6B" />
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading active doctors...</Text>
      </View>
    );
  }

  if (doctors.length === 0) {
    return (
      <EmptyState
        title="No Active Doctors"
        message="There are no verified doctors in the system yet. Doctors will appear here after they sign up and get verified."
        actionText="Refresh"
        onAction={loadActiveDoctors}
        icon="people-outline"
      />
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Active Doctors ({doctors.length})</Text>
        <Text style={styles.subtitle}>Verified and active in the system</Text>
      </View>
      
      <FlatList 
        data={doctors} 
        keyExtractor={(item) => item.id} 
        renderItem={renderItem}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#f8f9fa' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { marginBottom: 20 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#333' },
  subtitle: { fontSize: 14, color: '#666', marginTop: 4 },
  listContent: { paddingBottom: 20 },
  item: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    backgroundColor: 'white', 
    padding: 16, 
    borderRadius: 12, 
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  doctorInfo: { flex: 1 },
  name: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 4 },
  email: { fontSize: 14, color: '#666', marginBottom: 4 },
  hospital: { fontSize: 12, color: '#888', marginBottom: 4 },
  date: { fontSize: 12, color: '#888' },
  deleteButton: { padding: 8 }
});