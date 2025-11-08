import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons'; // Assuming you're using Expo icons

interface AppHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  onBackPress?: () => void;
  rightAction?: {
    icon: keyof typeof Ionicons.glyphMap;
    onPress: () => void;
  };
  style?: ViewStyle;
}

const AppHeader: React.FC<AppHeaderProps> = ({
  title,
  showBack = false,
  onBackPress,
  rightAction,
  style,
}) => {
  return (
    <View style={[styles.header, style]}>
      {/* Left Section (Back Button) */}
      <View style={styles.section}>
        {showBack && onBackPress && (
          <TouchableOpacity onPress={onBackPress} style={styles.button}>
            <Ionicons name="arrow-back" size={24} color="#4361EE" />
          </TouchableOpacity>
        )}
      </View>

      {/* Center Section (Title) */}
      <View style={styles.titleContainer}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
      </View>

      {/* Right Section (Action) */}
      <View style={styles.section}>
        {rightAction && (
          <TouchableOpacity onPress={rightAction.onPress} style={styles.button}>
            <Ionicons name={rightAction.icon} size={24} color="#4361EE" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  section: {
    flex: 1,
    flexDirection: 'row',
  },
  titleContainer: {
    flex: 3,
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  button: {
    padding: 4,
  },
});

export default AppHeader;