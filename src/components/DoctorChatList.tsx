// components/DoctorChatList.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/Services/supabaseClient';

import { chatService } from '@/Services/chatService';

interface Patient {
  id: string;
  full_name: string;
  email: string;
  last_message?: string;
  last_message_time?: string;
  unread_count?: number;
}

const DoctorChatList: React.FC = () => {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadPatients();
    setupRealtimeSubscription();
  }, [user?.id]);

  const loadPatients = async () => {
  console.log('🔍 [loadPatients] START - User ID:', user?.id);

  if (!user?.id) {
    console.log('❌ [loadPatients] No user ID, returning early');
    return;
  }

  try {
    setLoading(true);
    console.log('🔄 [loadPatients] Loading started...');

    // ✅ Step 1: Get all patient assignments for this doctor
    const { data: assignments, error: assignmentError } = await supabase
      .from('patient_doctor')
      .select(`
        patient_id,
        patients:patient_id (
          id,
          full_name,
          email
        )
      `)
      .eq('doctor_id', user.id);

    console.log('✅ [loadPatients] patient_doctor query completed', {
      assignmentsCount: assignments?.length || 0,
      assignments: assignments, // Log the full assignments data
      error: assignmentError,
    });

    if (assignmentError) throw assignmentError;

    if (!assignments || assignments.length === 0) {
      console.log('ℹ️ [loadPatients] No patients found for this doctor');
      setPatients([]);
      return;
    }

    // ✅ Debug: Check what's in the patients relation
    console.log('🔍 [loadPatients] Analyzing assignments data:');
    assignments.forEach((assignment, index) => {
      console.log(`📋 Assignment ${index + 1}:`, {
        patient_id: assignment.patient_id,
        patients: assignment.patients,
        patients_length: assignment.patients?.length,
        first_patient: assignment.patients?.[0],
        has_full_name: !!assignment.patients?.[0]?.full_name,
      });
    });

    // ✅ Step 2: For each patient, fetch their latest message
    console.log('🔄 [loadPatients] Fetching latest messages for each patient...');
    const patientList: Patient[] = await Promise.all(
      assignments.map(async (assignment, index) => {
        const patient = assignment.patients?.[0];
        
        console.log(`👤 [loadPatients] Processing patient ${index + 1}:`, {
          assignment_patient_id: assignment.patient_id,
          patient_data: patient,
          has_patient_data: !!patient,
          patient_full_name: patient?.full_name,
        });

        // If no patient data from the relation, try to fetch it directly
        let patientName = patient?.full_name;
        let patientEmail = patient?.email;

        if (!patientName) {
          console.log(`🔄 [loadPatients] No patient data in relation, fetching directly for ID: ${assignment.patient_id}`);
          const { data: directPatient, error: directError } = await supabase
            .from('users')
            .select('full_name, email')
            .eq('id', assignment.patient_id)
            .eq('role', 'patient')
            .single();

          if (!directError && directPatient) {
            patientName = directPatient.full_name;
            patientEmail = directPatient.email;
            console.log(`✅ [loadPatients] Direct fetch successful:`, directPatient);
          } else {
            console.warn(`❌ [loadPatients] Direct fetch failed:`, directError);
          }
        }

        // Fetch the latest chat message between this doctor & patient
        const { data: lastMsg, error: msgError } = await supabase
          .from('chat_messages')
          .select('text, created_at')
          .eq('doctor_id', user.id)
          .eq('patient_id', assignment.patient_id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (msgError) {
          console.warn(`⚠️ [loadPatients] Failed to fetch last message for patient ${assignment.patient_id}:`, msgError);
        }

        const result: Patient = {
          id: assignment.patient_id,
          full_name: patientName || 'Unknown Patient',
          email: patientEmail || '',
          last_message: lastMsg?.text || null,
          last_message_time: lastMsg?.created_at || null,
        };

        console.log(`✅ [loadPatients] Final patient ${index + 1}:`, result);
        return result;
      })
    );

    console.log('👥 [loadPatients] Final patient list ready:', patientList);
    setPatients(patientList);
    console.log('✅ [loadPatients] State updated with patients');

  } catch (error: any) {
    console.error('💥 [loadPatients] CATCH BLOCK - Full error details:', error);
    Alert.alert('Error', 'Failed to load patient list');
  } finally {
    setLoading(false);
    setRefreshing(false);
    console.log('🏁 [loadPatients] FINALLY - Loading states reset');
  }
};


  const setupRealtimeSubscription = () => {
    if (!user?.id) return;

    // Subscribe to new messages
    const subscription = supabase
      .channel('doctor-chat-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `doctor_id=eq.${user.id}`,
        },
        (payload) => {
          // Refresh the list when new message arrives
          loadPatients();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadPatients();
  };

  // Only the handlePatientPress needs real conversation UUID
const handlePatientPress = async (patient: Patient) => {
  if (!user?.id) return;

  try {
    const conversationId = await chatService.getOrCreateConversation(
      patient.id,
      user.id
    );

    navigation.navigate('ChatRoom', {
      mode: 'doctor',
      adapter: 'DoctorAdapter',
      conversationId,
      userRole: 'doctor',
      userId: user.id,
      patientId: patient.id,
      patientName: patient.full_name,
    });
  } catch (error: any) {
    console.error('Failed to get conversation UUID:', error);
    
    if (error.message?.includes('row-level security')) {
      Alert.alert(
        'Configuration Error', 
        'Chat system is not properly configured. Please contact support.'
      );
    } else {
      Alert.alert('Error', 'Unable to open chat with patient.');
    }
  }
};

  const renderPatientItem = ({ item }: { item: Patient }) => (
    <TouchableOpacity
      style={styles.patientItem}
      onPress={() => handlePatientPress(item)}
    >
      <View style={styles.avatar}>
        <Ionicons name="person" size={24} color="#4361EE" />
      </View>
      
      <View style={styles.patientInfo}>
        <Text style={styles.patientName}>{item.full_name}</Text>
        <Text style={styles.patientEmail}>{item.email}</Text>
        {item.last_message && (
          <Text style={styles.lastMessage} numberOfLines={1}>
            {item.last_message}
          </Text>
        )}
      </View>

      <View style={styles.rightSection}>
        {item.last_message_time && (
          <Text style={styles.timeText}>
            {new Date(item.last_message_time).toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </Text>
        )}
        {item.unread_count && item.unread_count > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadText}>{item.unread_count}</Text>
          </View>
        )}
        <Ionicons name="chevron-forward" size={20} color="#666" />
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#4361EE" />
        <Text style={styles.loadingText}>Loading your patients...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Your Patients</Text>
        <Text style={styles.headerSubtitle}>
          {patients.length} patient{patients.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {patients.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="people-outline" size={64} color="#999" />
          <Text style={styles.emptyTitle}>No Patients Yet</Text>
          <Text style={styles.emptyText}>
            Patients assigned to you will appear here for messaging
          </Text>
        </View>
      ) : (
        <FlatList
          data={patients}
          renderItem={renderPatientItem}
          keyExtractor={(item) => item.id}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  listContent: {
    padding: 16,
  },
  patientItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#e9ecef',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  patientInfo: {
    flex: 1,
  },
  patientName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  patientEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  lastMessage: {
    fontSize: 14,
    color: '#999',
  },
  rightSection: {
    alignItems: 'flex-end',
    gap: 4,
  },
  timeText: {
    fontSize: 12,
    color: '#999',
  },
  unreadBadge: {
    backgroundColor: '#4361EE',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  loadingText: {
    marginTop: 12,
    color: '#666',
    fontSize: 16,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default DoctorChatList;