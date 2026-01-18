// components/chat/ChatRoom.tsx
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Alert,
  Share
} from 'react-native';
import { useTheme, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ChatStackParamList } from '@/types/navigation';
import { ChatMessage } from '../models/ChatMessage';
import { useMessagingStore } from '../stores/messagingStore';
import { chatService } from '../Services/chatService';
import { toast } from '@/Services/toastService';
import { MoodAnalysisService } from '../Services/chatroom/MoodAnalysisService';
import { ChatMessageService } from '../Services/chatroom/chatMessageService';
import { supabase } from '../Services/supabaseClient'; // ADDED

// Components
import ChatHeader from '../components/chat/ChatHeader';
import ChatMessagesList from '../components/chat/ChatMessagesList';
import ChatInputContainer from '../components/chat/ChatInputContainer';

import { messageBus } from '../Services/mesageBus';
import * as Clipboard from 'expo-clipboard';

import * as Crypto from 'expo-crypto';

import * as Linking from 'expo-linking';

import { GroqAdapter } from '../Services/GroqAdapter';

type ChatRoomNavigationProp = NativeStackNavigationProp<ChatStackParamList, 'ChatRoom'>;
type ChatRoomRouteProp = RouteProp<ChatStackParamList, 'ChatRoom'>;

interface ChatRoomProps {
  route?: ChatRoomRouteProp;
  navigation?: ChatRoomNavigationProp;
}

const ChatRoom: React.FC<ChatRoomProps> = ({ route }) => {
  if (!route?.params) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
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
    updateMessage,
    clearConversationMessages,
  } = useMessagingStore();

  const displayMessages = getMessagesForConversation(conversationId);
  
  const [isInitializing, setIsInitializing] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [processingVoice, setProcessingVoice] = useState(false);
  const [subscriptionActive, setSubscriptionActive] = useState(false);
  const [isTyping, setIsTyping] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const moodService = MoodAnalysisService.getInstance();
  const messageService = ChatMessageService.getInstance();

  const generateUUID = (): string => {
  return Crypto.randomUUID();
};


  // Initialize chat
