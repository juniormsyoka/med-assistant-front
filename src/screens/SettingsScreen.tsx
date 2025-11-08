// screens/SettingsScreen.tsx - Add these updates
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  Dimensions,
  Text,
} from 'react-native';
import { useTheme } from '@react-navigation/native';
import { useAppTheme } from '../contexts/ThemeContext';
import { Themes } from '../themes/theme';
import { settingsService } from '../Services/Settings';
import { UserPreferences, UserProfile } from '../models/User';
import ProfileSection from '../components/settings/Profile';
import NotificationsSection from '../components/settings/NotificationsSection';
import ThemeSelector from '../components/settings/ThemeSelector';
import SaveButton from '../components/settings/SaveButton';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const SettingsScreen = ({ navigation }: any) => {
  const [profile, setProfile] = useState<Partial<UserProfile>>({});
  const [preferences, setPreferences] = useState<Partial<UserPreferences>>({});
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const [syncStatus, setSyncStatus] = useState<{ isOnline: boolean; isAuthenticated: boolean }>({ 
    isOnline: false, 
    isAuthenticated: false 
  });

  const { setTheme } = useAppTheme();
  const { colors } = useTheme();

  const loadSettings = useCallback(async () => {
    try {
      console.log('Loading settings...');
      
      // Sync with Supabase first if available
      await settingsService.syncWithSupabase();
      
      const userProfile = await settingsService.initialize();
      
      console.log('Loaded profile:', {
        name: userProfile.name,
        hasProfilePicture: !!userProfile.profilePicture,
        profilePicture: userProfile.profilePicture
      });
      
      // Set the complete profile including profilePicture
      setProfile({
        name: userProfile.name,
        email: userProfile.email,
        phone: userProfile.phone,
        profilePicture: userProfile.profilePicture,
      });
      
      setPreferences(userProfile.preferences);

      // Get sync status
      const status = await settingsService.getSyncStatus();
      setSyncStatus(status);

      // Apply the saved theme
      if (userProfile.preferences?.theme) {
        const savedTheme = Themes.find(
          t => t.name === userProfile.preferences.theme
        );
        if (savedTheme) {
          setTheme(savedTheme);
        }
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      Alert.alert('Error', 'Failed to load settings');
    } finally {
      setInitialLoad(false);
    }
  }, [setTheme]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // Sync status component
  const SyncStatusIndicator = () => (
    <View style={[styles.syncStatus, { backgroundColor: colors.card }]}>
      <Ionicons 
        name={syncStatus.isOnline ? "cloud-done" : "cloud-offline"} 
        size={16} 
        color={syncStatus.isOnline ? "#4CAF50" : "#FF6B6B"} 
      />
      <Text style={[styles.syncText, { color: colors.text }]}>
        {syncStatus.isAuthenticated 
          ? (syncStatus.isOnline ? 'Synced with cloud' : 'Offline mode') 
          : 'Local storage only'
        }
      </Text>
    </View>
  );

  const updatePreference = (key: keyof UserPreferences, value: any) => {
    console.log(`Updating preference: ${key} = ${value}`);
    
    // Update the preferences state
    setPreferences(prev => ({ ...prev, [key]: value }));
    
    // Immediately apply theme changes when theme is selected
    if (key === 'theme') {
      const selectedTheme = Themes.find(t => t.name === value);
      if (selectedTheme) {
        console.log('Immediately applying theme:', selectedTheme.name);
        setTheme(selectedTheme);
        
        // Also save the theme preference immediately
        settingsService.updatePreferences({ theme: value }).catch(error => {
          console.error('Error saving theme preference:', error);
        });
      }
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await settingsService.updateProfile(profile);
      await settingsService.updatePreferences(preferences);

      // Update sync status after save
      const status = await settingsService.getSyncStatus();
      setSyncStatus(status);

      Alert.alert('Success', 'Settings saved successfully');
    } catch (error) {
      console.error('Error saving settings:', error);
      Alert.alert('Error', 'Failed to save settings');
    }
    setLoading(false);
  };

  if (initialLoad) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <Text style={{ color: colors.text }}>Loading...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SyncStatusIndicator />
      
      <ScrollView 
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <ProfileSection profile={profile} setProfile={setProfile} />
        <NotificationsSection preferences={preferences} updatePreference={updatePreference} />
        <ThemeSelector 
          preferences={preferences} 
          updatePreference={updatePreference} 
        />
        
        {/* Spacer for floating button */}
        <View style={styles.bottomSpacer} />
      </ScrollView>

      <SaveButton onPress={handleSave} loading={loading} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1,
    marginTop: 30,
    marginBottom: 70
  },
  content: { 
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 100,
  },
  syncStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    marginHorizontal: 20,
    marginTop: 10,
    borderRadius: 8,
    gap: 8,
  },
  syncText: {
    fontSize: 14,
    fontWeight: '500',
  },
  bottomSpacer: {
    height: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default SettingsScreen;