import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ChatMessage } from '../models/ChatMessage';

interface ChatBubbleProps {
  message: ChatMessage;
}

const ChatBubble: React.FC<ChatBubbleProps> = ({ message }) => {
  return (
    <View style={[
      styles.bubbleContainer,
      message.isUser ? styles.userBubbleContainer : styles.botBubbleContainer
    ]}>
      <View style={[
        styles.bubble,
        message.isUser ? styles.userBubble : styles.botBubble
      ]}>
        <Text style={message.isUser ? styles.userText : styles.botText}>
          {message.text}
        </Text>
        <Text style={[
          styles.timestamp,
          message.isUser ? styles.userTimestamp : styles.botTimestamp
        ]}>
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  bubbleContainer: {
    marginVertical: 4,
    maxWidth: '80%',
  },
  userBubbleContainer: {
    alignSelf: 'flex-end',
  },
  botBubbleContainer: {
    alignSelf: 'flex-start',
  },
  bubble: {
    padding: 12,
    borderRadius: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  userBubble: {
    backgroundColor: '#4361EE',
    borderBottomRightRadius: 4,
  },
  botBubble: {
    backgroundColor: '#F0F0F0',
    borderBottomLeftRadius: 4,
  },
  userText: {
    color: '#FFF',
    fontSize: 16,
  },
  botText: {
    color: '#333',
    fontSize: 16,
  },
  timestamp: {
    fontSize: 10,
    marginTop: 4,
    opacity: 0.7,
  },
  userTimestamp: {
    color: '#E6E6E6',
    textAlign: 'right',
  },
  botTimestamp: {
    color: '#666',
    textAlign: 'left',
  },
});

export default ChatBubble;