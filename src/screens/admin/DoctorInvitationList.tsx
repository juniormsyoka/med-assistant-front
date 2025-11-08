// src/screens/admin/InvitationManagementScreen.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/Services/supabaseClient';
import EmptyState from '@/components/admin/EmptyState';

export default function DoctorInvitationsList(){
  const [invitations, setInvitations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadInvitations = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('invitations')
        .select('token, email, role, hospital_id, expires_at, is_used, used_at, created_at')
        .eq('role', 'doctor')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading invitations:', error);
        Alert.alert('Error', 'Failed to load invitations');
        return;
      }

      setInvitations(data || []);
    } catch (error) {
      console.error('Unexpected error:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadInvitations();
    setRefreshing(false);
  };

  useEffect(() => {
    loadInvitations();
  }, []);

  const handleCreateInvitation = () => {
    // Navigate to create invitation screen
    Alert.alert('Create Invitation', 'Navigate to invitation creation screen');
  };

  const copyInvitationLink = (token: string) => {
    // In a real app, you might copy to clipboard
    const link = `medassistant://doctor-signup?token=${token}`;
    Alert.alert('Invitation Link', link);
  };

  const getInvitationStatus = (invite: any) => {
    if (invite.is_used) return { status: 'Used', color: '#28a745', icon: 'checkmark-circle' };
    
    const now = new Date();
    const expiresAt = new Date(invite.expires_at);
    if (expiresAt < now) return { status: 'Expired', color: '#dc3545', icon: 'time-outline' };
    
    return { status: 'Active', color: '#17a2b8', icon: 'hourglass-outline' };
  };

  const renderItem = ({ item }: any) => {
    const status = getInvitationStatus(item);

    return (
      <View style={styles.item}>
        <View style={styles.invitationInfo}>
          <Text style={styles.email}>{item.email || 'No email specified'}</Text>
          <Text style={styles.token}>Token: {item.token}</Text>
          <Text style={styles.expiry}>
            Expires: {new Date(item.expires_at).toLocaleDateString()}
          </Text>
          {item.used_at && (
            <Text style={styles.usedAt}>
              Used: {new Date(item.used_at).toLocaleDateString()}
            </Text>
          )}
        </View>
        
        <View style={styles.statusSection}>
          <View style={[styles.statusBadge, { backgroundColor: status.color }]}>
            <Ionicons name={status.icon as any} size={12} color="white" />
            <Text style={styles.statusText}>{status.status}</Text>
          </View>
          
          {!item.is_used && new Date(item.expires_at) > new Date() && (
            <TouchableOpacity 
              onPress={() => copyInvitationLink(item.token)}
              style={styles.copyButton}
            >
              <Ionicons name="link" size={16} color="#4361EE" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading invitations...</Text>
      </View>
    );
  }

  if (invitations.length === 0) {
    return (
      <EmptyState
        title="No Invitations"
        message="You haven't created any doctor invitations yet. Create your first invitation to onboard doctors."
        actionText="Create Invitation"
        onAction={handleCreateInvitation}
        icon="mail-outline"
      />
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Doctor Invitations</Text>
        <Text style={styles.subtitle}>Track and manage doctor invitation tokens</Text>
        
        <TouchableOpacity 
          style={styles.createButton}
          onPress={handleCreateInvitation}
        >
          <Ionicons name="add-circle" size={20} color="white" />
          <Text style={styles.createButtonText}>Create Invitation</Text>
        </TouchableOpacity>
      </View>
      
      <FlatList
        data={invitations}
        keyExtractor={(item) => item.token}
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
  subtitle: { fontSize: 14, color: '#666', marginBottom: 16 },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4361EE',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    alignSelf: 'flex-start',
    gap: 8,
  },
  createButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
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
  invitationInfo: { flex: 1, marginRight: 12 },
  email: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 4 },
  token: { fontSize: 12, color: '#666', marginBottom: 4, fontFamily: 'monospace' },
  expiry: { fontSize: 12, color: '#888', marginBottom: 2 },
  usedAt: { fontSize: 12, color: '#28a745' },
  statusSection: { alignItems: 'flex-end', gap: 8 },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
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
  copyButton: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: '#f8f9fa',
  },
});