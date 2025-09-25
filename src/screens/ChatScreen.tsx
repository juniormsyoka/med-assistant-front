import React, { useState, useRef } from 'react';
import { View, FlatList, StyleSheet, KeyboardAvoidingView, Platform, Text } from 'react-native';
import { useTheme } from '@react-navigation/native';
import AppHeader from '../components/AppHeader';
import ChatBubble from '../components/ChatBubble';
import ChatInputBar from '../components/ChatInputBar';
import { sendChatMessageStreamXHR } from '../Services/api';
import { ChatMessage } from '../models/ChatMessage';

const ChatScreen = ({ navigation }: any) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      text: "Hello! I'm your medication assistant. How can I help you today?",
      isUser: false,
      timestamp: new Date(),
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const { colors } = useTheme();

  const handleSendMessage = async (text: string) => {
    // Add user message
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      text,
      isUser: true,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    // Placeholder bot message
    const botMessageId = `bot-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      { id: botMessageId, text: "", isUser: false, timestamp: new Date() },
    ]);

    let botText = "";
    let buffer = "";

    sendChatMessageStreamXHR(
      text,
      (chunk) => {
        buffer += chunk;

        // Only flush when we have a sentence-like chunk or enough text
        if (buffer.includes(" ") || buffer.length > 10) {
          botText += buffer;
          buffer = "";

          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === botMessageId ? { ...msg, text: botText } : msg
            )
          );
        }
      },
      () => {
        // Flush any remaining buffer at the end
        if (buffer) {
          botText += buffer;
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === botMessageId ? { ...msg, text: botText } : msg
            )
          );
        }
        setIsLoading(false);
      },
      (error) => {
        console.error("Chat error:", error);
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === botMessageId
              ? {
                  ...msg,
                  text:
                    "Sorry, AI is unavailable right now. Please try again.",
                }
              : msg
          )
        );
        setIsLoading(false);
      }
    );
  };

 return (
  <KeyboardAvoidingView
    style={{ flex: 1 }}
    behavior={Platform.OS === "ios" ? "padding" : "height"}
    keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
  >
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <AppHeader title="Medication Assistant" />

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ChatBubble message={item} />}
        contentContainerStyle={styles.messagesContainer}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
        onLayout={() => flatListRef.current?.scrollToEnd()}
      />

      {isLoading && (
        <Text style={[styles.typingIndicator, { color: colors.text }]}>
          AI is typing…
        </Text>
      )}

      <ChatInputBar onSendMessage={handleSendMessage} disabled={isLoading} />
    </View>
  </KeyboardAvoidingView>
);

};

const styles = StyleSheet.create({
  container: { flex: 1 },
  messagesContainer: { padding: 16, paddingBottom: 8 },
  typingIndicator: {
    textAlign: "center",
    marginVertical: 8,
    fontStyle: "italic",
    opacity: 0.8,
  },
});

export default ChatScreen;
