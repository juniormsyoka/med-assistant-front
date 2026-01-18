// components/settings/ProfileSection.tsx
import React, { useState, useEffect } from 'react';
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
import { supabase } from '../../Services/supabaseClient';
import TextInputField from '../chat/TextInputField';
import { UserProfile } from '../../models/User';
import * as FileSystem from 'expo-file-system/legacy';
//import * as FileSystem from 'expo-file-system';



interface ProfileSectionProps {
  profile: Partial<UserProfile>;
  setProfile: React.Dispatch<React.SetStateAction<Partial<UserProfile>>>;
}

interface AuthUserProfile {
  id: string;
  email: string;
  full_name: string;
  role: string;
  hospital_id: string | null;
  doctor_id: string | null;
  is_verified: boolean;
  created_at: string;
}

const ProfileSection: React.FC<ProfileSectionProps> = ({ profile, setProfile }) => {
  const { colors } = useTheme();
  const [uploading, setUploading] = useState(false);
  const [authProfile, setAuthProfile] = useState<AuthUserProfile | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  // Fetch auth profile on component mount
  useEffect(() => {
    fetchAuthProfile();
  }, []);

  const fetchAuthProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch user profile from public.users table
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      console.log('✅ [AUTH] User profile fetched:', data);
      setAuthProfile(data);

      // Auto-populate profile with auth data
      setProfile(prev => ({
        ...prev,
        name: data.full_name,
        email: data.email,
      }));

    } catch (error) {
      console.error('Error fetching auth profile:', error);
    } finally {
      setLoadingAuth(false);
    }
  };


const updateSupabaseProfile = async (updates: Partial<UserProfile>) => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('User not authenticated');
    }

    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (updates.name !== undefined) updateData.full_name = updates.name;
    if (updates.phone !== undefined) updateData.phone = updates.phone;
    if (updates.profilePicture !== undefined) updateData.avatar_url = updates.profilePicture;

    console.log('📝 Updating profile with:', updateData);

    const { error } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        ...updateData,
      });

    if (error) {
      console.error('❌ Profile update error:', error);
      throw error;
    }

    console.log('✅ Profile updated successfully');
  } catch (error) {
    console.error('❌ Error in updateSupabaseProfile:', error);
    throw error;
  }
};
  
const pickImage = async () => {
  try {
    console.log('📸 Starting image picker...');
    
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    console.log('📁 Library permission status:', status);
    
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required', 
        'Please enable photo library access in your device settings to choose photos.',
        [{ text: 'OK' }]
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      allowsMultipleSelection: false, // Ensure single selection
    });

    console.log('📁 Image picker result:', result);

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      console.log('🖼️ Selected image:', asset.uri);
      
      setUploading(true);
      
      try {
        const imageUrl = await uploadImageToSupabase(asset.uri);
        await updateSupabaseProfile({ profilePicture: imageUrl });
        
        setProfile(prev => ({ 
          ...prev, 
          profilePicture: imageUrl 
        }));
        
        Alert.alert('Success', 'Profile picture updated!');
      } catch (uploadError) {
        console.error('❌ Upload error:', uploadError);
        Alert.alert('Upload Error', 'Failed to upload profile picture. Please try again.');
      }
    } else {
      console.log('🚫 Image selection canceled');
    }
  } catch (error) {
    console.error('❌ Error in pickImage:', error);
    Alert.alert('Error', 'Failed to access photo library. Please check permissions and try again.');
  } finally {
    setUploading(false);
  }
};

