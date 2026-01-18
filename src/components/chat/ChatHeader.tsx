// components/chat/ChatHeader.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@react-navigation/native';

interface ChatHeaderProps {
  mode: 'ai' | 'doctor';
  isOnline: boolean;
  subscriptionActive?: boolean;
  title?: string;
  subtitle?: string;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({
  mode,
  isOnline,
  subscriptionActive = false,
  title,
  subtitle
}) => {
  const { colors } = useTheme();

  const getTitle = () => {
    if (title) return title;
    return mode === 'doctor' ? 'Doctor Chat' : 'AI Assistant';
  };

  const getSubtitle = () => {
    if (subtitle) return subtitle;
    
    let baseSubtitle = mode === 'doctor' 
      ? 'Encrypted • Realtime' 
      : 'AI • Mood Analysis';
    
    if (mode === 'doctor' && subscriptionActive) {
      baseSubtitle += ' • Connected';
    }
    
    baseSubtitle += ` • ${isOnline ? 'Online' : 'Offline'}`;
    
    return baseSubtitle;
  };

  return (
    <View style={[styles.header, { backgroundColor: colors.card }]}>
      <View style={styles.headerTopRow}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {getTitle()}
        </Text>
        <View style={[
          styles.networkIndicator, 
          { backgroundColor: isOnline ? '#4CAF50' : '#F44336' }
        ]}>
          <Text style={styles.networkText}>
            {isOnline ? 'Online' : 'Offline'}
          </Text>
        </View>
      </View>
      <Text style={[styles.headerSubtitle, { color: colors.text, opacity: 0.7 }]}>
        {getSubtitle()}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    paddingTop: 50,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 14,
  },
  networkIndicator: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  networkText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
});

export default ChatHeader;