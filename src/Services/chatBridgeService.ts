import { supabase } from './supabaseClient';
import { chatService, Message as SupabaseMessage } from '../Services/chatService';
import { ChatMessage } from '../models/ChatMessage';

export class ChatBridgeService {
  // Convert Supabase Message to ChatMessage
  private static toChatMessage(supabaseMsg: SupabaseMessage, currentUserId: string): ChatMessage {
    return {
      id: supabaseMsg.id,
      text: supabaseMsg.text,
      isUser: supabaseMsg.sender_id === currentUserId,
      timestamp: new Date(supabaseMsg.created_at),
      type: 'text',
    };
  }

  // Convert ChatMessage to Supabase Message format
  private static toSupabaseMessage(chatMsg: ChatMessage, conversationId: string, senderId: string): any {
    return {
      conversation_id: conversationId,
      sender_id: senderId,
      text: chatMsg.text,
      type: chatMsg.type || 'text'
    };
  }

  // Sync local messages to Supabase
  static async syncLocalToSupabase(localMessages: ChatMessage[], conversationId: string, userId: string) {
    try {
      for (const localMsg of localMessages) {
        if (localMsg.isUser) {
          await chatService.sendMessage(conversationId, userId, localMsg.text);
        }
      }
    } catch (error) {
      console.error('Sync failed:', error);
    }
  }

  // Load messages from Supabase and convert to ChatMessage
  // Option 1: Fetch directly from Supabase for full SupabaseMessage
static async loadSupabaseMessages(conversationId: string, currentUserId: string): Promise<ChatMessage[]> {
  try {
    const { data: supabaseMessages, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error || !supabaseMessages) {
      console.error('Failed to load from Supabase:', error);
      return [];
    }

    return supabaseMessages.map(msg => this.toChatMessage(msg as SupabaseMessage, currentUserId));
  } catch (error) {
    console.error('Failed to load from Supabase:', error);
    return [];
  }
}


  // Send message
  static async sendMessage(chatMsg: ChatMessage, conversationId: string, senderId: string): Promise<void> {
    try {
      await chatService.sendMessage(conversationId, senderId, chatMsg.text);
    } catch (error) {
      console.error('Failed to send message:', error);
      throw error;
    }
  }

  // Subscribe to messages in real-time
  static subscribeToMessages(conversationId: string, currentUserId: string, onNewMessage: (chatMsg: ChatMessage) => void) {
    return chatService.subscribeToConversation(conversationId, currentUserId, onNewMessage);
  }

  // Optional: convert Supabase message to extended ChatMessage with sender info
  static toExtendedChatMessage(supabaseMsg: SupabaseMessage, currentUserId: string): ChatMessage & { sender?: { id: string; name: string; role: string } } {
    return {
      id: supabaseMsg.id,
      text: supabaseMsg.text,
      isUser: supabaseMsg.sender_id === currentUserId,
      timestamp: new Date(supabaseMsg.created_at),
      type: 'text',
      sender: (supabaseMsg as any).sender ? {
        id: (supabaseMsg as any).sender.id,
        name: (supabaseMsg as any).sender.full_name,
        role: (supabaseMsg as any).sender.role
      } : undefined
    };
  }
}