// Initialize chat - SMART VERSION
useEffect(() => {
  let unsubscribe: (() => void) | undefined;
  let mounted = true;

  const deleteListener = messageBus.onMessageDelete(({ messageId }) => {
    console.log('🔔 Received delete event for message:', messageId);
    if (mounted) {
      const { deleteMessage: deleteFromStore } = useMessagingStore.getState();
      deleteFromStore(messageId);
    }
  });

  const initChat = async () => {
    try {
      if (!mounted) return;
      
      console.log('🎯 Setting up chat room:', { conversationId, userId, mode, userRole });
      
      // Only show loading if there are no messages for this conversation
      const existingMessages = getMessagesForConversation(conversationId);
      const shouldShowLoading = existingMessages.length === 0;
      
      if (shouldShowLoading) {
        setLoading(true);
      }

      if (mode === 'doctor') {
        // Only load doctor messages if we don't have any yet
        if (existingMessages.length === 0) {
          const loadedMessages = await messageService.loadMessages(conversationId, userId);
          
          // Add to store
          loadedMessages.forEach(msg => {
            addMessage(msg);
          });
        }
        
        // Setup real-time subscription for NEW messages only
        unsubscribe = chatService.subscribeToConversation(
          conversationId,
          userId,
          (newMessage) => {
            if (!mounted) return;
            
            // Enhanced duplicate check
            const messageExists = existingMessages.some(msg => 
              msg.id === newMessage.id
            );
            
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
              mode: 'doctor',
            };
            
            addMessage(chatMsg);
          }
        );
        
        setSubscriptionActive(true);
        console.log('✅ Real-time subscription active for DOCTOR chat');
        
      } else {
        // For AI mode, only load if no messages exist
        if (existingMessages.length === 0) {
          await loadAIMessages();
        }
      }
    } catch (err) {
      console.error('❌ Chat initialization failed:', err);
      toast.error('Unable to load chat.');
    } finally {
      if (mounted) {
        setIsInitializing(false);
        setLoading(false);
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }).start();
      }
    }
  };

  initChat();

  // Cleanup - Only unsubscribe, don't clear messages
  return () => {
    console.log('🧹 Cleaning up chat room subscriptions');
    mounted = false;
    if (unsubscribe) {
      unsubscribe();
      setSubscriptionActive(false);
    }
  };
}, [conversationId, userId, mode, userRole]);

  const loadAIMessages = async () => {
    try {
      // Use direct Supabase query like in reference (MODIFIED)
      const { data: messages, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .eq('user_id', userId)
        .eq('is_deleted', false) //soft filter for deleted messages
        .order('created_at', { ascending: true });
      
      if (error) {
        console.error('❌ Failed to load messages:', error);
        toast.error('Failed to load messages');
        return;
      }
      
      console.log('✅ Loaded messages from DB:', messages?.length || 0);
      
      // Add messages to store
      if (messages && messages.length > 0) {
        messages.forEach(msg => {
          const chatMsg: ChatMessage = {
            id: msg.id,
            text: msg.text,
            isUser: msg.is_user,
            timestamp: new Date(msg.created_at),
            type: 'text',
            conversationId: conversationId,
            mode: 'ai',
            moodScore: msg.mood_score,
            stressScore: msg.stress_score,
            emotion: msg.emotion,
            metadata: msg.metadata,
            isDeleted:false
          };
          addMessage(chatMsg);
        });
      }
    } catch (error) {
      console.error('❌ Failed to load AI messages:', error);
      toast.error('Failed to load messages');
    }
  };

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || isSending) return;
    
    // Skip voice message placeholders
    if (text.includes('[Voice message recorded]') || 
        text.includes('transcription service upgrading') ||
        text.includes('Voice message recorded!')) {
      console.log('🔇 Skipping voice message placeholder');
      return;
    }
    
    setIsSending(true);

    try {
      console.log('[ChatRoom] Sending message:', text);
      
      if (mode === 'doctor') {
        // Doctor mode
        const userMsg: ChatMessage = {
          id: `user-${Date.now()}-${Math.random()}`,
          text: text.trim(),
          isUser: true,
          timestamp: new Date(),
          type: 'text',
          conversationId: conversationId,
          mode: 'doctor',
        };
        
        addMessage(userMsg);
        await chatService.sendMessage(conversationId, userId, text);
      } else {
        // AI mode
        await sendAIMessage(text);
      }
    } catch (err) {
      console.error('❌ Send failed:', err);
      toast.error('Message failed to send.');
    } finally {
      setIsSending(false);
    }
  };

  const sendAIMessage = async (text: string) => {
    if (!text.trim()) return;

    try {
      // Generate UUIDs upfront (CHANGED to use generateUUID)
      const userMessageId = generateUUID();
      const aiMessageId = generateUUID();

      // 1. Create and save user message immediately
      const userMsg: ChatMessage = {
        id: userMessageId,
        text: text.trim(),
        isUser: true,
        timestamp: new Date(),
        type: 'text',
        conversationId,
        mode: 'ai',
        isAnalyzing: true
      };

      addMessage(userMsg);
      
      // Save user message to DB immediately
      await messageService.saveMessage(userMsg, userId);

      // 2. Analyze mood in parallel
      const moodAnalysisPromise = moodService.analyzeMood(text, 'user');
      
      // 3. Create placeholder AI message
      const placeholderAiMsg: ChatMessage = {
        id: aiMessageId,
        text: '',
        conversationId,
        type: 'text',
        isUser: false,
        timestamp: new Date(),
        isAnalyzing: true,
        mode: 'ai',
        moodScore: 0.5, // ADDED: Default values like reference
        stressScore: 0.5,
        emotion: 'neutral'
      };

      addMessage(placeholderAiMsg);
      
      // SAVE PLACEHOLDER TO DB - This was missing! (ADDED)
      await supabase
        .from('chat_messages')
        .insert({
          id: aiMessageId,
          conversation_id: conversationId,
          user_id: userId,
          text: '',
          is_user: false,
          mood_score: 0.5,
          stress_score: 0.5,
          emotion: 'neutral',
          is_analyzing: true,
          metadata: {
            conversationType: 'ai',
            source: 'mobile_app',
            aiProvider: 'groq',
            placeholderMood: true
          },
          created_at: new Date().toISOString()
        });

      // 4. Wait for mood analysis (with timeout)
      let userMood;
      try {
        userMood = await Promise.race([
          moodAnalysisPromise,
          new Promise<any>((_, reject) => 
            setTimeout(() => reject(new Error('Mood analysis timeout')), 3000)
          )
        ]);
      } catch (moodError) {
        console.warn('⚠️ Mood analysis timed out or failed:', moodError);
        userMood = {
          moodScore: 0.5,
          stressScore: 0.5,
          emotion: 'neutral',
          isCrisis: false,
          confidence: 0.3,
          analyzedAt: new Date().toISOString(),
          source: 'timeout'
        };
      }

      // 5. Check for crisis
      if (moodService.checkForCrisis(userMood, text)) {
        Alert.alert(
          'Support Available',
          'You seem to be in distress. Remember help is available:\n\n• 988 Suicide & Crisis Lifeline\n• Emergency: 911\n• Your healthcare provider',
          [{ text: 'OK', style: 'default' }]
        );
      }

      // 6. Update user message with mood data
      updateMessage(userMessageId, {
        moodScore: userMood.moodScore,
        stressScore: userMood.stressScore,
        emotion: userMood.emotion,
        isCrisis: userMood.isCrisis,
        isAnalyzing: false,
        metadata: {
          moodAnalysis: userMood,
          analyzedAt: new Date().toISOString(),
          conversationType: 'ai'
        }
      });

      // Update user message in DB
      await messageService.updateMessage(userMessageId, {
        moodScore: userMood.moodScore,
        stressScore: userMood.stressScore,
        emotion: userMood.emotion,
        isAnalyzing: false,
        metadata: {
          moodAnalysis: userMood,
          analyzedAt: new Date().toISOString(),
          conversationType: 'ai'
        }
      });

      // 7. Stream AI response
      setIsTyping(true);
      let fullText = '';
      
      await GroqAdapter.send({
        conversationId,
        userId,
        text: text.trim(),
        context: {
          userMood: userMood,
          userIsInCrisis: userMood.isCrisis
        },
        onResponse: async (aiMsg: ChatMessage) => {
          fullText = aiMsg.text;
          
          console.log('📝 Updating AI message:', {
            messageId: aiMessageId,
            textLength: fullText.length,
            textPreview: fullText.substring(0, 50) + '...'
          });
          
          updateMessage(aiMessageId, { 
            text: fullText,
            timestamp: new Date()
          });

          console.log('💾 Saving AI response to database...');
          // Use direct Supabase update like reference
          await supabase
            .from('chat_messages')
            .update({
              text: fullText,
              updated_at: new Date().toISOString()
            })
            .eq('id', aiMessageId);
        },
      });

      setIsTyping(false);

      // 8. Analyze AI mood asynchronously (ADDED from reference)
      analyzeAndUpdateAIMood(fullText, aiMessageId);

    } catch (error) {
      console.error('❌ AI response failed:', error);
      handleErrorFallback(error, text);
      setIsTyping(false);
    }
  };

  // 🔄 Separate async function for non-blocking mood analysis (ADDED from reference)
  const analyzeAndUpdateAIMood = async (aiText: string, messageId: string) => {
    let moodData = {
      moodScore: 0.5,
      stressScore: 0.5,
      emotion: 'neutral' as any,
      isCrisis: false,
      analyzedAt: new Date().toISOString()
    };
    
    try {
      // Use mood service or direct API call
      const moodResult = await moodService.analyzeMood(aiText, 'ai');
      moodData = {
        moodScore: moodResult.moodScore ?? 0.5,
        stressScore: moodResult.stressScore ?? 0.5,
        emotion: moodResult.emotion ?? 'neutral',
        isCrisis: moodResult.isCrisis ?? false,
        analyzedAt: new Date().toISOString()
      };
      
      console.log('✅ AI mood analyzed:', {
        score: moodData.moodScore,
        emotion: moodData.emotion,
        messageId
      });
    } catch (err) {
      console.error('❌ Mood analysis failed:', err);
    }

    // Update message in store
    try {
      updateMessage(messageId, {
        moodScore: moodData.moodScore,
        stressScore: moodData.stressScore,
        emotion: moodData.emotion,
        isAnalyzing: false,
        metadata: {
          moodAnalysis: moodData,
          analyzedAt: moodData.analyzedAt,
          conversationType: 'ai'
        }
      });

      // ✅ Update Supabase with final mood data
      try {
        await supabase
          .from('chat_messages')
          .update({
            mood_score: moodData.moodScore,
            stress_score: moodData.stressScore,
            emotion: moodData.emotion,
            is_analyzing: false,
            metadata: {
              moodAnalysis: moodData,
              analyzedAt: moodData.analyzedAt,
              conversationType: 'ai',
              source: 'mobile_app',
              aiProvider: 'groq'
            },
            updated_at: new Date().toISOString()
          })
          .eq('id', messageId);

        console.log('✅ Mood data saved to DB for:', messageId);
      } catch (dbError) {
        console.error('❌ Database update failed:', dbError);
      }

    } catch (updateError) {
      console.error('❌ Failed to update message:', updateError);
    }
  };

  const handleErrorFallback = async (error: any, userText: string) => {
    const fallbackId = generateUUID(); // CHANGED
    const fallbackMsg: ChatMessage = {
      id: fallbackId,
      text: "I'm having some technical difficulties right now. Please try again in a moment.",
      isUser: false,
      timestamp: new Date(),
      type: 'text',
      conversationId,
      mode: 'ai',
      moodScore: 0.3,
      stressScore: 0.7,
      emotion: 'concerned',
      metadata: {
        isFallback: true,
        error: error?.message,
        originalText: userText.substring(0, 100), // CHANGED: increased length
        timestamp: new Date().toISOString()
      }
    };
    
    addMessage(fallbackMsg);
    
    // Save error fallback to Supabase directly (CHANGED)
    try {
      await supabase
        .from('chat_messages')
        .insert({
          id: fallbackId,
          conversation_id: conversationId,
          user_id: userId,
          text: fallbackMsg.text,
          is_user: false,
          mood_score: fallbackMsg.moodScore,
          stress_score: fallbackMsg.stressScore,
          emotion: fallbackMsg.emotion,
          metadata: {
            isFallback: true,
            error: error?.message,
            originalText: userText,
            timestamp: new Date().toISOString(),
            conversationType: 'ai'
          },
          created_at: new Date().toISOString()
        });
    } catch (dbError) {
      console.error('❌ Database error saving fallback:', dbError);
    }
  };

  const handleVoiceProcessing = (isProcessing: boolean) => {
    setProcessingVoice(isProcessing);
  };


  // components/chat/ChatRoom.tsx