const takePhoto = async () => {
  try {
    console.log('📷 Starting camera...');
    
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    console.log('📷 Camera permission status:', status);
    
    if (status !== 'granted') {
      Alert.alert(
        'Camera Permission Required', 
        'Please enable camera access in your device settings to take photos.',
        [{ text: 'OK' }]
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    console.log('📷 Camera result:', result);

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      console.log('📸 Captured image:', asset.uri);
      
      // Check if file exists before uploading
      const fileInfo = await FileSystem.getInfoAsync(asset.uri);
      if (!fileInfo.exists) {
        throw new Error('Captured image file not found');
      }
      
      setUploading(true);
      
      try {
        const imageUrl = await uploadImageToSupabase(asset.uri);
        await updateSupabaseProfile({ profilePicture: imageUrl });
        
        setProfile(prev => ({ 
          ...prev, 
          profilePicture: imageUrl 
        }));
        
        Alert.alert('Success', 'Profile picture updated!');
      } catch (uploadError) {
        console.error('❌ Upload error:', uploadError);
        Alert.alert('Upload Error', 'Failed to upload photo. Please try again.');
      }
    } else {
      console.log('🚫 Photo capture canceled');
    }
  } catch (error) {
    console.error('❌ Error in takePhoto:', error);
    Alert.alert('Camera Error', 'Failed to access camera. Please check permissions and try again.');
  } finally {
    setUploading(false);
  }
};


const uploadImageToSupabase = async (uri: string): Promise<string> => {
  try {
    console.log('📤 Starting image upload...', uri);

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    // Get file info
    const fileExt = uri.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    
    // Include user ID in file path for better RLS management
    const filePath = `profile-pictures/${user.id}/${fileName}`;

    // Check if file exists
    const file = await FileSystem.getInfoAsync(uri);
    
    if (!file.exists) {
      throw new Error('File does not exist');
    }

    // Read the file as a base64 string
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    if (!base64) {
      throw new Error('Unable to read image file.');
    }

    // Convert base64 to Uint8Array
    const fileBytes = Uint8Array.from(atob(base64), (char) =>
      char.charCodeAt(0)
    );

    console.log('📦 Uploading to Supabase storage...', filePath);

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('avatars')
      .upload(filePath, fileBytes, {
        contentType: `image/${fileExt}`,
        upsert: true,
      });

    if (error) {
      console.error("❌ Supabase upload error:", error);
      throw new Error(`Upload failed: ${error.message}`);
    }

    console.log('✅ Upload successful:', data);

    // Retrieve the public URL
    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    console.log('🔗 Public URL:', publicUrl);

    return publicUrl;

  } catch (err) {
    console.error("❌ Upload error:", err);
    throw new Error("Failed to upload image");
  }
};



const removeProfilePicture = async () => {
  try {
    setUploading(true);
    
    // If we have a current profile picture, try to delete it from storage
    if (profile.profilePicture) {
      try {
        // Extract filename from URL for deletion
        const urlParts = profile.profilePicture.split('/');
        const fileName = urlParts[urlParts.length - 1];
        
        // Get user ID for the file path
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const filePath = `profile-pictures/${user.id}/${fileName}`;
          
          const { error } = await supabase.storage
            .from('avatars')
            .remove([filePath]);
            
          if (error) {
            console.warn('⚠️ Could not delete from storage:', error);
          }
        }
      } catch (storageError) {
        console.warn('⚠️ Storage deletion failed:', storageError);
      }
    }
    
    await updateSupabaseProfile({ profilePicture: null });
    
    setProfile(prev => ({ 
      ...prev, 
      profilePicture: undefined 
    }));
    
    Alert.alert('Success', 'Profile picture removed');
  } catch (error) {
    console.error('❌ Error removing profile picture:', error);
    Alert.alert('Error', 'Failed to remove profile picture');
  } finally {
    setUploading(false);
  }
};

  const handleNameUpdate = async (name: string) => {
    try {
      setProfile(prev => ({ ...prev, name }));
      
      // Debounced auto-save for name
      setTimeout(async () => {
        await updateSupabaseProfile({ name });
      }, 1000);
    } catch (error) {
      console.error('Error updating name:', error);
    }
  };

  const handlePhoneUpdate = async (phone: string) => {
    try {
      setProfile(prev => ({ ...prev, phone }));
      
      // Debounced auto-save for phone
      setTimeout(async () => {
        await updateSupabaseProfile({ phone });
      }, 1000);
    } catch (error) {
      console.error('Error updating phone:', error);
    }
  };

  const createAlertButton = (
    text: string, 
    onPress: () => void, 
    style: 'default' | 'destructive' | 'cancel' = 'default'
  ) => ({ text, onPress, style });

  const showImagePickerOptions = () => {
  Alert.alert(
    'Profile Picture',
    'How would you like to set your profile picture?',
    [
      {
        text: 'Take Photo',
        onPress: takePhoto,
        // Remove style property - defaults to 'default'
      },
      {
        text: 'Choose from Library',
        onPress: pickImage,
        // Remove style property - defaults to 'default'
      },
      ...(profile.profilePicture ? [{
        text: 'Remove Current Photo',
        onPress: removeProfilePicture,
        style: 'destructive' as const,
      }] : []),
      {
        text: 'Cancel',
        style: 'cancel',
      },
    ],
    {
      cancelable: true,
      onDismiss: () => console.log('Image picker dismissed'),
    }
  );
};

  const ReadOnlyField = ({ label, value, icon }: { label: string; value: string; icon: string }) => (
    <View style={styles.readOnlyField}>
      <View style={styles.fieldHeader}>
        <Ionicons name={icon as any} size={16} color={colors.text} style={styles.fieldIcon} />
        <Text style={[styles.fieldLabel, { color: colors.text }]}>{label}</Text>
      </View>
      <View style={[styles.readOnlyValue, { backgroundColor: colors.card }]}>
        <Text style={[styles.readOnlyText, { color: colors.text }]}>{value || 'Not set'}</Text>
        <Ionicons name="lock-closed" size={14} color={colors.border} />
      </View>
    </View>
  );

  if (loadingAuth) {
    return (
      <View style={styles.section}>
        <ActivityIndicator size="small" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.text }]}>Loading profile...</Text>
      </View>
    );
  }

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
                  removeProfilePicture();
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

      {/* Read-only Auth Information */}
      <View style={styles.authInfoSection}>
        <Text style={[styles.sectionSubtitle, { color: colors.text }]}>
          Account Information
        </Text>
        
        <View style={styles.readOnlyFields}>
          <ReadOnlyField 
            label="Full Name" 
            value={authProfile?.full_name || ''} 
            icon="person-outline" 
          />
          
          <ReadOnlyField 
            label="Email" 
            value={authProfile?.email || ''} 
            icon="mail-outline" 
          />
          
          <ReadOnlyField 
            label="User ID" 
            value={authProfile?.id ? `${authProfile.id.slice(0, 8)}...` : ''} 
            icon="key-outline" 
          />
          
          <ReadOnlyField 
            label="Role" 
            value={authProfile?.role ? authProfile.role.charAt(0).toUpperCase() + authProfile.role.slice(1) : ''} 
            icon="shield-checkmark-outline" 
          />
          
          <ReadOnlyField 
            label="Member Since" 
            value={authProfile?.created_at ? new Date(authProfile.created_at).toLocaleDateString() : ''} 
            icon="calendar-outline" 
          />
          
          {authProfile?.hospital_id && (
            <ReadOnlyField 
              label="Hospital ID" 
              value={authProfile.hospital_id} 
              icon="business-outline" 
            />
          )}
        </View>
        
        <View style={styles.authNote}>
          <Ionicons name="information-circle-outline" size={16} color={colors.border} />
          <Text style={[styles.authNoteText, { color: colors.text }]}>
            Account information is managed by your administrator
          </Text>
        </View>
      </View>

      {/* Editable Profile Information */}
      <View style={styles.editableSection}>
        <Text style={[styles.sectionSubtitle, { color: colors.text }]}>
          Personal Preferences
        </Text>
        
        <View style={styles.inputGroup}>
          <TextInputField
            label="Display Name"
            placeholder="How you'd like to be called"
            value={profile.name || ''}
            onChangeText={handleNameUpdate}
            icon="at-outline"
          />
          
          <TextInputField
            label="Phone Number"
            placeholder="+1 (555) 123-4567"
            value={profile.phone || ''}
            onChangeText={handlePhoneUpdate}
            keyboardType="phone-pad"
            icon="call-outline"
          />
        </View>
      </View>
    </View>
  );
};

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
  sectionSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  divider: { 
    height: 1, 
    marginBottom: 20,
    opacity: 0.6,
  },
  loadingText: {
    marginTop: 8,
    textAlign: 'center',
    fontSize: 14,
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
  authInfoSection: {
    marginBottom: 24,
  },
  editableSection: {
    marginBottom: 16,
  },
  readOnlyFields: {
    gap: 12,
    marginBottom: 12,
  },
  readOnlyField: {
    gap: 6,
  },
  fieldHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  fieldIcon: {
    opacity: 0.7,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '500',
    opacity: 0.8,
  },
  readOnlyValue: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  readOnlyText: {
    fontSize: 16,
    opacity: 0.9,
  },
  authNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 8,
    borderRadius: 6,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  authNoteText: {
    fontSize: 12,
    opacity: 0.7,
    flex: 1,
  },
  inputGroup: {
    gap: 16,
  },
});

export default ProfileSection;