import React, { useState } from 'react';
import { View, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ChatInputBarProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
}

const ChatInputBar: React.FC<ChatInputBarProps> = ({ onSendMessage, disabled = false }) => {
  const [message, setMessage] = useState('');

  const handleSend = () => {
    if (message.trim().length > 0 && !disabled) {
      onSendMessage(message.trim());
      setMessage(''); // Clear input after send
    }
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.textInput}
        value={message}
        onChangeText={setMessage}
        placeholder="Type your message..."
        placeholderTextColor="#A0A0A0"
        multiline
        maxLength={500}
        editable={!disabled}
      />
      <TouchableOpacity
        style={[styles.sendButton, (message.length === 0 || disabled) && styles.sendButtonDisabled]}
        onPress={handleSend}
        disabled={message.length === 0 || disabled}
      >
        <Ionicons name="send" size={20} color="#FFF" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    paddingBottom: 16,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#EEE',
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 100,
    marginRight: 10,
    backgroundColor: '#F9F9F9',
  },
  sendButton: {
    backgroundColor: '#4361EE',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  sendButtonDisabled: {
    backgroundColor: '#9DB5FF',
  },
});

export default ChatInputBar;