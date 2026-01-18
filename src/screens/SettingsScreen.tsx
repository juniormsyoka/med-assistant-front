// screens/SettingsScreen.tsx
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
import { supabase } from '../Services/supabaseClient';
import { UserPreferences, UserProfile } from '../models/User';
import ProfileSection from '../components/settings/Profile';
import NotificationsSection from '../components/settings/NotificationsSection';
import ThemeSelector from '../components/settings/ThemeSelector';
import SaveButton from '../components/settings/SaveButton';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator } from 'react-native-paper';

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

  // Fetch profile from Supabase
  const fetchProfileFromSupabase = async (): Promise<Partial<UserProfile>> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) throw error;

    return {
      name: data.full_name,
      email: user.email,
      phone: data.phone,
      profilePicture: data.avatar_url,
      preferences: data.preferences,
    };
  };

  // Update preferences in Supabase
  const updateSupabasePreferences = async (prefs: Partial<UserPreferences>) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('profiles')
      .update({ 
        preferences: prefs,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);

    if (error) throw error;
  };

  const loadSettings = useCallback(async () => {
    try {
      console.log('Loading settings from Supabase...');
      
      const userProfile = await fetchProfileFromSupabase();
      
      console.log('Loaded profile from Supabase:', {
        name: userProfile.name,
        hasProfilePicture: !!userProfile.profilePicture,
      });
      
      setProfile({
        name: userProfile.name,
        email: userProfile.email,
        phone: userProfile.phone,
        profilePicture: userProfile.profilePicture,
      });
      
      setPreferences(userProfile.preferences || {});

      // Update sync status
      const { data: { session } } = await supabase.auth.getSession();
      setSyncStatus({
        isOnline: true,
        isAuthenticated: !!session
      });

      if (userProfile.preferences && userProfile.preferences.theme) {
  const savedTheme = Themes.find(
    t => t.name === userProfile.preferences!.theme // Using ! since we checked above
  );
  if (savedTheme) {
    setTheme(savedTheme);
  }
}
    } catch (error) {
      console.error('Error loading settings from Supabase:', error);
      
      // Fallback to local storage if Supabase fails
      Alert.alert(
        'Connection Issue', 
        'Using local storage. Changes will sync when online.',
        [{ text: 'OK' }]
      );
      
      setSyncStatus({ isOnline: false, isAuthenticated: false });
    } finally {
      setInitialLoad(false);
    }
  }, [setTheme]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const updatePreference = async (key: keyof UserPreferences, value: any) => {
    console.log(`Updating preference: ${key} = ${value}`);
    
    const newPreferences = { ...preferences, [key]: value };
    setPreferences(newPreferences);
    
    // Immediately apply and save theme changes
    if (key === 'theme') {
      const selectedTheme = Themes.find(t => t.name === value);
      if (selectedTheme) {
        console.log('Immediately applying theme:', selectedTheme.name);
        setTheme(selectedTheme);
        
        // Save to Supabase immediately
        try {
          await updateSupabasePreferences({ theme: value });
        } catch (error) {
          console.error('Error saving theme preference to Supabase:', error);
        }
      }
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      // Update profile in Supabase
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('profiles')
          .upsert({
            id: user.id,
            full_name: profile.name,
            phone: profile.phone,
            avatar_url: profile.profilePicture,
            preferences: preferences,
            updated_at: new Date().toISOString(),
          });
      }

      // Update preferences
      await updateSupabasePreferences(preferences);

      Alert.alert('Success', 'Settings saved to cloud');
    } catch (error) {
      console.error('Error saving settings to Supabase:', error);
      Alert.alert('Error', 'Failed to save settings to cloud');
    }
    setLoading(false);
  };

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

  if (initialLoad) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={{ color: colors.text, marginTop: 10 }}>Loading settings...</Text>
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