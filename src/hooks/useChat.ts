// src/hooks/useChat.ts
import { useEffect, useState, useCallback } from 'react';
import { chatService } from '@/Services/chatService';
import { messageBus } from '../Services/mesageBus';
//import { v4 as uuidv4 } from 'uuid';

export function useChat(conversationId: string | null, currentUserId: string) {
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsub: (() => void) | undefined;

    const handleBus = (msg: any) => {
      setMessages(prev => {
        // dedupe by id
        if (prev.find(m => m.id === msg.id)) return prev;
        return [...prev, msg].sort((a, b) => new Date(a.timestamp) > new Date(b.timestamp) ? 1 : -1);
      });
    };

    const start = async () => {
      if (!conversationId) {
        setLoading(false);
        return;
      }
      const local = await chatService.loadMessages(conversationId, currentUserId);
      // mark isUser using currentUserId
      const localWithIsUser = local.map(m => ({ ...m, isUser: m.senderId === currentUserId }));
      setMessages(localWithIsUser);

      // subscribe to realtime
      unsub = chatService.subscribeToConversation(conversationId, currentUserId, (m) => {
        handleBus(m);
      });

      setLoading(false);
      // mark read
      await chatService.markConversationRead(conversationId, currentUserId);
    };

    start();

    const off = messageBus.onMessage(conversationId || 'none', (m: any) => handleBus(m));

    return () => {
      off();
      if (unsub) unsub();
    };
  }, [conversationId, currentUserId]);

  const sendMessage = useCallback(async (text: string) => {
    if (!conversationId) throw new Error('No conversationId');
    // call service which does local-first save + remote attempt
    await chatService.sendMessage(conversationId, currentUserId, text);
  }, [conversationId, currentUserId]);

  return { messages, loading, sendMessage };
}
