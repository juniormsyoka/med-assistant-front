import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { fetchUserProfile } from '@/Services/authService';
import { getPatientDoctor } from '@/Services/patientService';
import { ActivityIndicator } from 'react-native-paper';
import { chatService } from '@/Services/chatService'; // ✅ import chatService

// Define the route params type
type ChatLauncherRouteParams = {
  doctorAssigned?: boolean;
  doctorId?: string;
  doctorName?: string;
};

type ChatLauncherRouteProp = RouteProp<{ params: ChatLauncherRouteParams }, 'params'>;

const ChatLauncher: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<ChatLauncherRouteProp>();
  const [userProfile, setUserProfile] = useState<any>(null);
  const [assignedDoctor, setAssignedDoctor] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserData();

    // Check for params from onboarding
    const params = route.params;
    if (params?.doctorAssigned && params.doctorId && params.doctorName) {
      Alert.alert(
        'Success!',
        `You've been assigned to Dr. ${params.doctorName}. You can now start chatting!`,
        [
          { 
            text: 'Start Chatting', 
            onPress: () => handleDoctorChatDirect(params.doctorId!) 
          },
          { 
            text: 'Later', 
            style: 'cancel' 
          }
        ]
      );
    }
  }, [route.params]);

  const loadUserData = async () => {
    try {
      const profile = await fetchUserProfile();
      setUserProfile(profile);

      if (profile?.id && profile.role === 'patient') {
        try {
          const doctorData = await getPatientDoctor(profile.id);
          setAssignedDoctor(doctorData);
        } catch {
          setAssignedDoctor(null);
        }
      }
    } catch (error) {
      console.error('Failed to load user data:', error);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Use chatService to get real conversation UUID
  const handleDoctorChatDirect = async (doctorId: string) => {
    if (!userProfile?.id) return;

    try {
      const conversationId = await chatService.getOrCreateConversation(
        userProfile.id,
        doctorId
      );

      navigation.navigate('ChatRoom', {
        mode: 'doctor',
        adapter: 'DoctorAdapter',
        conversationId, // ✅ real UUID
        userRole: 'patient',
        userId: userProfile.id,
        assignedDoctorId: doctorId,
      });
    } catch (error) {
      console.error('Failed to get conversation UUID:', error);
      Alert.alert('Error', 'Unable to open chat. Try again later.');
    }
  };

  const handleDoctorChat = async () => {
    if (!assignedDoctor?.doctor_id) {
      Alert.alert(
        'Doctor Not Assigned',
        'You need to select a hospital and doctor before you can message them.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Set Up Now', onPress: () => navigation.navigate('Onboarding') }
        ]
      );
      return;
    }

    await handleDoctorChatDirect(assignedDoctor.doctor_id);
  };

  const handleAIChat = () => {
    navigation.navigate('ChatRoom', {
      mode: 'ai',
      adapter: 'GroqAdapter',
      conversationId: 'ai-assistant',
      userRole: 'patient',
      userId: userProfile?.id || 'user-1',
    });
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#4361EE" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Choose Chat Type</Text>

      <TouchableOpacity style={[styles.option, { backgroundColor: '#4361EE' }]} onPress={handleAIChat}>
        <Ionicons name="chatbubbles" size={28} color="#fff" />
        <Text style={styles.optionText}>Chat with AI Assistant</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.option, { backgroundColor: '#3A0CA3' }]} onPress={handleDoctorChat}>
        <Ionicons name="medkit" size={28} color="#fff" />
        <Text style={styles.optionText}>
          {assignedDoctor?.doctor_id ? 'Message My Doctor' : 'Set Up Doctor Chat'}
        </Text>
      </TouchableOpacity>

      {assignedDoctor?.doctor_id && assignedDoctor.doctor && (
        <View style={styles.infoBox}>
          <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
          <View style={styles.doctorInfo}>
            <Text style={styles.doctorName}>Dr. {assignedDoctor.doctor.full_name}</Text>
            {assignedDoctor.hospital && <Text style={styles.hospitalName}>{assignedDoctor.hospital.name}</Text>}
          </View>
        </View>
      )}

      {!assignedDoctor?.doctor_id && (
        <View style={styles.warningBox}>
          <Ionicons name="warning" size={20} color="#FFA000" />
          <Text style={styles.warningText}>You need to select a doctor before you can message them</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: '#f8f9fa' },
  header: { fontSize: 24, fontWeight: '700', marginBottom: 32, color: '#333' },
  loadingText: { marginTop: 12, color: '#666', fontSize: 16 },
  option: { width: '90%', paddingVertical: 18, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  optionText: { color: '#fff', fontSize: 17, fontWeight: '600', marginLeft: 10 },
  infoBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E8F5E8', padding: 12, borderRadius: 8, marginTop: 16, borderLeftWidth: 4, borderLeftColor: '#4CAF50', width: '90%' },
  doctorInfo: { marginLeft: 8, flex: 1 },
  doctorName: { color: '#2E7D32', fontWeight: '600', fontSize: 14 },
  hospitalName: { color: '#4CAF50', fontSize: 12, marginTop: 2 },
  warningBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF3CD', padding: 12, borderRadius: 8, marginTop: 16, borderLeftWidth: 4, borderLeftColor: '#FFA000', width: '90%' },
  warningText: { color: '#856404', marginLeft: 8, fontSize: 14 }
});

export default ChatLauncher;
