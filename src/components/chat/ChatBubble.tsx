import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@react-navigation/native';
import { ChatMessage } from '../../models/ChatMessage';

interface ChatBubbleProps {
  message: ChatMessage;
  isFirst: boolean;
  isStreaming?: boolean;
  streamingText?: string;
}

const ChatBubble: React.FC<ChatBubbleProps> = ({ 
  message, 
  isFirst, 
  isStreaming = false, 
  streamingText 
}) => {
  const { colors } = useTheme();
  
  const displayText = isStreaming && streamingText ? streamingText : message.text;

  return (
    <View style={[
      styles.container,
      message.isUser ? styles.userContainer : styles.aiContainer
    ]}>
      <View style={[
        styles.bubble,
        message.isUser 
          ? [styles.userBubble, { backgroundColor: colors.primary }]
          : [styles.aiBubble, { backgroundColor: colors.card, borderColor: colors.border }]
      ]}>
        <Text style={[
          styles.text,
          message.isUser ? styles.userText : { color: colors.text }
        ]}>
          {displayText}
          {isStreaming && <Text style={styles.streamingCursor}>▊</Text>}
        </Text>
      </View>
      
      {/* Timestamp */}
      <Text style={[styles.timestamp, { color: colors.text + '80' }]}>
        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
    paddingHorizontal: 16,
  },
  userContainer: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  aiContainer: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
  },
  bubble: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    maxWidth: '80%',
  },
  userBubble: {
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    borderBottomLeftRadius: 4,
    borderWidth: 1,
  },
  text: {
    fontSize: 16,
    lineHeight: 20,
  },
  userText: {
    color: '#FFFFFF',
  },
  timestamp: {
    fontSize: 11,
    marginTop: 4,
    marginHorizontal: 4,
  },
  streamingCursor: {
    color: '#666',
    fontWeight: 'bold',
  },
});

export default ChatBubble;