const copyToClipboard = async (text: string) => {
  try {
    await Clipboard.setStringAsync(text);
    toast.success('Copied to clipboard');
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    toast.error('Failed to copy');
  }
};

// ADDED: Edit message function
const editMessage = async (message: ChatMessage) => {
  // For user messages only
  if (!message.isUser) {
    toast.info('You can only edit your own messages');
    return;
  }

  Alert.prompt(
    'Edit Message',
    'Edit your message:',
    [
      { 
        text: 'Cancel', 
        style: 'cancel' 
      },
      {
        text: 'Save',
        onPress: async (newText:any) => {
          if (!newText || newText.trim() === '') {
            toast.error('Message cannot be empty');
            return;
          }

          try {
            // Update in local store
            updateMessage(message.id, {
              text: newText.trim(),
              isEdited: true,
              metadata: {
                ...message.metadata,
                editedAt: new Date().toISOString(),
                originalText: message.text
              }
            });

            // Update in database
            if (mode === 'doctor') {
              // For doctor mode, update via chatService
              await chatService.updateMessage(message.id, newText.trim());
            } else {
              // For AI mode, update directly in Supabase
              await supabase
                .from('chat_messages')
                .update({
                  text: newText.trim(),
                  metadata: {
                    ...message.metadata,
                    editedAt: new Date().toISOString(),
                    originalText: message.text
                  },
                  updated_at: new Date().toISOString()
                })
                .eq('id', message.id);
            }

            toast.success('Message updated');
          } catch (error) {
            console.error('Failed to edit message:', error);
            toast.error('Failed to update message');
          }
        }
      }
    ],
    'plain-text',
    message.text
  );
};

