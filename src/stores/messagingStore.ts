// stores/messagingStore.ts
import { create } from 'zustand';
import { ChatMessage, filterMessagesByConversation } from '../models/ChatMessage';
import { chatService } from '../Services/chatService';

interface MessagingState {
  messages: ChatMessage[];
  conversations: any[]; // Future support for inbox list
  loading: boolean;
  error: string | null;
  currentConversationId: string | null;
  unsubscribe: (() => void) | null;

  // Actions
  setMessages: (messages: ChatMessage[]) => void;
  addMessage: (message: ChatMessage) => void;
  updateMessage: (messageId: string, updates: Partial<ChatMessage>) => void;
  removeMessage: (messageId: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearMessages: () => void;
  clearConversationMessages: (conversationId: string) => void; // ✅ ADDED: Clear specific conversation

  // Conversations
  setConversations: (conversations: any[]) => void;
  loadConversations: (userId: string) => Promise<void>;

  // ChatService integration
  loadMessages: (conversationId: string, userId: string) => Promise<void>;
  sendMessage: (conversationId: string, userId: string, text: string) => Promise<void>;
  subscribeToMessages: (conversationId: string, userId: string) => () => void;

  // ✅ ADDED: Get messages for specific conversation
  getMessagesForConversation: (conversationId: string) => ChatMessage[];
}

export const useMessagingStore = create<MessagingState>((set, get) => ({
  messages: [],
  conversations: [],
  loading: false,
  error: null,
  currentConversationId: null,
  unsubscribe: null,

  setMessages: (messages) => set({ messages }),
  
  addMessage: (message) => set((state) => ({
    messages: [...state.messages, message],
  })),
  
  updateMessage: (messageId, updates) =>
    set((state) => ({
      messages: state.messages.map((msg) =>
        msg.id === messageId ? { ...msg, ...updates } : msg
      ),
    })),
    
  removeMessage: (messageId) =>
    set((state) => ({
      messages: state.messages.filter((msg) => msg.id !== messageId),
    })),
    
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  
  clearMessages: () => set({ messages: [] }),
  
  // ✅ ADDED: Clear only messages from specific conversation
  clearConversationMessages: (conversationId: string) =>
    set((state) => ({
      messages: state.messages.filter((msg) => msg.conversationId !== conversationId),
    })),

  setConversations: (conversations) => set({ conversations }),

  loadConversations: async (userId: string) => {
    const { setLoading, setError, setConversations } = get();
    try {
      setLoading(true);
      const conversations = await chatService.getConversations(userId);
      setConversations(conversations);
    } catch (error) {
      console.error('Failed to load conversations:', error);
      setError('Failed to load conversations');
    } finally {
      setLoading(false);
    }
  },

  loadMessages: async (conversationId: string, userId: string) => {
    const { setLoading, setMessages, setError, clearConversationMessages } = get();

    try {
      setLoading(true);
      setError(null);

      // ✅ CLEAR existing messages for this conversation first
      clearConversationMessages(conversationId);

      const messages = await chatService.loadMessages(conversationId, userId);
      
      // ✅ ADD conversationId to each message
      const messagesWithConversationId = messages.map(msg => ({
        ...msg,
        conversationId: conversationId,
      }));
      
      setMessages(messagesWithConversationId);
      set({ currentConversationId: conversationId });
    } catch (error) {
      console.error('Failed to load messages:', error);
      setError('Failed to load messages');
    } finally {
      setLoading(false);
    }
  },

  sendMessage: async (conversationId: string, userId: string, text: string) => {
    const { addMessage, setError } = get();

    // Optimistic message with conversationId
    const optimisticMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      text: text,
      isUser: true,
      timestamp: new Date(),
      conversationId: conversationId, // ✅ ADDED: Include conversationId
    };
    addMessage(optimisticMsg);

    try {
      await chatService.sendMessage(conversationId, userId, text);
    } catch (error) {
      console.error('Failed to send message:', error);
      setError('Failed to send message');
    }
  },

  subscribeToMessages: (conversationId: string, userId: string) => {
    const { addMessage, updateMessage, unsubscribe } = get();

    // Clean up existing subscription
    if (unsubscribe) unsubscribe();

    const unsubscribeFn = chatService.subscribeToConversation(
      conversationId,
      userId,
      (newMessage: ChatMessage) => {
        const existingIndex = get().messages.findIndex(
          (msg) => msg.id === newMessage.id || msg.id === `temp-${newMessage.id}`
        );

        if (existingIndex >= 0) {
          updateMessage(get().messages[existingIndex].id, newMessage);
        } else {
          // ✅ ADD conversationId to incoming real-time messages
          const messageWithConversationId = {
            ...newMessage,
            conversationId: conversationId,
          };
          addMessage(messageWithConversationId);
        }
      }
    );

    set({ unsubscribe: unsubscribeFn });
    return () => {
      unsubscribeFn();
      set({ unsubscribe: null });
    };
  },

  // ✅ ADDED: Get filtered messages for specific conversation
  getMessagesForConversation: (conversationId: string) => {
    const { messages } = get();
    return filterMessagesByConversation(messages, conversationId);
  },
}));