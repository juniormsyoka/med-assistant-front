import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Text,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { useTheme, RouteProp } from '@react-navigation/native';
import ChatBubble from '../components/chat/ChatBubble';
import ChatInputBar from '../components/chat/ChatInputBar';
import { ChatMessage } from '../models/ChatMessage';
import { useMessagingStore } from '../stores/messagingStore';
import { ChatStackParamList } from '../types/navigation';
import { chatService } from '../Services/chatService';

type ChatRoomRouteProp = RouteProp<ChatStackParamList, 'ChatRoom'>;

interface ChatRoomProps {
  route: ChatRoomRouteProp;
}

const ChatRoom: React.FC<ChatRoomProps> = ({ route }) => {
  const { conversationId, userId, mode, userRole } = route.params;
  const { colors } = useTheme();
  const {
    messages,
    loading,
    loadMessages,
    sendMessage,
    subscribeToMessages,
    addMessage,
    setLoading,
    setError,
  } = useMessagingStore();

  const [isInitializing, setIsInitializing] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [subscriptionActive, setSubscriptionActive] = useState(false);

  const flatListRef = useRef<FlatList>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Initialize messages and setup real-time subscription
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const initChat = async () => {
      try {
        console.log('🎯 Setting up chat room with:', {
          conversationId,
          userId,
          mode,
          userRole
        });

        setLoading(true);
        
        if (mode === 'doctor') {
          // Load existing messages using chatService
          console.log('📥 Loading messages for conversation:', conversationId);
          const loadedMessages = await chatService.loadMessages(conversationId, userId);
          console.log('✅ Loaded messages:', loadedMessages.length);
          
          // Convert to ChatMessage format and add to store
          loadedMessages.forEach(msg => {
            const chatMsg: ChatMessage = {
              id: msg.id,
              text: msg.text,
              isUser: msg.isUser,
              timestamp: msg.timestamp,
              type: 'text'
            };
            addMessage(chatMsg);
          });
          
          // Setup real-time subscription for doctor-patient chat
          console.log('🔔 Setting up real-time subscription for conversation:', conversationId);
          
          unsubscribe = chatService.subscribeToConversation(
            conversationId,
            userId,
            (newMessage) => {
              console.log('💫 New message received in UI:', {
                id: newMessage.id,
                text: newMessage.text,
                isUser: newMessage.isUser,
                timestamp: newMessage.timestamp
              });
              
              // Check if message already exists to avoid duplicates
              const messageExists = messages.some(msg => msg.id === newMessage.id);
              if (messageExists) {
                console.log('⚠️ Message already exists, skipping:', newMessage.id);
                return;
              }
              
              console.log('✅ Adding new message to UI:', newMessage);
              
              // Convert to ChatMessage format and add to store
              const chatMsg: ChatMessage = {
                id: newMessage.id,
                text: newMessage.text,
                isUser: newMessage.isUser,
                timestamp: newMessage.timestamp,
                type: 'text'
              };
              
              addMessage(chatMsg);
            }
          );
          
          setSubscriptionActive(true);
          console.log('✅ Real-time subscription active');
          
        } else {
          // AI chat mode
          await loadAIMessages();
        }
      } catch (err) {
        console.error('❌ Chat initialization failed:', err);
        setError('Unable to load chat.');
      } finally {
        setIsInitializing(false);
        setLoading(false);
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }).start();
      }
    };

    initChat();

    // Cleanup function
    return () => {
      console.log('🧹 Cleaning up chat room subscriptions');
      if (unsubscribe) {
        unsubscribe();
        setSubscriptionActive(false);
      }
    };
  }, [conversationId, userId, mode, userRole]);

  // Debug subscription status
  useEffect(() => {
    console.log('📡 Subscription status:', {
      subscriptionActive,
      conversationId,
      userId,
      mode
    });
  }, [subscriptionActive]);

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || isSending) return;
    setIsSending(true);

    try {
      console.log('[ChatRoom] Sending message:', {
        conversationId,
        userId,
        text,
        mode
      });
      
      if (mode === 'doctor') {
        // Use chatService for doctor-patient messages
        await chatService.sendMessage(conversationId, userId, text);
        
        // The message will be added to UI via the real-time subscription
        // and local storage synchronization
      } else {
        // AI chat mode
        await sendAIMessage(text);
      }
    } catch (err) {
      console.error('❌ Send failed:', err);
      setError('Message failed to send.');
      
      // Fallback: add message locally if send fails
      const fallback: ChatMessage = {
        id: `fallback-${Date.now()}`,
        text,
        isUser: true,
        timestamp: new Date(),
        type: 'text'
      };
      addMessage(fallback);
    } finally {
      setIsSending(false);
    }
  };

  const loadAIMessages = async () => {
    // Load AI chat history from local storage
    try {
      const aiMessages = await chatService.loadMessages(conversationId, userId);
      console.log('🤖 Loaded AI messages:', aiMessages.length);
      
      // Convert to ChatMessage format and add to store
      aiMessages.forEach(msg => {
        const chatMsg: ChatMessage = {
          id: msg.id,
          text: msg.text,
          isUser: msg.isUser,
          timestamp: msg.timestamp,
          type: 'text'
        };
        addMessage(chatMsg);
      });
    } catch (error) {
      console.error('Failed to load AI messages:', error);
    }
  };

  const sendAIMessage = async (text: string) => {
    // Add user message immediately
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      text,
      isUser: true,
      timestamp: new Date(),
      type: 'text'
    };
    addMessage(userMsg);

    // Simulate AI response
    const aiResponse: ChatMessage = {
      id: `ai-${Date.now()}`,
      text: "I'm your AI assistant. How can I help with your health questions?",
      isUser: false,
      timestamp: new Date(),
      type: 'text'
    };
    
    setTimeout(() => {
      addMessage(aiResponse);
    }, 800);
  };

  const renderItem = useCallback(
    ({ item }: { item: ChatMessage }) => (
      <ChatBubble message={item} isFirst={false} />
    ),
    []
  );

  if (isInitializing) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.text }]}>
          {mode === 'doctor' ? 'Loading secure conversation...' : 'Loading AI chat...'}
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
        {/* HEADER */}
        <View style={[styles.header, { backgroundColor: colors.card }]}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {mode === 'doctor' ? 'Doctor Chat' : 'AI Assistant'}
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.text }]}>
            {mode === 'doctor' ? 'Encrypted • Realtime' : 'AI • Secure'}
            {subscriptionActive && ' • Connected'}
          </Text>
        </View>

        {/* MESSAGES */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.messagesContainer}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
          showsVerticalScrollIndicator={false}
        />

        {/* LOADING INDICATOR */}
        {(loading || isSending) && (
          <View style={styles.typingContainer}>
            <View style={[styles.typingBubble, { backgroundColor: colors.card }]}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={[styles.typingText, { color: colors.text }]}>
                {isSending ? 'Sending...' : 'Loading...'}
              </Text>
            </View>
          </View>
        )}

        {/* INPUT */}
        <ChatInputBar
          onSendMessage={handleSendMessage}
          disabled={isSending}
          placeholder={
            mode === 'doctor'
              ? 'Message your doctor...'
              : 'Ask about health or medications...'
          }
        />
      </Animated.View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 16, fontSize: 16 },
  header: { padding: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.1)' },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  headerSubtitle: { fontSize: 14, opacity: 0.7 },
  messagesContainer: { padding: 16, paddingBottom: 8 },
  typingContainer: { paddingHorizontal: 16, marginBottom: 8 },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 18,
    alignSelf: 'flex-start',
  },
  typingText: { marginLeft: 8, fontSize: 14, fontStyle: 'italic', opacity: 0.8 },
});

export default ChatRoom;