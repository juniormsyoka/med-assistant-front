// src/screens/admin/PatientAssignments.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { getPendingPatients, getDoctors, assignPatientToDoctor } from '@/Services/adminService';
import EmptyState from '@/components/admin/EmptyState';

export default function PatientAssignments() {
  const [patients, setPatients] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<{ [key: string]: string }>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    setLoading(true);
    const [patientsData, doctorsData] = await Promise.all([
      getPendingPatients(),
      getDoctors()
    ]);
    setPatients(patientsData || []);
    setDoctors(doctorsData || []);
    setLoading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAssign = async (patientId: string) => {
    const doctorId = selectedDoctor[patientId];
    if (!doctorId) return Alert.alert('Select a doctor first');
    await assignPatientToDoctor(patientId, doctorId);
    setPatients(patients.filter((p) => p.id !== patientId));
  };

  const handleRefresh = () => {
    loadData();
  };

  const renderItem = ({ item }: any) => (
    <View style={styles.item}>
      <Text style={styles.name}>{item.name}</Text>
      <Picker
        selectedValue={selectedDoctor[item.id]}
        style={{ height: 40, width: 150 }}
        onValueChange={(value) => setSelectedDoctor({ ...selectedDoctor, [item.id]: value })}
      >
        <Picker.Item label="Select doctor" value="" />
        {doctors.map((doc) => (
          <Picker.Item key={doc.id} label={doc.name} value={doc.id} />
        ))}
      </Picker>
      <TouchableOpacity style={styles.assignBtn} onPress={() => handleAssign(item.id)}>
        <Text style={styles.assignText}>Assign</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading patient assignments...</Text>
      </View>
    );
  }

  if (patients.length === 0) {
    return (
      <EmptyState
        title="No Pending Assignments"
        message="All patients have been assigned to doctors. There are no pending assignments at the moment."
        actionText="Refresh"
        onAction={handleRefresh}
        icon="checkmark-circle-outline"
      />
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Pending Patient Assignments ({patients.length})</Text>
      <FlatList 
        data={patients} 
        keyExtractor={(item) => item.id} 
        renderItem={renderItem}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 12 },
  item: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, padding: 12, backgroundColor: 'white', borderRadius: 12, elevation: 2 },
  name: { flex: 1, fontSize: 16 },
  assignBtn: { backgroundColor: '#4361EE', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8 },
  assignText: { color: 'white', fontWeight: 'bold' },
});