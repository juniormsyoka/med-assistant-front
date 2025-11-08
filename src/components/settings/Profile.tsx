// components/settings/ProfileSection.tsx
import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Image,
  Alert,
  ActivityIndicator
} from 'react-native';
import { useTheme } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

import TextInputField from '../chat/TextInputField';
import { UserProfile } from '../../models/User';
import { settingsService } from '../../Services/Settings';

interface ProfileSectionProps {
  profile: Partial<UserProfile>;
  setProfile: React.Dispatch<React.SetStateAction<Partial<UserProfile>>>;
}

const ProfileSection: React.FC<ProfileSectionProps> = ({ profile, setProfile }) => {
  const { colors } = useTheme();
  const [uploading, setUploading] = useState(false);

  const pickImage = async () => {
    try {
      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission required', 
          'Sorry, we need camera roll permissions to change your profile picture.'
        );
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setUploading(true);
        
        // Update profile picture - this now stores as file URI
        await settingsService.updateProfilePicture(result.assets[0].uri);
        
        // Get the updated profile with file URI
        const storedProfile = await settingsService.getProfile();
        console.log('Profile picture updated:', storedProfile.profilePicture);
        
        setProfile(prev => ({ 
          ...prev, 
          profilePicture: storedProfile.profilePicture 
        }));
        
        Alert.alert('Success', 'Profile picture updated!');
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to update profile picture');
    } finally {
      setUploading(false);
    }
  };

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission required', 
          'Sorry, we need camera permissions to take a photo.'
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: false,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        setUploading(true);

        await settingsService.updateProfilePicture(result.assets[0].uri);

        const storedProfile = await settingsService.getProfile();
        console.log('Profile picture taken:', storedProfile.profilePicture);
        
        setProfile(prev => ({ 
          ...prev, 
          profilePicture: storedProfile.profilePicture 
        }));

        Alert.alert('Success', 'Profile picture updated!');
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo');
    } finally {
      setUploading(false);
    }
  };

  const removeProfilePicture = async () => {
    try {
      setUploading(true);
      await settingsService.removeProfilePicture();
      
      const storedProfile = await settingsService.getProfile();
      setProfile(prev => ({ 
        ...prev, 
        profilePicture: storedProfile.profilePicture 
      }));
      
      Alert.alert('Success', 'Profile picture removed');
    } catch (error) {
      console.error('Error removing profile picture:', error);
      Alert.alert('Error', 'Failed to remove profile picture');
    } finally {
      setUploading(false);
    }
  };

  const createAlertButton = (
    text: string, 
    onPress: () => void, 
    style: 'default' | 'destructive' | 'cancel' = 'default'
  ) => ({ text, onPress, style });

  const showImagePickerOptions = () => {
    const buttons = [
      createAlertButton('Take Photo', takePhoto),
      createAlertButton('Choose from Library', pickImage),
      ...(profile.profilePicture ? [
        createAlertButton('Remove Current Photo', removeProfilePicture, 'destructive')
      ] : []),
      createAlertButton('Cancel', () => {}, 'cancel'),
    ];

    Alert.alert('Profile Picture', 'Choose an option', buttons);
  };

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Ionicons name="person-outline" size={22} color={colors.primary} />
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Profile
        </Text>
      </View>
      
      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      {/* Profile Picture Section */}
      <View style={styles.profilePictureSection}>
        <Text style={[styles.profilePictureLabel, { color: colors.text }]}>
          Profile Picture
        </Text>
        
        <View style={styles.profilePictureContainer}>
          <TouchableOpacity 
            onPress={showImagePickerOptions}
            disabled={uploading}
            style={[
              styles.profilePictureButton,
              { 
                borderColor: colors.primary,
                backgroundColor: profile.profilePicture ? 'transparent' : 'rgba(0,0,0,0.05)',
              }
            ]}
            activeOpacity={0.7}
          >
            {profile.profilePicture ? (
              <Image 
                source={{ uri: profile.profilePicture }} 
                style={styles.profileImage}
                resizeMode="cover"
                onError={(e) => {
                  console.error('Error loading profile image:', e.nativeEvent.error);
                  console.log('Failed URI:', profile.profilePicture);
                  // If image fails to load, remove it
                  removeProfilePicture();
                }}
                onLoad={() => {
                  console.log('Profile image loaded successfully:', profile.profilePicture);
                }}
              />
            ) : (
              <Ionicons name="person" size={40} color={colors.primary} />
            )}
            
            {uploading && (
              <View style={styles.uploadingOverlay}>
                <ActivityIndicator size="small" color="#fff" />
                <Text style={styles.uploadingText}>Uploading...</Text>
              </View>
            )}
          </TouchableOpacity>
          
          <View style={styles.profilePictureActions}>
            <Text style={[styles.profilePictureHint, { color: colors.text }]}>
              {profile.profilePicture ? 'Tap to change' : 'Add a profile picture'}
            </Text>
            
            {profile.profilePicture && (
              <TouchableOpacity 
                onPress={removeProfilePicture}
                disabled={uploading}
                style={styles.removeButton}
              >
                <Text style={[styles.removeButtonText, { color: colors.notification }]}>
                  Remove
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      {/* Profile Information */}
      <View style={styles.inputGroup}>
        <TextInputField
          label="Name"
          placeholder="Your name"
          value={profile.name || ''}
          onChangeText={text => setProfile(prev => ({ ...prev, name: text }))}
          icon="person-outline"
        />
       {/* <TextInputField
          label="Email"
          placeholder="your.email@example.com"
          value={profile.email || ''}
          onChangeText={text => setProfile(prev => ({ ...prev, email: text }))}
          keyboardType="email-address"
          icon="mail-outline"
        />
        <TextInputField
          label="Phone"
          placeholder="+1 (555) 123-4567"
          value={profile.phone || ''}
          onChangeText={text => setProfile(prev => ({ ...prev, phone: text }))}
          keyboardType="phone-pad"
          icon="call-outline"
        />*/}
      </View>
    </View>
  );
};

// ... styles remain the same ...

const styles = StyleSheet.create({
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: { 
    fontSize: 18, 
    fontWeight: '600', 
    marginLeft: 8,
  },
  divider: { 
    height: 1, 
    marginBottom: 20,
    opacity: 0.6,
  },
  inputGroup: {
    gap: 16,
  },
  profilePictureSection: {
    marginBottom: 24,
  },
  profilePictureLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 12,
  },
  profilePictureContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  profilePictureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  profileImage: {
    width: '100%',
    height: '100%',
    borderRadius: 40,
  },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 40,
  },
  uploadingText: {
    color: '#fff',
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },
  profilePictureActions: {
    flex: 1,
    gap: 8,
  },
  profilePictureHint: {
    fontSize: 14,
    opacity: 0.7,
  },
  removeButton: {
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(255,59,48,0.1)',
  },
  removeButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
});

export default ProfileSection;