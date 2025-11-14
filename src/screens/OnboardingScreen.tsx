// src/screens/patient/OnboardingScreen.tsx
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  Alert, 
  ActivityIndicator, 
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  TextInput
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';
import { fetchHospitals } from '../Services/hospitalService';
import { fetchDoctorsForHospital } from '../Services/doctorService';
import { assignDoctorToPatient } from '../Services/patientService';
import { fetchUserProfile } from '../Services/authService';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { supabase } from '../Services/supabaseClient';

import { toast } from '@/Services/toastService';

// Update the type definition to match your drawer navigator structure
type PatientStackParamList = {
  Onboarding: undefined;
  Home: {
    doctorAssigned?: boolean;
    doctorId?: string;
    doctorName?: string;
  };
  Chat: undefined;
};

type Props = NativeStackScreenProps<PatientStackParamList, 'Onboarding'>;

export default function OnboardingScreen({ navigation }: Props) {
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [selectedHospital, setSelectedHospital] = useState<string>('');
  const [selectedDoctor, setSelectedDoctor] = useState<string>('');
  const [patientId, setPatientId] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [hospitalError, setHospitalError] = useState<string>('');
  const [doctorError, setDoctorError] = useState<string>('');
  const [hospitalLoading, setHospitalLoading] = useState<boolean>(true);
  const [profileLoading, setProfileLoading] = useState<boolean>(true);
  
  // Temporary debug state - remove in production
  const [manualPatientId, setManualPatientId] = useState('');

  useEffect(() => {
    loadUserProfileAndHospitals();
  }, []);

  const loadUserProfileAndHospitals = async () => {
    try {
      setProfileLoading(true);
      
      // Method 1: Try to get user from Supabase auth
      const { data: { user } } = await supabase.auth.getUser();
     // console.log('Supabase auth user:', user);
      
      if (user?.id) {
        setPatientId(user.id);
      //  console.log('Set patientId from auth:', user.id);
      } else {
        // Method 2: Try fetchUserProfile
        try {
          const profile = await fetchUserProfile();
        //  console.log('Fetched user profile:', profile);
          if (profile?.id) {
            setPatientId(profile.id);
         //   console.log('Set patientId from profile:', profile.id);
          }
        } catch (profileError) {
          console.error('Failed to fetch user profile:', profileError);
        }
      }
      
      // Load hospitals after getting user ID
      await loadHospitals();
    } catch (error: any) {
      console.error('Failed to load user data:', error);
      Alert.alert('Error', 'Failed to load your user information. Please log out and try again.');
    } finally {
      setProfileLoading(false);
    }
  };

  const loadHospitals = async (isRefreshing = false) => {
    try {
      if (!isRefreshing) setHospitalLoading(true);
      setHospitalError('');
      
      const hospitalData = await fetchHospitals();
      setHospitals(hospitalData);
      
      if (hospitalData.length === 0) {
      //  setHospitalError('No hospitals found in your area. Please try again later or contact support.');
       toast.error('No hospitals found in your area. Please try again later or contact support.');
      
    }
    } catch (error: any) {
      console.error('Hospital fetch error:', error);
      //setHospitalError(error.message || 'Failed to load hospitals. Please check your connection and try again.');
        toast.error('Failed to load hospitals. Please check your connection and try again');
    } finally {
      setHospitalLoading(false);
      setRefreshing(false);
    }
  };

  const onHospitalSelect = async (hospitalId: string) => {
    setSelectedHospital(hospitalId);
    setSelectedDoctor('');
    setDoctorError('');
    
    if (!hospitalId) {
      setDoctors([]);
      return;
    }

    setLoading(true);
    try {
      const doctorData = await fetchDoctorsForHospital(hospitalId);
      setDoctors(doctorData);
      
      if (doctorData.length === 0) {
       // setDoctorError(`No doctors available at the selected hospital. Please choose a different hospital or try again later.`);
      toast.error("No doctors available at the selected hospital. Please choose a different hospital or try again later.")
      }
    } catch (error: any) {
      console.error('Doctor fetch error:', error);
      //setDoctorError( error.message || 'Failed to load doctors for this hospital. Please try again.');
      toast.error("'Failed to load doctors for this hospital. Please try again.'")
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    setSelectedHospital('');
    setSelectedDoctor('');
    setDoctors([]);
    setHospitalError('');
    setDoctorError('');
    loadHospitals(true);
  };

  const navigateToDashboard = () => {
    // Navigate to the Home drawer item with params
    navigation.navigate('Home', {
      doctorAssigned: true,
      doctorId: selectedDoctor,
      doctorName: doctors.find(d => d.id === selectedDoctor)?.full_name 
    });
  };

  const getSelectedHospitalName = () => {
    return hospitals.find(h => h.id === selectedHospital)?.name || 'Selected Hospital';
  };

  const handleSubmit = async () => {
    // Validate all required fields
    if (!selectedDoctor || !selectedHospital) {
      toast.info('Selection Required!! Please select both a hospital and a doctor to continue.');
      return;
    }

    if (!patientId || patientId === '') {
     toast.info('Authentication Error!! Unable to identify your user account. Please try logging out and back in.');
      return;
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(patientId)) {
      toast.info('Invalid User ID! Your user ID is not in the correct format. Please log out and try again.');
      return;
    }

    console.log('✅ Submitting with valid data:', {
      patientId,
      selectedDoctor, 
      selectedHospital,
      patientIdLength: patientId.length,
      doctorIdLength: selectedDoctor.length,
      hospitalIdLength: selectedHospital.length
    });
    
    setLoading(true);
    try {
      await assignDoctorToPatient(patientId, selectedDoctor, selectedHospital);

      Alert.alert(
        'Success!', 
        'Your doctor has been assigned successfully. You can now start messaging them.',
        [{ text: 'Continue', onPress: () => navigateToDashboard() }]
      );
    } catch (error: any) {
      console.error('❌ Assignment failed:', error);
      Alert.alert(
        'Assignment Failed', 
        error.message || 'Failed to assign doctor. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  // Add a debug section to your UI to see the patient ID
  const renderDebugInfo = () => {
    if (__DEV__) { // Only show in development
      return (
        <View style={styles.debugContainer}>
          <Text style={styles.debugText}>Patient ID: {patientId || 'NOT SET'}</Text>
          <Text style={styles.debugText}>Patient ID Length: {patientId?.length || 0}</Text>
          <Text style={styles.debugText}>Is Valid UUID: {/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(patientId) ? 'YES' : 'NO'}</Text>
          
          {/* Temporary debug input - remove in production */}
          <Text style={[styles.debugText, { marginTop: 10 }]}>Manual Patient ID (Dev only):</Text>
          <TextInput
            style={styles.debugInput}
            value={manualPatientId}
            onChangeText={setManualPatientId}
            placeholder="Enter patient UUID"
            placeholderTextColor="#666"
          />
          <TouchableOpacity 
            style={styles.debugButton}
            onPress={() => {
              if (manualPatientId) {
                setPatientId(manualPatientId);
                Alert.alert('Debug', 'Manual Patient ID set');
              }
            }}
          >
            <Text style={styles.debugButtonText}>Use This ID</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return null;
  };

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={['#4CAF50']}
          tintColor="#4CAF50"
        />
      }
    >
      <View style={styles.content}>
        {/* Debug Info */}
        {renderDebugInfo()}

        {/* Header */}
        <View style={styles.header}>
          <Ionicons name="medical" size={32} color="#4CAF50" />
          <Text style={styles.title}>Setup Your Care Team</Text>
          <Text style={styles.subtitle}>
            Select your hospital and doctor to start your healthcare journey
          </Text>
        </View>

        {/* Show loading if still loading profile */}
        {profileLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4CAF50" />
            <Text style={styles.loadingText}>Loading your profile...</Text>
          </View>
        )}

        {/* Rest of your existing UI components */}
        {!profileLoading && (
          <>
            {/* Hospital Selection Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>1. Select Your Hospital</Text>
              
              {hospitalLoading && !refreshing && (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color="#4CAF50" />
                  <Text style={styles.loadingText}>Loading hospitals...</Text>
                </View>
              )}

              {hospitalError ? (
                <View style={styles.errorCard}>
                  <Ionicons name="warning-outline" size={24} color="#FF6B6B" />
                  <View style={styles.errorTextContainer}>
                    <Text style={styles.errorTitle}>No Hospitals Found</Text>
                    <Text style={styles.errorMessage}>{hospitalError}</Text>
                  </View>
                  <TouchableOpacity style={styles.retryButton} onPress={onRefresh}>
                    <Ionicons name="refresh" size={16} color="#FFF" />
                    <Text style={styles.retryButtonText}>Retry</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={selectedHospital}
                    onValueChange={onHospitalSelect}
                    dropdownIconColor="#4CAF50"
                    style={styles.picker}
                    enabled={!hospitalLoading && hospitals.length > 0}
                  >
                    <Picker.Item label="Choose a hospital..." value="" color="#666" />
                    {hospitals.map(h => (
                      <Picker.Item key={h.id} label={h.name} value={h.id} />
                    ))}
                  </Picker>
                </View>
              )}

              {hospitals.length > 0 && !hospitalError && (
                <Text style={styles.hintText}>
                  {hospitals.length} hospital{hospitals.length !== 1 ? 's' : ''} available
                </Text>
              )}
            </View>

            {/* Doctor Selection Section */}
            {selectedHospital && !hospitalError && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>2. Select Your Doctor</Text>
                <Text style={styles.hospitalName}>{getSelectedHospitalName()}</Text>
                
                {loading && (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color="#4CAF50" />
                    <Text style={styles.loadingText}>Loading doctors...</Text>
                  </View>
                )}

                {doctorError ? (
                  <View style={styles.warningCard}>
                    <Ionicons name="information-circle-outline" size={24} color="#FFA000" />
                    <View style={styles.errorTextContainer}>
                      <Text style={styles.warningTitle}>No Doctors Available</Text>
                      <Text style={styles.warningMessage}>{doctorError}</Text>
                    </View>
                    <TouchableOpacity 
                      style={styles.secondaryButton} 
                      onPress={() => onHospitalSelect(selectedHospital)}
                    >
                      <Text style={styles.secondaryButtonText}>Retry</Text>
                    </TouchableOpacity>
                  </View>
                ) : doctors.length > 0 ? (
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={selectedDoctor}
                      onValueChange={setSelectedDoctor}
                      style={styles.picker}
                      dropdownIconColor="#4CAF50"
                      enabled={!loading}
                    >
                      <Picker.Item label="Choose a doctor..." value="" color="#666" />
                      {doctors.map(d => (
                        <Picker.Item 
                          key={d.id} 
                          label={d.full_name} 
                          value={d.id} 
                        />
                      ))}
                    </Picker>
                  </View>
                ) : selectedHospital && !loading && (
                  <View style={styles.infoCard}>
                    <Ionicons name="information-circle-outline" size={24} color="#2196F3" />
                    <Text style={styles.infoText}>
                      Select a hospital above to see available doctors
                    </Text>
                  </View>
                )}

                {doctors.length > 0 && !doctorError && (
                  <Text style={styles.hintText}>
                    {doctors.length} doctor{doctors.length !== 1 ? 's' : ''} available at this hospital
                  </Text>
                )}
              </View>
            )}

            {/* Submit Button */}
            {selectedDoctor && selectedHospital && !hospitalError && !doctorError && (
              <View style={styles.section}>
                <TouchableOpacity
                  style={[
                    styles.submitButton,
                    (loading || !selectedDoctor || !selectedHospital) && styles.submitButtonDisabled
                  ]}
                  onPress={handleSubmit}
                  disabled={loading || !selectedDoctor || !selectedHospital}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle" size={20} color="#FFF" />
                      <Text style={styles.submitButtonText}>Complete Setup</Text>
                    </>
                  )}
                </TouchableOpacity>
                
                <Text style={styles.finalHint}>
                  You'll be able to message Dr. {doctors.find(d => d.id === selectedDoctor)?.full_name} at {getSelectedHospitalName()} once setup is complete.
                </Text>
              </View>
            )}
          </>
        )}

        {/* Support Information */}
        <View style={styles.supportCard}>
          <Ionicons name="help-circle-outline" size={20} color="#666" />
          <Text style={styles.supportText}>
            Having trouble finding a hospital or doctor?{'\n'}
            <Text style={styles.supportLink}>Contact support for assistance</Text>
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

// Keep all your existing styles the same...
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  content: {
    padding: 20,
    paddingTop: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginTop: 16,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#ccc',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 22,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
    marginBottom: 12,
  },
  hospitalName: {
    fontSize: 14,
    color: '#4CAF50',
    marginBottom: 12,
    fontStyle: 'italic',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 8,
    backgroundColor: '#2a2a2a',
    overflow: 'hidden',
  },
  picker: {
    color: 'white',
    height: 50,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
  },
  loadingText: {
    color: '#ccc',
    marginLeft: 12,
    fontSize: 14,
  },
  hintText: {
    fontSize: 12,
    color: '#888',
    marginTop: 8,
    fontStyle: 'italic',
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a1a1a',
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#FF6B6B',
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a1a',
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#FFA000',
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a2a2a',
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  errorTextContainer: {
    flex: 1,
    marginLeft: 12,
    marginRight: 12,
  },
  errorTitle: {
    color: '#FF6B6B',
    fontWeight: '600',
    fontSize: 14,
    marginBottom: 4,
  },
  warningTitle: {
    color: '#FFA000',
    fontWeight: '600',
    fontSize: 14,
    marginBottom: 4,
  },
  errorMessage: {
    color: '#ccc',
    fontSize: 12,
    lineHeight: 16,
  },
  warningMessage: {
    color: '#ccc',
    fontSize: 12,
    lineHeight: 16,
  },
  infoText: {
    color: '#ccc',
    fontSize: 12,
    marginLeft: 12,
    flex: 1,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  retryButtonText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FFA000',
  },
  secondaryButtonText: {
    color: '#FFA000',
    fontSize: 12,
    fontWeight: '600',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#666',
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  finalHint: {
    fontSize: 12,
    color: '#888',
    marginTop: 12,
    textAlign: 'center',
    lineHeight: 16,
    fontStyle: 'italic',
  },
  supportCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    padding: 16,
    borderRadius: 8,
    marginTop: 20,
  },
  supportText: {
    color: '#ccc',
    fontSize: 12,
    marginLeft: 12,
    flex: 1,
    lineHeight: 16,
  },
  supportLink: {
    color: '#4CAF50',
    textDecorationLine: 'underline',
  },
  // Debug styles
  debugContainer: {
    backgroundColor: '#2a2a2a',
    padding: 10,
    borderRadius: 8,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#FFA000',
  },
  debugText: {
    color: '#FFA000',
    fontSize: 12,
    fontFamily: 'monospace',
  },
  debugInput: {
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 4,
    padding: 8,
    color: 'white',
    marginTop: 5,
    fontSize: 12,
  },
  debugButton: {
    backgroundColor: '#FFA000',
    padding: 8,
    borderRadius: 4,
    marginTop: 5,
    alignItems: 'center',
  },
  debugButtonText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
});