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
  Alert,
} from 'react-native';
import { useTheme, RouteProp } from '@react-navigation/native';
import ChatBubble from '../components/chat/ChatBubble';
import ChatInputBar from '../components/chat/ChatInputBar';
import { ChatMessage } from '../models/ChatMessage';
import { useMessagingStore } from '../stores/messagingStore';
import { ChatStackParamList } from '../types/navigation';
import { chatService } from '../Services/chatService';
import * as ImagePicker from 'expo-image-picker';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { toast } from '@/Services/toastService';

type ChatRoomNavigationProp = NativeStackNavigationProp<ChatStackParamList, 'ChatRoom'>;
type ChatRoomRouteProp = RouteProp<ChatStackParamList, 'ChatRoom'>;

interface ChatRoomProps {
  route?: ChatRoomRouteProp;
  navigation?: ChatRoomNavigationProp;
}

const ChatRoom: React.FC<ChatRoomProps> = ({ route }) => {
  if (!route?.params) {
    return (
      <View style={styles.container}>
        <Text>Error: Missing route parameters</Text>
      </View>
    );
  }

  const { conversationId, userId, mode, userRole } = route.params;
  const { colors } = useTheme();
  const {
    messages: allMessages,
    getMessagesForConversation,
    loading,
    addMessage,
    setLoading,
    setError,
    updateMessage,
    clearMessages,
  } = useMessagingStore();

  // ✅ FILTER messages by current conversation
  const currentConversationMessages = getMessagesForConversation(conversationId);

  // 🔥 FIX: Add local state as fallback for message display
  const [localMessages, setLocalMessages] = useState<ChatMessage[]>([]);
  
  // Combine store messages with local messages for display
  const displayMessages = currentConversationMessages.length > 0 ? currentConversationMessages : localMessages;

  const [isInitializing, setIsInitializing] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [processingVoice, setProcessingVoice] = useState(false);
  const [subscriptionActive, setSubscriptionActive] = useState(false);

  const flatListRef = useRef<FlatList>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // 🔍 DEBUG: Log messages for troubleshooting
  useEffect(() => {
    console.log("🔍 DEBUG - All messages in store:", allMessages.length);
    console.log("🔍 DEBUG - Current conversation messages:", currentConversationMessages.length);
    console.log("🔍 DEBUG - Local messages:", localMessages.length);
    console.log("🔍 DEBUG - Display messages:", displayMessages.length);
  }, [allMessages, currentConversationMessages, localMessages, displayMessages]);

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
        
        // ✅ CLEAR previous messages when switching conversations
        clearMessages();
        setLocalMessages([]); // Also clear local messages
        
        if (mode === 'doctor') {
          // Load existing messages using chatService for DOCTOR chats
          console.log('📥 Loading DOCTOR messages for conversation:', conversationId);
          const loadedMessages = await chatService.loadMessages(conversationId, userId);
          console.log('✅ Loaded DOCTOR messages:', loadedMessages.length);
          
          // Convert to ChatMessage format and add to store
          loadedMessages.forEach(msg => {
            const chatMsg: ChatMessage = {
              id: msg.id,
              text: msg.text,
              isUser: msg.isUser,
              timestamp: msg.timestamp,
              type: 'text',
              conversationId: conversationId,
            };
            console.log("➕ Adding doctor message to store:", chatMsg.text);
            addMessage(chatMsg);
          });
          
          // Setup real-time subscription for doctor-patient chat
          console.log('🔔 Setting up real-time subscription for conversation:', conversationId);
          
          unsubscribe = chatService.subscribeToConversation(
            conversationId,
            userId,
            (newMessage) => {
              console.log('💫 New DOCTOR message received in UI:', newMessage.text);
              
              // Check if message already exists to avoid duplicates
              const messageExists = currentConversationMessages.some(msg => msg.id === newMessage.id);
              if (messageExists) {
                console.log('⚠️ Message already exists, skipping:', newMessage.id);
                return;
              }
              
              const chatMsg: ChatMessage = {
                id: newMessage.id,
                text: newMessage.text,
                isUser: newMessage.isUser,
                timestamp: newMessage.timestamp,
                type: 'text',
                conversationId: conversationId,
              };
              
              addMessage(chatMsg);
            }
          );
          
          setSubscriptionActive(true);
          console.log('✅ Real-time subscription active for DOCTOR chat');
          
        } else {
          // AI chat mode - load AI messages
          console.log('🤖 Loading AI messages for conversation:', conversationId);
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

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (flatListRef.current && displayMessages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [displayMessages]);

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || isSending) return;
    
    // Check if this is a voice message placeholder or processing message
    if (text.includes('[Voice message recorded]') || 
        text.includes('transcription service upgrading') ||
        text.includes('Voice message recorded!')) {
      console.log('🔇 Skipping voice message placeholder');
      return;
    }
    
    setIsSending(true);

    try {
      console.log('[ChatRoom] Sending message:', text);
      
      // 🔥 FIX: Add user message immediately to both store and local state
      const userMsg: ChatMessage = {
        id: `user-${Date.now()}-${Math.random()}`,
        text: text.trim(),
        isUser: true,
        timestamp: new Date(),
        type: 'text',
        conversationId: conversationId,
      };
      
      console.log("➕ Adding user message:", userMsg.text);
      addMessage(userMsg);
      setLocalMessages(prev => [...prev, userMsg]);
      
      if (mode === 'doctor') {
        await chatService.sendMessage(conversationId, userId, text);
      } else {
        await sendAIMessage(text);
      }
    } catch (err) {
      console.error('❌ Send failed:', err);
      setError('Message failed to send.');
      
      const fallback: ChatMessage = {
        id: `fallback-${Date.now()}`,
        text,
        isUser: true,
        timestamp: new Date(),
        type: 'text',
        conversationId: conversationId,
      };
      addMessage(fallback);
      setLocalMessages(prev => [...prev, fallback]);
    } finally {
      setIsSending(false);
    }
  };

  const loadAIMessages = async () => {
    try {
      toast.info('loading messages')
      console.log('🤖 Loading AI-specific messages for:', conversationId);
      const aiMessages = await chatService.loadMessages(conversationId, userId);
      console.log('🤖 Loaded AI messages:', aiMessages.length);
      
      aiMessages.forEach(msg => {
        const chatMsg: ChatMessage = {
          id: msg.id,
          text: msg.text,
          isUser: msg.isUser,
          timestamp: msg.timestamp,
          type: 'text',
          conversationId: conversationId,
        };
        addMessage(chatMsg);
        setLocalMessages(prev => [...prev, chatMsg]);
      });
    } catch (error) {
      toast.error('Failed to load messges with AI')
      console.error('Failed to load AI messages:', error);
    }
  };

  const sendAIMessage = async (text: string) => {
    try {
      const { GroqAdapter } = require('../Services/GroqAdapter');
      
      let aiMessageCreated = false;
      let aiMessageId: string | null = null;
      
    //  console.log("🤖 Sending to AI adapter...");
      
      await GroqAdapter.send({
        conversationId,
        userId,
        text: text.trim(),
        onResponse: (aiMsg: ChatMessage) => {
          console.log("🤖 AI response received:", aiMsg.text);
          
          if (!aiMessageId) {
            aiMessageId = aiMsg.id;
          }

          if (!aiMessageCreated) {
            const newAiMsg: ChatMessage = {
              ...aiMsg,
              id: aiMessageId!,
              conversationId: conversationId,
              type: 'text',
            };
            
         //   console.log("➕ Adding AI response:", newAiMsg.text);
            addMessage(newAiMsg);
            setLocalMessages(prev => [...prev, newAiMsg]);
            aiMessageCreated = true;
          } else {
         //   console.log("✏️ Updating AI message:", aiMsg.text);
            updateMessage(aiMessageId!, { text: aiMsg.text });
            // Also update local messages
            setLocalMessages(prev => 
              prev.map(msg => 
                msg.id === aiMessageId ? { ...msg, text: aiMsg.text } : msg
              )
            );
          }
        },
      });

    } catch (error) {
    //  console.log('AI response failed:', error);
      toast.error('AI response failed:');
      
      const fallbackMsg: ChatMessage = {
        id: `fallback-ai-${Date.now()}`,
        text: "⚠️ AI service is currently unavailable. Please try again later.",
        isUser: false,
        timestamp: new Date(),
        type: 'text',
        conversationId: conversationId,
      };
      console.log("➕ Adding fallback message:", fallbackMsg.text);
      addMessage(fallbackMsg);
      setLocalMessages(prev => [...prev, fallbackMsg]);
    }
  };

  const handleScanPress = async () => {
  if (mode !== "ai") {
    console.log("Doctor mode camera action");
    return;
  }

 // console.log("📸 Starting scan process...");

  try {
    // Request camera permission
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      toast.info("Permission!! Camera permission is needed to scan prescriptions.");
      return;
    }

  //  console.log("✅ Camera permission granted");

    // Capture image
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: false,
      base64: true, // include base64 for debugging/fallbacks
      exif: false,
    });

    if (result.canceled) {
      console.log("❌ Camera canceled by user");
      toast.error("you cancelled scan")
      return;
    }

    const asset = result.assets[0];
    console.log("✅ Image captured:", asset.uri);

    // ✅ Always force JPEG to avoid HEIC issues on iPhones
    const mimeType = "image/jpeg";

    // Temporary "processing" message
    const pendingMsg: ChatMessage = {
      id: `pending-${Date.now()}`,
      text: "🩺 Scanning prescription with AI...",
      isUser: false,
      timestamp: new Date(),
      type: "status",
      conversationId,
    };
    addMessage(pendingMsg);
    setLocalMessages(prev => [...prev, pendingMsg]);

    setIsSending(true);

    // Build FormData
    const formData = new FormData();
    formData.append("file", {
      uri: asset.uri,
      name: "prescription.jpg",
      type: mimeType,
    } as any);

    console.log("📤 Uploading image to /api/scan...");

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.log("⏰ Request timeout after 30s — aborting");
      controller.abort();
    }, 30000);

    const response = await fetch("https://med-assistant-backend.onrender.com/api/scan", {
      method: "POST",
      body: formData,
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    //console.log("📊 Response received:", response.status, response.ok);

    const textResponse = await response.text();
   // console.log("📦 Raw server response:", textResponse.slice(0, 300) + "...");

    if (!response.ok) {
      let errorMsg = "Unknown server error";
      try {
        const errorJson = JSON.parse(textResponse);
        errorMsg = errorJson.details || errorJson.error || textResponse;
      } catch {}
      throw new Error(`Server error ${response.status}: ${errorMsg}`);
    }

    // Parse the successful JSON
    let data;
    try {
      data = JSON.parse(textResponse);
    } catch (err) {
     // console.error("❌ Failed to parse response as JSON:", textResponse);
      throw new Error("Invalid JSON response from server");
    }

    // Extract text from response
    const scanText =
      data.text ||
      data.analysis ||
      data.rawText ||
      data.structured?.analysis ||
      data.structured?.extracted_text ||
      "";

  //  console.log("🔍 Extracted scan text:", scanText);

    // Remove "pending" message
    setLocalMessages(prev => prev.filter(msg => !msg.id.startsWith("pending-")));

    if (!scanText.trim()) {
      console.warn("⚠️ No readable text returned from Gemini:", data);
      throw new Error("Scan completed but no readable text was returned.");
    }

    // ✅ Display the Gemini analysis
    const scanResultMsg: ChatMessage = {
      id: `ai-scan-${Date.now()}`,
      text: scanText.trim(),
      isUser: false,
      timestamp: new Date(),
      type: "text",
      conversationId,
    };
    addMessage(scanResultMsg);
    setLocalMessages(prev => [...prev, scanResultMsg]);

    console.log("✅ Scan successful!");
  } catch (err) {
    console.error("❌ Overall scan process failed:", err);

    // Remove pending message
    setLocalMessages(prev => prev.filter(msg => !msg.id.startsWith("pending-")));

    Alert.alert("Scan Error", err instanceof Error ? err.message : "Failed to process image");
  } finally {
    toast.info("🏁 Scan process completed");
    setIsSending(false);
  }
};

 

  // Handle voice processing state
  const handleVoiceProcessing = (isProcessing: boolean) => {
    setProcessingVoice(isProcessing);
    
    if (isProcessing) {
      // Add a temporary voice processing message
      const processingMsg: ChatMessage = {
        id: `voice-processing-${Date.now()}`,
        text: "🎤 Processing voice message...",
        isUser: false,
        timestamp: new Date(),
        type: "status",
        conversationId,
      };
      addMessage(processingMsg);
      setLocalMessages(prev => [...prev, processingMsg]);
    } else {
      // Remove voice processing message
      const updatedMessages = displayMessages.filter(msg => !msg.id.includes('voice-processing-'));
      setLocalMessages(updatedMessages);
    }
  };

  const renderItem = useCallback(
    ({ item }: { item: ChatMessage }) => {
      console.log("🔄 Rendering message:", item.text);
      return <ChatBubble message={item} isFirst={false} />;
    },
    []
  );

  // 🔥 FIX: Add empty state
  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={[styles.emptyText, { color: colors.text }]}>
        {mode === 'doctor' 
          ? 'Start a conversation with your doctor...' 
          : 'Ask me anything about medications or health...'
        }
      </Text>
    </View>
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
            {mode === 'doctor' 
              ? 'Encrypted • Realtime' 
              : 'AI • Voice • Secure • Realtime'
            }
            {subscriptionActive && ' • Connected'}
            {mode === 'ai' && ' • Voice Enabled'}
          </Text>
        </View>

        {/* MESSAGES */}
        <FlatList
          ref={flatListRef}
          data={displayMessages}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ListEmptyComponent={renderEmptyState}
          contentContainerStyle={[
            styles.messagesContainer,
            displayMessages.length === 0 && styles.emptyMessagesContainer
          ]}
          onContentSizeChange={() => {
            setTimeout(() => {
              flatListRef.current?.scrollToEnd({ animated: true });
            }, 100);
          }}
          onLayout={() => {
            setTimeout(() => {
              flatListRef.current?.scrollToEnd({ animated: true });
            }, 100);
          }}
          showsVerticalScrollIndicator={false}
        />

        {/* LOADING INDICATOR */}
        {(loading || isSending || processingVoice) && (
          <View style={styles.typingContainer}>
            <View style={[styles.typingBubble, { backgroundColor: colors.card }]}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={[styles.typingText, { color: colors.text }]}>
                {processingVoice 
                  ? 'Processing voice...' 
                  : isSending 
                  ? 'Sending...' 
                  : 'Loading...'
                }
              </Text>
            </View>
          </View>
        )}

        {/* ✅ UPDATED CHAT INPUT BAR - Enhanced voice integration */}
        <ChatInputBar
          onSendMessage={handleSendMessage}
          onScanPress={handleScanPress}
          onVoiceProcessing={handleVoiceProcessing}
          disabled={isSending || processingVoice}
          placeholder={
            mode === 'doctor'
              ? 'Message your doctor...'
              : 'Ask about health or medications...'
          }
          chatMode={mode}
        />
      </Animated.View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  loadingText: { 
    marginTop: 16, 
    fontSize: 16 
  },
  header: { 
    paddingTop: 50, 
    padding: 16, 
    borderBottomWidth: 1, 
    borderBottomColor: 'rgba(0,0,0,0.1)' 
  },
  headerTitle: { 
    fontSize: 18, 
    fontWeight: '700' 
  },
  headerSubtitle: { 
    fontSize: 14, 
    opacity: 0.7 
  },
  messagesContainer: { 
    padding: 16, 
    paddingBottom: 8 
  },
  emptyMessagesContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.7,
  },
  typingContainer: { 
    paddingHorizontal: 16, 
    marginBottom: 8 
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 18,
    alignSelf: 'flex-start',
  },
  typingText: { 
    marginLeft: 8, 
    fontSize: 14, 
    fontStyle: 'italic', 
    opacity: 0.8 
  },
});

export default ChatRoom;