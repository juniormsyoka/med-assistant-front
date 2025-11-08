import React from 'react';
import { View, Text, Switch, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { UserPreferences } from '../../models/User';

interface NotificationsSectionProps {
  preferences: Partial<UserPreferences>;
  updatePreference: (key: keyof UserPreferences, value: any) => void;
}

const NotificationsSection: React.FC<NotificationsSectionProps> = ({
  preferences,
  updatePreference,
}) => {
  const { colors } = useTheme();

  const PreferenceRow = ({
    icon,
    label,
    description,
    value,
    preferenceKey,
  }: {
    icon: string;
    label: string;
    description: string;
    value: boolean | undefined;
    preferenceKey: keyof UserPreferences;
  }) => (
    <TouchableOpacity
      style={[styles.preferenceRow, { borderBottomColor: colors.border }]}
      onPress={() => updatePreference(preferenceKey, !value)}
      activeOpacity={0.7}
    >
      <View style={styles.preferenceLeft}>
        <Ionicons 
          name={icon as any} 
          size={22} 
          color={colors.text} 
          style={styles.preferenceIcon} 
        />
        <View style={styles.preferenceText}>
          <Text style={[styles.preferenceLabel, { color: colors.text }]}>
            {label}
          </Text>
          <Text style={[styles.preferenceDescription, { color: colors.text }]}>
            {description}
          </Text>
        </View>
      </View>
      <Switch
        value={value ?? true}
        onValueChange={val => updatePreference(preferenceKey, val)}
        trackColor={{ 
          false: colors.border, 
          true: colors.primary + '40' 
        }}
        thumbColor={value ? colors.primary : '#f4f3f4'}
        accessibilityLabel={label}
      />
    </TouchableOpacity>
  );

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Ionicons name="notifications-outline" size={22} color={colors.primary} />
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Notifications</Text>
      </View>
      
      <View style={[styles.divider, { backgroundColor: colors.border }]} />

     {/*} <PreferenceRow
        icon="vibrate-outline"
        label="Vibration"
        description="Enable vibration with notifications"
        value={preferences.vibrationEnabled}
        preferenceKey="vibrationEnabled"
      /> */}
      
      <PreferenceRow
        icon="calendar-outline"
        label="Daily Summary"
        description="Receive daily medication summary"
        value={preferences.enableDailySummary}
        preferenceKey="enableDailySummary"
      />
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
  divider: { 
    height: 1, 
    marginBottom: 8,
    opacity: 0.6,
  },
  preferenceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  preferenceLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  preferenceIcon: {
    marginRight: 12,
  },
  preferenceText: {
    flex: 1,
  },
  preferenceLabel: { 
    fontSize: 16, 
    fontWeight: '500', 
    marginBottom: 4,
  },
  preferenceDescription: { 
    fontSize: 14, 
    opacity: 0.7,
    lineHeight: 18,
  },
});

export default NotificationsSection;