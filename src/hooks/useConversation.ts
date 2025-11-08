import { useEffect } from 'react';
import { useMessagingStore } from '../stores/messagingStore';

export const useConversation = (conversationId: string | null, currentUserId: string) => {
  const {
    messages,
    loading,
    currentConversation,
    loadMessages,
    subscribeToMessages,
    setCurrentConversation
  } = useMessagingStore();

  // Load messages and subscribe when conversation changes
  useEffect(() => {
    if (!conversationId || !currentUserId) return;

    // Load existing messages
    loadMessages(conversationId, currentUserId);

    // Subscribe to new messages
    const unsubscribe = subscribeToMessages(conversationId, currentUserId);

    // Cleanup subscription
    return () => {
      unsubscribe();
    };
  }, [conversationId, currentUserId]);

  return {
    messages,
    loading,
    currentConversation,
    setCurrentConversation
  };
};