// stores/messagingStore.ts
import { create } from 'zustand';
import { ChatMessage } from '../models/ChatMessage';
import { chatService } from '../Services/chatService';
import { Conversation } from '../models/Conversation';

interface MessagingState {
  messages: ChatMessage[];
  conversations: Conversation[];
  loading: boolean;
  loadingMore: boolean; // Added
  hasMore: boolean; // Added
  error: string | null;
  currentConversationId: string | null;
  currentConversation: Conversation | null;
  unsubscribe: (() => void) | null;

  // Core actions
  addMessage: (message: ChatMessage) => void;
  updateMessage: (id: string, updates: Partial<ChatMessage>) => void;
  
  // NEW: Set current conversation
  setCurrentConversation: (conversation: Conversation) => void;

  // Delete / Restore
  deleteMessage: (id: string) => void;
  restoreMessage: (id: string) => void;

  // Loaders
  loadMessages: (conversationId: string, userId: string) => Promise<void>;
  sendMessage: (conversationId: string, userId: string, text: string) => Promise<void>;
  subscribeToMessages: (conversationId: string, userId: string) => () => void;

  setLoading: (loading: boolean) => void;

  // Conversations
  loadConversations: (userId: string, refresh?: boolean) => Promise<void>;
  loadMoreConversations: (userId: string) => Promise<void>; // Added
  setConversations: (conversations: Conversation[]) => void;
  setHasMore: (hasMore: boolean) => void; // Added

  // Selectors
  getMessagesForConversation: (conversationId: string) => ChatMessage[];

  // Utils
  clearConversationMessages: (conversationId: string) => void;
  clearAllMessages: () => void;
}

export const useMessagingStore = create<MessagingState>((set, get) => ({
  messages: [],
  conversations: [],
  loading: false,
  loadingMore: false, // Added
  hasMore: true, // Added - assume there's more initially
  error: null,
  currentConversationId: null,
  currentConversation: null,
  unsubscribe: null,

  /* ---------------------------------- */
  /* Core message handling              */
  /* ---------------------------------- */

  addMessage: (message) => {
    const exists = get().messages.some(m => m.id === message.id);
    if (exists) return;

    set(state => ({
      messages: [...state.messages, message],
    }));
  },

  updateMessage: (id, updates) =>
    set(state => ({
      messages: state.messages.map(msg =>
        msg.id === id ? { ...msg, ...updates } : msg
      ),
    })),

  // NEW: Set current conversation
  setCurrentConversation: (conversation) =>
    set({
      currentConversation: conversation,
      currentConversationId: conversation.id
    }),

  /* ---------------------------------- */
  /* Delete / Restore (MODE AWARE)       */
  /* ---------------------------------- */

  deleteMessage: (id) =>
    set(state => ({
      messages: state.messages
        .map(msg => {
          if (msg.id !== id) return msg;

          // AI → soft delete
          if (msg.mode === 'ai') {
            return { ...msg, isDeleted: true };
          }

          // Doctor → hard delete
          return null;
        })
        .filter(Boolean) as ChatMessage[],
    })),

  restoreMessage: (id) =>
    set(state => ({
      messages: state.messages.map(msg =>
        msg.id === id && msg.mode === 'ai'
          ? { ...msg, isDeleted: false }
          : msg
      ),
    })),

  /* ---------------------------------- */
  /* Loaders                            */
  /* ---------------------------------- */

  loadMessages: async (conversationId, userId) => {
    set({ loading: true, error: null });

    try {
      const messages = await chatService.loadMessages(conversationId, userId);

      const typedMessages: ChatMessage[] = messages.map(msg => ({
        ...msg,
        mode: (msg as any).mode || 'ai', // Provide default mode
        isDeleted: (msg as any).isDeleted || false,
      }));
      
      set(state => ({
        messages: [
          ...state.messages.filter(m => m.conversationId !== conversationId),
          ...typedMessages,
        ],
        currentConversationId: conversationId,
      }));
    } catch (err) {
      console.error('Failed to load messages:', err);
      set({ error: 'Failed to load messages' });
    } finally {
      set({ loading: false });
    }
  },

  sendMessage: async (conversationId, userId, text) => {
    const optimistic: ChatMessage = {
      id: `temp-${Date.now()}`,
      text,
      isUser: true,
      timestamp: new Date(),
      conversationId,
      mode: 'doctor',
      isDeleted: false,
    };

    get().addMessage(optimistic);

    try {
      await chatService.sendMessage(conversationId, userId, text);
    } catch (err) {
      console.error('Send failed:', err);
      set({ error: 'Failed to send message' });
    }
  },

  setLoading: (loading) => set({ loading }),

  subscribeToMessages: (conversationId, userId) => {
    if (get().unsubscribe) get().unsubscribe!();

    const unsub = chatService.subscribeToConversation(
      conversationId,
      userId,
      (msg: ChatMessage) => get().addMessage(msg)
    );

    set({ unsubscribe: unsub });
    return () => {
      unsub();
      set({ unsubscribe: null });
    };
  },

  /* ---------------------------------- */
  /* Conversations                      */
  /* ---------------------------------- */

  setConversations: (conversations) => set({ conversations }),

  setHasMore: (hasMore) => set({ hasMore }),

  loadConversations: async (userId, refresh = false) => {
    try {
      set({ loading: true });
      
      // For now, we'll load all conversations at once
      // In a real app, you'd implement pagination in chatService
      const convos = await chatService.getConversations(userId);
      
      set({ 
        conversations: convos,
        hasMore: false, // Since we're loading all at once
        loading: false 
      });
    } catch (err) {
      console.error(err);
      set({ 
        error: 'Failed to load conversations',
        loading: false 
      });
    }
  },

  loadMoreConversations: async (userId) => {
    const { conversations, hasMore, loadingMore } = get();
    
    if (!hasMore || loadingMore) return;

    try {
      set({ loadingMore: true });
      
      // In a real implementation, you'd fetch next page
      // For now, we'll simulate loading more
      setTimeout(() => {
        // This is where you'd call chatService.getConversations with pagination
        set({ 
          loadingMore: false,
          hasMore: false // Set to false since we're loading all at once
        });
      }, 1000);
      
    } catch (err) {
      console.error('Failed to load more conversations:', err);
      set({ 
        loadingMore: false,
        error: 'Failed to load more conversations'
      });
    }
  },

  /* ---------------------------------- */
  /* Selectors                          */
  /* ---------------------------------- */

  getMessagesForConversation: (conversationId) =>
    get().messages.filter(
      msg =>
        msg.conversationId === conversationId &&
        !msg.isDeleted
    ),

  /* ---------------------------------- */
  /* Utils                              */
  /* ---------------------------------- */

  clearConversationMessages: (conversationId) =>
    set(state => ({
      messages: state.messages.filter(m => m.conversationId !== conversationId),
    })),

  clearAllMessages: () => set({ messages: [] }),
}));