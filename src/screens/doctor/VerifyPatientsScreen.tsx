import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Alert, StyleSheet, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { supabase } from '@/Services/supabaseClient';
import EmptyState from '@/components/admin/EmptyState';
import { Ionicons } from '@expo/vector-icons';

interface PatientItem {
  id: string; // assignment id
  patientId: string;
  full_name: string;
  email: string;
  // Phone removed since it doesn't exist in public.users
  // If you add phone column later, you can add it back
  status: string;
  is_verified: boolean;
  verified_at: string | null;
}

export default function VerifyPatientsScreen() {
  const [patients, setPatients] = useState<PatientItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const loadPendingPatients = async () => {
    setLoading(true);

    try {
      // Get the currently logged-in doctor
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('Failed to get logged-in user');
      }
      const doctorId = user.id;

      // Fetch pending patients with proper relationship alias
      const { data, error } = await supabase
        .from('patient_doctor')
        .select(`
          id,
          status,
          is_verified,
          verified_at,
          patient:users!patient_doctor_patient_id_fkey (
            id,
            full_name,
            email
          )
        `)
        .eq('doctor_id', doctorId)
        .eq('status', 'pending');

      if (error) throw error;

      // Map the results to a cleaner structure, safely handling arrays
      const formattedPatients: PatientItem[] = (data || []).map((pd: any) => {
        const patientData = Array.isArray(pd.patient) ? pd.patient[0] : pd.patient;

        return {
          id: pd.id, // assignment id
          patientId: patientData?.id ?? '',
          full_name: patientData?.full_name ?? 'Unknown',
          email: patientData?.email ?? '',
          // Phone removed from data mapping
          status: pd.status,
          is_verified: pd.is_verified,
          verified_at: pd.verified_at
        };
      });

      setPatients(formattedPatients);

    } catch (error) {
      console.error('Error loading pending patients:', error);
      Alert.alert('Error', 'Failed to load pending patients.');
      setPatients([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPendingPatients();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPendingPatients();
    setRefreshing(false);
  };

  // Verify patient
  const verifyPatient = async (assignmentId: string) => {
    setProcessingId(assignmentId);
    try {
      const { error } = await supabase
        .from('patient_doctor')
        .update({
          is_verified: true,
          verified_at: new Date().toISOString(),
          status: 'verified',
        })
        .eq('id', assignmentId);

      if (error) throw error;

      Alert.alert('Success', 'Patient has been verified.');
      loadPendingPatients();
    } catch (error) {
      console.error('Verification failed:', error);
      Alert.alert('Error', 'Unable to verify patient.');
    } finally {
      setProcessingId(null);
    }
  };

  const rejectPatient = async (assignmentId: string) => {
    setProcessingId(assignmentId);
    try {
      const { error } = await supabase
        .from('patient_doctor')
        .update({
          status: 'rejected',
        })
        .eq('id', assignmentId);

      if (error) throw error;

      Alert.alert('Rejected', 'Patient request has been rejected.');
      loadPendingPatients();
    } catch (error) {
      console.error('Rejection failed:', error);
      Alert.alert('Error', 'Unable to reject patient.');
    } finally {
      setProcessingId(null);
    }
  };

  const renderItem = ({ item }: { item: PatientItem }) => {
    const isProcessing = processingId === item.id;

    return (
      <View style={styles.item}>
        <View style={styles.userInfo}>
          <Text style={styles.name}>{item.full_name}</Text>
          <Text style={styles.email}>{item.email}</Text>
          {/* Phone display removed */}
          <View style={styles.statusBadge}>
            <Ionicons name="time-outline" size={12} color="white" />
            <Text style={styles.statusText}>Pending Verification</Text>
          </View>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity 
            style={[styles.verifyButton, isProcessing && styles.buttonDisabled]}
            onPress={() => verifyPatient(item.id)}
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

          <TouchableOpacity 
            style={[styles.rejectButton, isProcessing && styles.buttonDisabled]}
            onPress={() => rejectPatient(item.id)}
            disabled={isProcessing}
          >
            <Ionicons name="close-circle" size={16} color="white" />
            <Text style={styles.buttonText}>Reject</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4361EE" />
        <Text style={styles.loadingText}>Loading pending patients...</Text>
      </View>
    );
  }

  if (patients.length === 0) {
    return (
      <EmptyState
        title="No Pending Patients"
        message="All patient requests have been processed."
        actionText="Refresh"
        onAction={onRefresh}
        icon="checkmark-done-outline"
      />
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={patients}
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
  loadingText: { marginTop: 12, color: '#666' },
  listContent: { paddingBottom: 20 },
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
  userInfo: { flex: 1, marginRight: 12 },
  name: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 4 },
  email: { fontSize: 14, color: '#666', marginBottom: 6 },
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
  statusText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
  actions: { alignItems: 'flex-end', flexDirection: 'row', gap: 8 },
  verifyButton: { 
    backgroundColor: '#28a745',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    gap: 6,
  },
  rejectButton: { 
    backgroundColor: '#dc3545',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    gap: 6,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: 'white', fontWeight: 'bold', fontSize: 14 },
});