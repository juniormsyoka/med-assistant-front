// src/screens/superadmin/HospitalManagement.tsx
import React, { useEffect, useState } from 'react';
import { 
  View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, Modal, TextInput 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/Services/supabaseClient';
import { Hospital } from '@/types/auth';
import { useAuth } from '@/contexts/AuthContext';

export default function HospitalManagement() {
  const { user } = useAuth();
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  // Form state
  const [hospitalName, setHospitalName] = useState('');
  const [hospitalAddress, setHospitalAddress] = useState('');
  const [hospitalPhone, setHospitalPhone] = useState('');

  useEffect(() => {
    loadHospitals();
  }, []);

  const loadHospitals = async () => {
    try {
      const { data, error } = await supabase
        .from('hospitals')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setHospitals(data || []);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const createHospital = async () => {
    if (!hospitalName.trim() || !hospitalAddress.trim()) {
      Alert.alert('Error', 'Please fill in name and address');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('hospitals')
        .insert({
          name: hospitalName.trim(),
          address: hospitalAddress.trim(),
          phone: hospitalPhone.trim(),
          super_admin_id: user?.id,
          is_active: true
        })
        .select()
        .single();

      if (error) throw error;

      Alert.alert('Success', 'Hospital created successfully!');
      setShowCreateModal(false);
      resetForm();
      await loadHospitals();
      
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const resetForm = () => {
    setHospitalName('');
    setHospitalAddress('');
    setHospitalPhone('');
  };

  const toggleHospitalStatus = async (hospitalId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('hospitals')
        .update({ is_active: !currentStatus })
        .eq('id', hospitalId);

      if (error) throw error;
      await loadHospitals();
      Alert.alert('Success', `Hospital ${!currentStatus ? 'activated' : 'deactivated'}`);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const renderHospitalItem = ({ item }: { item: Hospital }) => (
    <View style={styles.hospitalCard}>
      <View style={styles.hospitalInfo}>
        <Text style={styles.hospitalName}>{item.name}</Text>
        <Text style={styles.hospitalAddress}>{item.address}</Text>
        <Text style={styles.hospitalPhone}>{item.phone}</Text>
        <View style={styles.statusContainer}>
          <View style={[
            styles.statusBadge,
            { backgroundColor: item.is_active ? '#4CAF50' : '#FF6B6B' }
          ]}>
            <Text style={styles.statusText}>
              {item.is_active ? 'Active' : 'Inactive'}
            </Text>
          </View>
          <Text style={styles.hospitalId}>ID: {item.id.slice(0, 8)}...</Text>
        </View>
      </View>
      
      <View style={styles.actions}>
        <TouchableOpacity 
          onPress={() => toggleHospitalStatus(item.id, item.is_active)}
          style={styles.actionButton}
        >
          <Ionicons 
            name={item.is_active ? 'pause-circle' : 'play-circle'} 
            size={24} 
            color={item.is_active ? '#FFA500' : '#4CAF50'} 
          />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Hospital Management</Text>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => setShowCreateModal(true)}
        >
          <Ionicons name="add-circle" size={36} color="#4361EE" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={hospitals}
        keyExtractor={(item) => item.id}
        renderItem={renderHospitalItem}
        refreshing={loading}
        onRefresh={loadHospitals}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="business-outline" size={48} color="#ccc" />
            <Text style={styles.emptyText}>No hospitals yet</Text>
            <Text style={styles.emptySubtext}>
              Create your first hospital to get started
            </Text>
          </View>
        }
      />

      {/* Create Hospital Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create New Hospital</Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <TextInput
              placeholder="Hospital Name *"
              value={hospitalName}
              onChangeText={setHospitalName}
              style={styles.input}
            />

            <TextInput
              placeholder="Address *"
              value={hospitalAddress}
              onChangeText={setHospitalAddress}
              style={styles.input}
              multiline
            />

            <TextInput
              placeholder="Phone Number"
              value={hospitalPhone}
              onChangeText={setHospitalPhone}
              style={styles.input}
              keyboardType="phone-pad"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setShowCreateModal(false);
                  resetForm();
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.createButton,
                  (!hospitalName.trim() || !hospitalAddress.trim()) && styles.createButtonDisabled
                ]}
                onPress={createHospital}
                disabled={!hospitalName.trim() || !hospitalAddress.trim()}
              >
                <Text style={styles.createButtonText}>Create Hospital</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  addButton: {
    padding: 4,
  },
  listContent: {
    padding: 16,
    flexGrow: 1,
  },
  hospitalCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  hospitalInfo: {
    flex: 1,
  },
  hospitalName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  hospitalAddress: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  hospitalPhone: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  hospitalId: {
    fontSize: 12,
    color: '#999',
    fontFamily: 'monospace',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    padding: 4,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  createButton: {
    flex: 2,
    backgroundColor: '#4361EE',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  createButtonDisabled: {
    backgroundColor: '#ccc',
  },
  createButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});