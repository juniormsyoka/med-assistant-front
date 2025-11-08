import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { useTheme } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Themes } from '../../themes/theme';
import { UserPreferences } from '../../models/User';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const THEME_CARD_WIDTH = (SCREEN_WIDTH - 64) / 2; // Responsive width

interface ThemeSelectorProps {
  preferences: Partial<UserPreferences>;
  updatePreference: (key: keyof UserPreferences, value: any) => void;
}

const ThemeSelector: React.FC<ThemeSelectorProps> = ({ preferences, updatePreference }) => {
  const { colors } = useTheme();

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Ionicons name="color-palette-outline" size={22} color={colors.primary} />
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Appearance</Text>
      </View>
      
      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      <Text style={[styles.sectionDescription, { color: colors.text }]}>
        Choose your app theme
      </Text>

      <View style={styles.themeGrid}>
        {Themes.map(themeOption => {
          const isSelected = preferences.theme === themeOption.name;
          return (
            <TouchableOpacity
              key={themeOption.name}
              style={[
                styles.themeCard,
                {
                  borderColor: isSelected ? themeOption.colors.primary : colors.border,
                  backgroundColor: colors.card,
                },
              ]}
              onPress={() => updatePreference('theme', themeOption.name)}
              activeOpacity={0.8}
              accessibilityLabel={`Select ${themeOption.name} theme`}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
            >
              <LinearGradient
                colors={themeOption.gradient as [string, string, ...string[]]}
                style={styles.themePreview}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                {isSelected && (
                  <View style={styles.selectedIndicator}>
                    <Ionicons name="checkmark" size={20} color="#fff" />
                  </View>
                )}
                
                {/* Theme preview elements */}
                <View style={styles.themePreviewContent}>
                  <View style={[styles.previewHeader, { backgroundColor: 'rgba(255,255,255,0.2)' }]} />
                  <View style={[styles.previewContent, { backgroundColor: 'rgba(255,255,255,0.1)' }]} />
                </View>
              </LinearGradient>
              
              <Text
                style={[
                  styles.themeLabel,
                  {
                    color: isSelected ? themeOption.colors.primary : colors.text,
                    fontWeight: isSelected ? '600' : '400',
                  },
                ]}
                numberOfLines={1}
              >
                {themeOption.name}
              </Text>
            </TouchableOpacity>
          );
        })}
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
  divider: { 
    height: 1, 
    marginBottom: 16,
    opacity: 0.6,
  },
  sectionDescription: {
    fontSize: 14,
    opacity: 0.7,
    marginBottom: 16,
    lineHeight: 20,
  },
  themeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
  },
  themeCard: {
    width: THEME_CARD_WIDTH,
    borderRadius: 16,
    padding: 12,
    borderWidth: 2,
    alignItems: 'center',
  },
  themePreview: {
    width: '100%',
    height: 100,
    borderRadius: 12,
    marginBottom: 12,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  themePreviewContent: {
    width: '80%',
    height: '60%',
    borderRadius: 8,
    padding: 8,
    gap: 6,
  },
  previewHeader: {
    height: 12,
    borderRadius: 6,
    width: '60%',
  },
  previewContent: {
    flex: 1,
    borderRadius: 4,
  },
  selectedIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.3)',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  themeLabel: {
    fontSize: 14,
    textAlign: 'center',
  },
});

export default ThemeSelector;