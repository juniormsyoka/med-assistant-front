// src/screens/superadmin/HospitalManagement.tsx
import React, { useEffect, useState } from 'react';
import { 
  View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, Modal, TextInput, ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/Services/supabaseClient';
import { Hospital } from '@/types/auth';
import { useAuth } from '@/contexts/AuthContext';
import * as Clipboard from 'expo-clipboard';
import * as Linking from 'expo-linking';

export default function HospitalManagement() {
  const { user } = useAuth();
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  // Form state
  const [hospitalName, setHospitalName] = useState('');
  const [hospitalAddress, setHospitalAddress] = useState('');
  const [hospitalPhone, setHospitalPhone] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminName, setAdminName] = useState('');
  const [inviteToken, setInviteToken] = useState('');
  const [creating, setCreating] = useState(false);

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


  const sendEmailManually = async (email: string, token: string, hospitalName: string) => {
  const subject = `Invitation to Manage ${hospitalName} - MedAssistant`;
  const body = `
Hello Administrator,

You've been invited to manage ${hospitalName} on MedAssistant.

Your invitation token is:
${token}

To sign up:
1. Open the MedAssistant app
2. Go to Authentication  
3. Select "Sign up as Administrator"
4. Enter this token: ${token}
5. Complete your registration

This invitation token will expire in 7 days.

Best regards,
MedAssistant Team
  `.trim();

  try {
    const mailUrl = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    const canOpen = await Linking.canOpenURL(mailUrl);
    
    if (canOpen) {
      await Linking.openURL(mailUrl);
      return true;
    } else {
      Alert.alert(
        'Email App Not Found',
        'Please copy the invitation token and send it manually to the admin.',
        [{ text: 'OK' }]
      );
      return false;
    }
  } catch (error) {
    console.error('Error opening email client:', error);
    return false;
  }
};

  const createHospitalAndInviteAdmin = async () => {
    if (!hospitalName.trim() || !hospitalAddress.trim() || !adminEmail.trim()) {
      Alert.alert('Error', 'Please fill in hospital name, address, and admin email');
      return;
    }

    if (!adminEmail.includes('@')) {
      Alert.alert('Error', 'Please enter a valid admin email address');
      return;
    }

    setCreating(true);

    try {
      // Step 1: Create the hospital
      const { data: hospitalData, error: hospitalError } = await supabase
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

      if (hospitalError) throw hospitalError;

      // Step 2: Generate invitation token for admin
      const generateToken = () => {
        return 'invite_' + Date.now() + '_' + Math.random().toString(36).substring(2, 15);
      };

      const token = generateToken();

      await sendEmailManually(adminEmail, token, hospitalName);
      
      // Step 3: Create admin invitation
      const { error: inviteError } = await supabase
        .from('invitations')
        .insert({
          email: adminEmail.toLowerCase().trim(),
          token: token,
          hospital_id: hospitalData.id,
          role: 'admin',
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          is_used: false
        });

      if (inviteError) throw inviteError;

      // Step 4: Show success and token
      setInviteToken(token);
      
      Alert.alert(
        'Success!', 
        `Hospital "${hospitalName}" created and admin invitation sent to ${adminEmail}`,
        [{ text: 'OK' }]
      );

      // Refresh the hospital list
      await loadHospitals();
      
    } catch (error: any) {
      console.error('Creation error:', error);
      Alert.alert('Error', error.message || 'Failed to create hospital and invite admin');
    } finally {
      setCreating(false);
    }
  };

  const copyInviteToken = async () => {
    if (inviteToken) {
      await Clipboard.setStringAsync(inviteToken);
      Alert.alert('✅ Copied!', 'Invitation token copied to clipboard');
    }
  };

  const resetForm = () => {
    setHospitalName('');
    setHospitalAddress('');
    setHospitalPhone('');
    setAdminEmail('');
    setAdminName('');
    setInviteToken('');
  };

  const closeModal = () => {
    setShowCreateModal(false);
    resetForm();
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

      {/* Create Hospital & Admin Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        transparent={true}
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {inviteToken ? 'Hospital Created!' : 'Create Hospital & Invite Admin'}
              </Text>
              <TouchableOpacity onPress={closeModal}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              
              {!inviteToken ? (
                <>
                  {/* Hospital Information Section */}
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Hospital Information</Text>
                    
                    <TextInput
                      placeholder="Hospital Name *"
                      value={hospitalName}
                      onChangeText={setHospitalName}
                      style={styles.input}
                      editable={!creating}
                    />

                    <TextInput
                      placeholder="Address *"
                      value={hospitalAddress}
                      onChangeText={setHospitalAddress}
                      style={styles.input}
                      multiline
                      numberOfLines={3}
                      editable={!creating}
                    />

                    <TextInput
                      placeholder="Phone Number"
                      value={hospitalPhone}
                      onChangeText={setHospitalPhone}
                      style={styles.input}
                      keyboardType="phone-pad"
                      editable={!creating}
                    />
                  </View>

                  {/* Admin Information Section */}
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Admin Invitation</Text>
                    <Text style={styles.sectionSubtitle}>
                      This admin will manage the hospital and its doctors
                    </Text>
                    
                    <TextInput
                      placeholder="Admin Email Address *"
                      value={adminEmail}
                      onChangeText={setAdminEmail}
                      style={styles.input}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      editable={!creating}
                    />

                    <TextInput
                      placeholder="Admin Full Name (Optional)"
                      value={adminName}
                      onChangeText={setAdminName}
                      style={styles.input}
                      editable={!creating}
                    />
                  </View>
                </>
              ) : (
                /* Invitation Success Section */
                <View style={styles.inviteSection}>
                  <View style={styles.successIcon}>
                    <Ionicons name="checkmark-circle" size={48} color="#4CAF50" />
                  </View>
                  <Text style={styles.inviteTitle}>🎉 Hospital Created Successfully!</Text>
                  <Text style={styles.inviteDescription}>
                    Share this invitation token with the administrator:
                  </Text>
                  
                  <TouchableOpacity 
                    style={styles.tokenBox}
                    onPress={copyInviteToken}
                  >
                    <Text style={styles.tokenText} numberOfLines={1}>
                      {inviteToken}
                    </Text>
                    <View style={styles.copyBadge}>
                      <Ionicons name="copy" size={14} color="#4361EE" />
                      <Text style={styles.copyText}>Copy</Text>
                    </View>
                  </TouchableOpacity>
                  
                  <Text style={styles.tokenInstructions}>
                    The admin should enter this token when signing up for the system
                  </Text>
                  
                  <View style={styles.linkMetadata}>
                    <View style={styles.metadataItem}>
                      <Ionicons name="time" size={14} color="#666" />
                      <Text style={styles.metadataText}>Expires in 7 days</Text>
                    </View>
                    <View style={styles.metadataItem}>
                      <Ionicons name="shield-checkmark" size={14} color="#666" />
                      <Text style={styles.metadataText}>Admin role assigned</Text>
                    </View>
                  </View>
                </View>
              )}

              <View style={styles.modalActions}>
                {!inviteToken ? (
                  <>
                    <TouchableOpacity
                      style={styles.cancelButton}
                      onPress={closeModal}
                      disabled={creating}
                    >
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={[
                        styles.createButton,
                        (!hospitalName.trim() || !hospitalAddress.trim() || !adminEmail.trim() || creating) && 
                        styles.createButtonDisabled
                      ]}
                      onPress={createHospitalAndInviteAdmin}
                      disabled={!hospitalName.trim() || !hospitalAddress.trim() || !adminEmail.trim() || creating}
                    >
                      {creating ? (
                        <Text style={styles.createButtonText}>Creating...</Text>
                      ) : (
                        <Text style={styles.createButtonText}>Create & Invite</Text>
                      )}
                    </TouchableOpacity>
                  </>
                ) : (
                  <TouchableOpacity
                    style={styles.doneButton}
                    onPress={closeModal}
                  >
                    <Text style={styles.doneButtonText}>Done</Text>
                  </TouchableOpacity>
                )}
              </View>
            </ScrollView>
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
    paddingTop: 60,
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
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxHeight: '90%',
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
  modalScroll: {
    maxHeight: '80%',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
    backgroundColor: '#fafafa',
  },
  inviteSection: {
    alignItems: 'center',
    padding: 16,
  },
  successIcon: {
    marginBottom: 16,
  },
  inviteTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2e7d32',
    marginBottom: 8,
    textAlign: 'center',
  },
  inviteDescription: {
    fontSize: 16,
    color: '#2e7d32',
    marginBottom: 16,
    textAlign: 'center',
  },
  tokenBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#4CAF50',
    marginBottom: 12,
    width: '100%',
  },
  tokenText: {
    flex: 1,
    color: '#1a1a1a',
    fontSize: 16,
    fontFamily: 'monospace',
  },
  copyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4361EE10',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  copyText: {
    color: '#4361EE',
    fontSize: 14,
    fontWeight: '600',
  },
  tokenInstructions: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
    fontStyle: 'italic',
  },
  linkMetadata: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 8,
  },
  metadataItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metadataText: {
    fontSize: 12,
    color: '#666',
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
    backgroundColor: 'white',
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
  doneButton: {
    flex: 1,
    backgroundColor: '#4CAF50',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  doneButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});