const deleteMessage = async (message: ChatMessage) => {
  Alert.alert('Delete Message', 'Are you sure?', [
    { text: 'Cancel', style: 'cancel' },
    {
      text: 'Delete',
      style: 'destructive',
      onPress: async () => {
        try {
          // Update store (soft delete)
          useMessagingStore.getState().deleteMessage(message.id);

          // Update DB
          await chatService.softDeleteAIMessage(message.id);

          toast.success('Message deleted', {
            undoAction: () => restoreMessage(message)
          });
        } catch (err) {
          toast.error('Failed to delete message');
        }
      }
    }
  ]);
};


// ADDED: Restore deleted message
const restoreMessage = async (message: ChatMessage) => {
  try {
    // Restore in store
    useMessagingStore.getState().restoreMessage(message.id);

    // Restore in DB
    await chatService.restoreAIMessage(message.id);

    toast.success('Message restored');
  } catch (error) {
    console.error('Restore failed:', error);
    toast.error('Failed to restore message');
  }
};




  const handleMessageLongPress = (message: ChatMessage) => {
  Alert.alert(
    'Message Options',
    'What would you like to do with this message?',
    [
      
      { 
        text: 'Delete', 
        onPress: () => deleteMessage(message),
        style: 'destructive'
      },
      { 
        text: 'Copy Text', 
        onPress: () => copyToClipboard(message.text)
      },
      
      { 
        text: 'Cancel', 
        style: 'cancel' 
      },
    ],
    { cancelable: true }
  );
};


  // ADD SCAN FUNCTIONALITY IF NEEDED (from reference)
  // const handleScanPress = async () => { ... }

  if (isInitializing) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ marginTop: 16, fontSize: 16, color: colors.text }}>
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
      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        <ChatHeader
          mode={mode}
          isOnline={moodService.getOnlineStatus()}
          subscriptionActive={subscriptionActive}
        />
        
        <ChatMessagesList
          messages={displayMessages}
          isLoading={loading}
          isTyping={isTyping}
          typingText={mode === 'ai' ? 'AI Assistant is thinking...' : 'Doctor is typing...'}
          onMessageLongPress={handleMessageLongPress}
       />

        <ChatInputContainer
          onSendMessage={handleSendMessage}
          onVoiceProcessing={handleVoiceProcessing}
          disabled={isSending || processingVoice}
          placeholder={
            mode === 'doctor'
              ? 'Message your doctor...'
              : 'Ask about health or medications...'
          }
          chatMode={mode}
          showScanButton={mode === 'ai'}
          // onScanPress={handleScanPress} // ADD if you implement scan
        />
      </Animated.View>
    </KeyboardAvoidingView>
  );
};

export default ChatRoom;