import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ChatMessage } from '../../models/ChatMessage';
import { ScanningBubble } from './ScanningBubble';

interface ChatBubbleProps {
  message: ChatMessage;
  isFirst?: boolean;
}

const ChatBubble: React.FC<ChatBubbleProps> = ({ message, isFirst = false }) => {
  // Early return for scanning state
  if (message.text === "__scanning__") {
    return <ScanningBubble />;
  }

  const isSystemMessage = message.text.includes('📷') || message.text.includes('❌') || message.text.includes('⚠️');

  return (
    <View style={[
      styles.bubbleContainer,
      message.isUser ? styles.userBubbleContainer : styles.botBubbleContainer,
      isFirst && styles.firstBubble
    ]}>
      
      {/* Bot Avatar */}
      {!message.isUser && !isSystemMessage && (
        <View style={styles.avatar}>
          <Ionicons name="medical" size={16} color="#FFF" />
        </View>
      )}

      {/* System Message Icon */}
      {isSystemMessage && (
        <View style={[styles.avatar, styles.systemAvatar]}>
          <Ionicons 
            name={getSystemIcon(message.text)} 
            size={16} 
            color="#FFF" 
          />
        </View>
      )}

      <View style={[
        styles.bubble,
        message.isUser ? styles.userBubble : styles.botBubble,
        isSystemMessage && styles.systemBubble
      ]}>
        <Text style={[
          message.isUser ? styles.userText : styles.botText,
          isSystemMessage && styles.systemText
        ]}>
          {message.text}
        </Text>
        
        <View style={styles.timestampContainer}>
          {!message.isUser && !isSystemMessage && (
            <Ionicons name="checkmark-done" size={12} color="#4361EE" style={styles.readIcon} />
          )}
          <Text style={[
            styles.timestamp,
            message.isUser ? styles.userTimestamp : styles.botTimestamp
          ]}>
            {formatTimestamp(message.timestamp)}
          </Text>
        </View>
      </View>

      {/* User Avatar */}
      {message.isUser && (
        <View style={[styles.avatar, styles.userAvatar]}>
          <Ionicons name="person" size={16} color="#FFF" />
        </View>
      )}
    </View>
  );
};

// Helper functions outside component to prevent recreation
const getSystemIcon = (text: string): keyof typeof Ionicons.glyphMap => {
  if (text.includes('📷')) return "camera";
  if (text.includes('❌')) return "warning";
  return "alert";
};

const formatTimestamp = (timestamp: Date): string => {
  return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

// Memoize with custom comparison function
const areEqual = (prevProps: ChatBubbleProps, nextProps: ChatBubbleProps): boolean => {
  return (
    prevProps.message.id === nextProps.message.id &&
    prevProps.message.text === nextProps.message.text &&
    prevProps.message.isUser === nextProps.message.isUser &&
    prevProps.isFirst === nextProps.isFirst
    // Note: We're not comparing timestamp changes as they don't affect visual appearance
  );
};

const styles = StyleSheet.create({
  bubbleContainer: {
    marginVertical: 6,
    maxWidth: '85%',
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  userBubbleContainer: {
    alignSelf: 'flex-end',
  },
  botBubbleContainer: {
    alignSelf: 'flex-start',
  },
  firstBubble: {
    marginTop: 8,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#4361EE',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 8,
  },
  userAvatar: {
    backgroundColor: '#6C757D',
  },
  systemAvatar: {
    backgroundColor: '#FF9800',
  },
  bubble: {
    padding: 16,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    maxWidth: '100%',
  },
  userBubble: {
    backgroundColor: '#4361EE',
    borderBottomRightRadius: 6,
    marginLeft: 8,
  },
  botBubble: {
    backgroundColor: '#FFF',
    borderBottomLeftRadius: 6,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    marginRight: 8,
  },
  systemBubble: {
    backgroundColor: '#FFF8E1',
    borderColor: '#FFECB3',
  },
  userText: {
    color: '#FFF',
    fontSize: 16,
    lineHeight: 22,
  },
  botText: {
    color: '#1A1A1A',
    fontSize: 16,
    lineHeight: 22,
  },
  systemText: {
    color: '#5D4037',
  },
  timestampContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  readIcon: {
    marginRight: 4,
  },
  timestamp: {
    fontSize: 11,
    opacity: 0.7,
  },
  userTimestamp: {
    color: '#E6E6E6',
  },
  botTimestamp: {
    color: '#666',
  },
});

// Export memoized component
export default memo(ChatBubble, areEqual);