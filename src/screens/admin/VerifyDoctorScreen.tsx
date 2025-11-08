// src/screens/admin/VerifyDoctorsScreen.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Alert, StyleSheet, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { supabase } from '@/Services/supabaseClient';
import EmptyState from '@/components/admin/EmptyState';
import { Ionicons } from '@expo/vector-icons';

export default function VerifyDoctorsScreen() {
  const [doctors, setDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const loadPendingDoctors = async () => {
    setLoading(true);
    console.log('🔄 Loading pending doctors...');

    try {
      // Get unverified doctors only
      const { data: unverifiedDoctors, error } = await supabase
        .from('users')
        .select('id, full_name, email, is_verified, role, created_at, hospital_id')
        .eq('role', 'doctor')
        .eq('is_verified', false)
        .order('created_at', { ascending: true });

      console.log('📊 Unverified doctors query result:', { unverifiedDoctors, error });

      if (error) {
        console.error('❌ Database error:', error);
        Alert.alert('Error', 'Failed to load pending doctors');
        setDoctors([]);
        return;
      }

      console.log(`🎯 Found ${unverifiedDoctors?.length || 0} unverified doctors`);
      setDoctors(unverifiedDoctors || []);

    } catch (catchError) {
      console.error('💥 Unexpected error:', catchError);
      Alert.alert('Error', 'An unexpected error occurred');
      setDoctors([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPendingDoctors();
    setRefreshing(false);
  };

  useEffect(() => {
    loadPendingDoctors();
  }, []);

  // Function to verify doctor
  const verifyDoctor = async (doctor: any) => {
    setProcessingId(doctor.id);
    try {
      const { error } = await supabase
        .from('users')
        .update({ is_verified: true })
        .eq('id', doctor.id);

      if (error) {
        console.error('❌ Verification error:', error);
        Alert.alert('Error', `Failed to verify doctor: ${error.message}`);
      } else {
        console.log('✅ Doctor verified successfully:', doctor.email);
        Alert.alert('Success', `${doctor.full_name} has been verified and can now access the system.`);
        await loadPendingDoctors(); // Refresh the list
      }
    } catch (error) {
      console.error('💥 Verification failed:', error);
      Alert.alert('Error', 'Failed to verify doctor');
    } finally {
      setProcessingId(null);
    }
  };

  const handleRefresh = () => {
    loadPendingDoctors();
  };

  const renderItem = ({ item }: any) => {
    const isProcessing = processingId === item.id;

    return (
      <View style={styles.item}>
        <View style={styles.doctorInfo}>
          <Text style={styles.name}>{item.full_name}</Text>
          <Text style={styles.email}>{item.email}</Text>
          <Text style={styles.hospital}>Hospital ID: {item.hospital_id}</Text>
          <Text style={styles.date}>
            Registered: {new Date(item.created_at).toLocaleDateString()}
          </Text>
          <View style={styles.statusBadge}>
            <Ionicons name="time-outline" size={12} color="white" />
            <Text style={styles.statusText}>Pending Verification</Text>
          </View>
        </View>
        
        <View style={styles.actions}>
          <TouchableOpacity 
            style={[styles.verifyButton, isProcessing && styles.buttonDisabled]}
            onPress={() => verifyDoctor(item)}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={16} color="white" />
                <Text style={styles.buttonText}>Verify</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4361EE" />
        <Text style={styles.loadingText}>Loading pending verifications...</Text>
      </View>
    );
  }

  if (doctors.length === 0) {
    return (
      <EmptyState
        title="No Pending Verifications"
        message="All doctors have been verified. There are no pending verification requests at the moment."

        actionText="Refresh"
        onAction={handleRefresh}
        icon="checkmark-done-outline"
      />
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Verify Doctors</Text>
        <Text style={styles.subtitle}>
          {doctors.length} doctor{doctors.length !== 1 ? 's' : ''} awaiting verification
        </Text>
        <Text style={styles.instructions}>
          Verify doctors to grant them access to the system
        </Text>
      </View>
      
      <FlatList
        data={doctors}
        keyExtractor={(doctor) => doctor.id}
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
  container: { 
    flex: 1, 
    padding: 16,
    backgroundColor: '#f8f9fa'
  },
  loadingContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  loadingText: {
    marginTop: 12,
    color: '#666',
  },
  header: {
    marginBottom: 20,
  },
  title: { 
    fontSize: 24, 
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  instructions: {
    fontSize: 14,
    color: '#888',
    fontStyle: 'italic',
  },
  listContent: {
    paddingBottom: 20,
  },
  item: { 
    flexDirection: 'row', 
    justifyContent: 'space-between',
    alignItems: 'flex-start',
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
  doctorInfo: {
    flex: 1,
    marginRight: 12,
  },
  name: { 
    fontSize: 16, 
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  hospital: {
    fontSize: 12,
    color: '#888',
    marginBottom: 4,
  },
  date: {
    fontSize: 12,
    color: '#888',
    marginBottom: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#ffc107',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  actions: {
    alignItems: 'flex-end',
  },
  verifyButton: { 
    backgroundColor: '#28a745',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    gap: 6,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: { 
    color: 'white', 
    fontWeight: 'bold',
    fontSize: 14,
  },
});