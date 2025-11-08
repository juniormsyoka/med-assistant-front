// src/screens/admin/InviteDoctorScreen.tsx
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  Alert, 
  StyleSheet, 
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform 
} from 'react-native';
import { useTheme } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/Services/supabaseClient';
import * as Crypto from 'expo-crypto';
import { useAuth } from '@/contexts/AuthContext';
import * as Clipboard from 'expo-clipboard';
import * as Linking from 'expo-linking';

interface HospitalInfo {
  id: string;
  name: string;
  address?: string;
}

export default function InviteDoctorScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [inviteLink, setInviteLink] = useState('');
  const [hospitalInfo, setHospitalInfo] = useState<HospitalInfo | null>(null);
  const { user } = useAuth();
   const { colors } = useTheme();

  // Load hospital information
  useEffect(() => {
    const loadHospitalInfo = async () => {
      if (!user?.hospital_id) return;

      try {
        const { data, error } = await supabase
          .from('hospitals')
          .select('id, name, address')
          .eq('id', user.hospital_id)
          .single();

        if (error) throw error;
        setHospitalInfo(data);
      } catch (error) {
        console.error('Error loading hospital info:', error);
      }
    };

    loadHospitalInfo();
  }, [user?.hospital_id]);

  const copyHospitalId = async () => {
    if (hospitalInfo?.id) {
      await Clipboard.setStringAsync(hospitalInfo.id);
      Alert.alert('✅ Copied!', 'Hospital ID copied to clipboard');
    }
  };

  const copyInviteLink = async () => {
    if (inviteLink) {
      await Clipboard.setStringAsync(inviteLink);
      Alert.alert(
        '✅ Link Copied!', 
        'Invitation link copied to clipboard. You can now paste it in an email or message to the doctor.',
        [{ text: 'OK' }]
      );
    }
  };

 const sendEmailManually = async (
  email: string,
  token: string,
  hospitalName: string
) => {
  const subject = `Invitation to Join ${hospitalName} - MedAssistant`;

  const body = `
Hello Doctor,

You've been invited to join ${hospitalName} on MedAssistant as a healthcare provider.

Your invitation token is:
${token}

To sign up:
1. Open the MedAssistant app
2. Go to Authentication
3. Select "Sign up as Doctor" 
4. Enter this token: ${token}
5. Complete your registration

This invitation token will expire in 7 days.

Once you join, you'll be able to:
• Manage your patient appointments
• Communicate with patients securely
• Access medical records (where permitted)
• Prescribe medications digitally

If you have any questions, please contact your hospital administrator.

Best regards,
MedAssistant Team
  `.trim();

  try {
    // Open device email client
    const mailUrl = `mailto:${email}?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(body)}`;

    const canOpen = await Linking.canOpenURL(mailUrl);
    if (canOpen) {
      await Linking.openURL(mailUrl);
      return true;
    } else {
      Alert.alert(
        'Email App Not Found',
        'Please copy the invitation token and send it manually to the doctor.',
        [{ text: 'OK' }]
      );
      return false;
    }
  } catch (error) {
    console.error('Error opening email client:', error);
    Alert.alert(
      'Error',
      'Failed to open email client. Please copy the token and send it manually.'
    );
    return false;
  }
};


  const handleInvite = async () => {
  // ... validation code ...

  setLoading(true);
  try {
    // Generate a secure token
    const token = Crypto.randomUUID();

    // Insert invitation
    const { data, error } = await supabase
      .from('invitations')
      .insert([
        {
          email: email.toLowerCase().trim(),
          token, // Just the token, no deep link
          hospital_id: user?.hospital_id,
          role: 'doctor',
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          is_used: false
        },
      ])
      .select()
      .single();

    if (error) throw error;

    // Just set the token for display, not a deep link
    setInviteLink(token); // Changed from generatedLink to just token

    // Auto-open email client with just the token
    const emailSent = await sendEmailManually(
      email, 
      token, // Just the token
      hospitalInfo?.name || 'Our Hospital'
    );

    // ... rest of your code ...
  } catch (err: any) {
    // ... error handling ...
  } finally {
    setLoading(false);
  }
};

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: colors.background } ]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Ionicons name="person-add" size={32} color="#4361EE" />
          <Text style={[styles.title, { color: colors.text }]}>Invite Doctor</Text>
          <Text style={styles.subtitle}>
            Send an invitation to a doctor to join your hospital
          </Text>
        </View>

        {/* Hospital Information Card */}
        {hospitalInfo && (
          <View style={styles.hospitalCard}>
            <View style={styles.hospitalHeader}>
              <Ionicons name="business" size={24} color="#4361EE" />
              <Text style={styles.hospitalTitle}>Your Hospital</Text>
            </View>
            
            <View style={styles.hospitalInfo}>
              <Text style={styles.hospitalName}>{hospitalInfo.name}</Text>
              {hospitalInfo.address && (
                <Text style={styles.hospitalAddress}>{hospitalInfo.address}</Text>
              )}
              
              <View style={styles.hospitalIdSection}>
                <Text style={styles.hospitalIdLabel}>Hospital ID:</Text>
                <TouchableOpacity 
                  style={styles.hospitalIdContainer}
                  onPress={copyHospitalId}
                >
                  <Text style={styles.hospitalId} numberOfLines={1}>
                    {hospitalInfo.id}
                  </Text>
                  <Ionicons name="copy" size={16} color="#4361EE" />
                </TouchableOpacity>
                <Text style={styles.hospitalIdHelper}>
                  Tap to copy Hospital ID
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Invitation Form */}
        <View style={styles.formContainer}>
          <Text style={styles.sectionTitle}>Send Invitation</Text>

          {/* Email Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Doctor's Email <Text style={styles.required}>*</Text>
            </Text>
            <View style={styles.inputContainer}>
              <Ionicons name="mail" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                placeholder="doctor@hospital.com"
                value={email}
                onChangeText={setEmail}
                style={styles.input}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
              />
            </View>
          </View>

          {/* Invite Button */}
          <TouchableOpacity
            style={[
              styles.inviteButton,
              (!email || loading) && styles.buttonDisabled
            ]}
            onPress={handleInvite}
            disabled={!email || loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="send" size={20} color="#fff" />
                <Text style={styles.inviteButtonText}>Send Invitation</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Invitation Link Display */}
          {inviteLink && (
            <View style={styles.linkContainer}>
              <Text style={styles.linkLabel}>🎉 Invitation Created!</Text>
              <Text style={styles.linkDescription}>
                Share this token with the doctor:
              </Text>
              
              <TouchableOpacity 
                style={styles.linkBox}
                onPress={copyInviteLink}
              >
                <Text style={styles.linkText} numberOfLines={1}>
                  {inviteLink} {/* This should now be just the token */}
                </Text>
                <View style={styles.copyBadge}>
                  <Ionicons name="copy" size={14} color="#4361EE" />
                  <Text style={styles.copyText}>Copy</Text>
                </View>
              </TouchableOpacity>
              
              <Text style={styles.tokenInstructions}>
                Doctor should enter this token in the app when signing up
              </Text>
              
              <View style={styles.linkMetadata}>
                <View style={styles.metadataItem}>
                  <Ionicons name="time" size={14} color="#666" />
                  <Text style={styles.metadataText}>Expires in 7 days</Text>
                </View>
                <View style={styles.metadataItem}>
                  <Ionicons name="shield-checkmark" size={14} color="#666" />
                  <Text style={styles.metadataText}>Doctor role assigned</Text>
                </View>
              </View>
            </View>
          )}
        </View>

        {/* Quick Stats */}
        <View style={styles.statsContainer}>
          <Text style={styles.statsTitle}>Invitation Benefits</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Ionicons name="time" size={24} color="#4361EE" />
              <Text style={styles.statNumber}>7 Days</Text>
              <Text style={styles.statLabel}>Link Valid</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="shield-checkmark" size={24} color="#4CAF50" />
              <Text style={styles.statNumber}>Auto</Text>
              <Text style={styles.statLabel}>Role Setup</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="business" size={24} color="#7209B7" />
              <Text style={styles.statNumber}>Your</Text>
              <Text style={styles.statLabel}>Hospital</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginTop: 12,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  hospitalCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  hospitalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  hospitalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  hospitalInfo: {
    gap: 12,
  },
  hospitalName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4361EE',
  },
  hospitalAddress: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  hospitalIdSection: {
    marginTop: 8,
  },
  hospitalIdLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 6,
  },
  hospitalIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
    gap: 8,
  },
  hospitalId: {
    flex: 1,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 12,
    color: '#1a1a1a',
  },
  hospitalIdHelper: {
    fontSize: 11,
    color: '#666',
    marginTop: 4,
    fontStyle: 'italic',
  },
  formContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  required: {
    color: '#FF6B6B',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    backgroundColor: '#fafafa',
  },
  inputIcon: {
    padding: 12,
  },
  input: {
    flex: 1,
    padding: 12,
    fontSize: 16,
    color: '#1a1a1a',
  },
  inviteButton: {
    backgroundColor: '#4361EE',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  buttonDisabled: {
    backgroundColor: '#cccccc',
  },
  inviteButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  linkContainer: {
    marginTop: 24,
    padding: 20,
    backgroundColor: '#e8f5e8',
    borderRadius: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  linkLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2e7d32',
    marginBottom: 8,
  },
  linkDescription: {
    color: '#2e7d32',
    marginBottom: 12,
  },
  linkBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#4CAF50',
    marginBottom: 12,
    gap: 12,
  },
  linkText: {
    flex: 1,
    color: '#1a1a1a',
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  copyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4361EE10',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  copyText: {
    color: '#4361EE',
    fontSize: 12,
    fontWeight: '600',
  },
  linkMetadata: {
    gap: 8,
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
  statsContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 16,
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  tokenInstructions: {
  fontSize: 12,
  color: '#666',
  textAlign: 'center',
  marginTop: 8,
  fontStyle: 'italic',
}
});