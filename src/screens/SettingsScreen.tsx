import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  Switch,
  StyleSheet,
  Text,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useTheme } from '@react-navigation/native';
import AppHeader from '../components/AppHeader';
import PrimaryButton from '../components/PrimaryButton';
import TextInputField from '../components/TextInputField';
import { settingsService } from '../Services/Settings';
import { UserPreferences, UserProfile } from '../models/User';
import { useAppTheme } from '../../App';

const SettingsScreen = ({ navigation }: any) => {
  const [profile, setProfile] = useState<Partial<UserProfile>>({});
  const [preferences, setPreferences] = useState<Partial<UserPreferences>>({});
  const [loading, setLoading] = useState(false);

  const { theme, setTheme } = useAppTheme();
  const { colors } = useTheme(); // ✅ Navigation theme hook

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const userProfile = await settingsService.initialize();
      setProfile({
        name: userProfile.name,
        email: userProfile.email,
        phone: userProfile.phone,
      });
      setPreferences(userProfile.preferences);
    } catch (error) {
      console.error('Error loading settings:', error);
      Alert.alert('Error', 'Failed to load settings');
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await settingsService.updateProfile(profile);
      await settingsService.updatePreferences(preferences);

      if (preferences.theme) {
        setTheme(preferences.theme as any); // apply immediately
      }

      Alert.alert('Success', 'Settings saved successfully');
    } catch (error) {
      console.error('Error saving settings:', error);
      Alert.alert('Error', 'Failed to save settings');
    }
    setLoading(false);
  };

  const updatePreference = (key: keyof UserPreferences, value: any) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <AppHeader
        title="Settings"
        showBack
        onBackPress={() => navigation.goBack()}
      />

      <ScrollView style={styles.content}>
        {/* Profile Section */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Profile
          </Text>
          <TextInputField
            label="Name"
            placeholder="Your name"
            value={profile.name || ''}
            onChangeText={text =>
              setProfile(prev => ({ ...prev, name: text }))
            }
          />
          <TextInputField
            label="Email"
            placeholder="your.email@example.com"
            value={profile.email || ''}
            onChangeText={text =>
              setProfile(prev => ({ ...prev, email: text }))
            }
            keyboardType="email-address"
          />
          <TextInputField
            label="Phone"
            placeholder="+1 (555) 123-4567"
            value={profile.phone || ''}
            onChangeText={text =>
              setProfile(prev => ({ ...prev, phone: text }))
            }
            keyboardType="phone-pad"
          />
        </View>

        {/* Notification Preferences */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Notifications
          </Text>

          <View
            style={[
              styles.preferenceRow,
              { borderBottomColor: colors.border },
            ]}
          >
            <View style={styles.preferenceInfo}>
              <Text style={[styles.preferenceLabel, { color: colors.text }]}>
                Vibration
              </Text>
              <Text
                style={[
                  styles.preferenceDescription,
                  { color: colors.text },
                ]}
              >
                Enable vibration with notifications
              </Text>
            </View>
            <Switch
              value={preferences.vibrationEnabled ?? true}
              onValueChange={value =>
                updatePreference('vibrationEnabled', value)
              }
              trackColor={{
                false: colors.border,
                true: colors.primary,
              }}
              thumbColor={
                preferences.vibrationEnabled ? colors.primary : colors.border
              }
            />
          </View>

          <View
            style={[
              styles.preferenceRow,
              { borderBottomColor: colors.border },
            ]}
          >
            <View style={styles.preferenceInfo}>
              <Text style={[styles.preferenceLabel, { color: colors.text }]}>
                Daily Summary
              </Text>
              <Text
                style={[
                  styles.preferenceDescription,
                  { color: colors.text },
                ]}
              >
                Receive daily medication summary
              </Text>
            </View>
            <Switch
              value={preferences.enableDailySummary ?? true}
              onValueChange={value =>
                updatePreference('enableDailySummary', value)
              }
              trackColor={{
                false: colors.border,
                true: colors.primary,
              }}
              thumbColor={
                preferences.enableDailySummary
                  ? colors.primary
                  : colors.border
              }
            />
          </View>
        </View>

        {/* Theme Preference */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Appearance
          </Text>

          <View style={styles.preferenceRow}>
            <View style={styles.preferenceInfo}>
              <Text style={[styles.preferenceLabel, { color: colors.text }]}>
                Theme
              </Text>
              <Text
                style={[
                  styles.preferenceDescription,
                  { color: colors.text },
                ]}
              >
                Choose your app appearance
              </Text>
            </View>
            <View style={styles.themeOptions}>
              {['light', 'dark', 'system'].map(option => {
                const isSelected = preferences.theme === option;
                return (
                  <TouchableOpacity
                    key={option}
                    style={[
                      styles.themeOption,
                      {
                        backgroundColor: isSelected
                          ? colors.primary
                          : colors.background,
                        borderColor: isSelected
                          ? colors.primary
                          : colors.border,
                      },
                    ]}
                    onPress={() => {
                      updatePreference('theme', option);
                      setTheme(option as any); // apply immediately
                    }}
                  >
                    <Text
                      style={[
                        styles.themeOptionText,
                        {
                          color: isSelected ? '#FFF' : colors.text,
                          fontWeight: isSelected ? '600' : '400',
                        },
                      ]}
                    >
                      {option.charAt(0).toUpperCase() + option.slice(1)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>

        {/* Save Button */}
        <PrimaryButton
          title="Save Settings"
          onPress={handleSave}
          loading={loading}
          style={styles.saveButton}
        />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, padding: 16 },
  section: {
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    elevation: 1,
  },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  preferenceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  preferenceInfo: { flex: 1, marginRight: 16 },
  preferenceLabel: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  preferenceDescription: { fontSize: 12 },
  saveButton: { marginBottom: 40 },
  themeOptions: { flexDirection: 'row', gap: 8 },
  themeOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  themeOptionText: { fontSize: 12 },
});

export default SettingsScreen;
