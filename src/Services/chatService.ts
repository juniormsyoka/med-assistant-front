// src/Services/chatService.ts
import { supabase } from './supabaseClient';
import NetInfo from '@react-native-community/netinfo';
import { messageBus } from '../Services/mesageBus'; // your existing bus
import {
  addMessageLocal,
  getMessagesLocal,
  getUnsyncedMessages,
  markMessageSynced,
  saveMessageFromSupabase
} from './storage';
import { ChatMessage } from '@/models/ChatMessage';

export type SupabaseMessage = {
  id: string;
  conversation_id: string;
  sender_id: string;
  text: string;
  created_at: string;
};

class ChatService {
  private online = true;
  private subscriptions: Record<string, any> = {};

  constructor() {
    NetInfo.fetch().then(state => this.online = !!state.isConnected);
    NetInfo.addEventListener(s => {
      const was = this.online;
      this.online = !!s.isConnected;
      if (!was && this.online) {
        // regained connectivity
        this.syncOutgoing();
      }
    });
  }

 async getOrCreateConversation(patientId: string, doctorId: string, title?: string) {
  try {
    console.log('🔍 [getOrCreateConversation] Looking for conversation between:', {
      patientId,
      doctorId
    });

    // ✅ Raw SQL: find conversation that has exactly both participants
    const sql = `
      SELECT conversation_id
      FROM participants
      WHERE user_id = ANY($1)
      GROUP BY conversation_id
      HAVING COUNT(DISTINCT user_id) = 2
      LIMIT 1
    `;
    const { data: existing, error: sqlError } = await supabase.rpc('execute_sql', {
      sql,
      params: [[patientId, doctorId]]
    });

    if (sqlError) {
      console.error('❌ Error running raw SQL:', sqlError);
      throw sqlError;
    }

    if (existing && existing.length > 0) {
      const existingConvoId = existing[0].conversation_id;
      console.log('✅ Found existing conversation:', existingConvoId);
      return existingConvoId;
    }

    // No conversation exists → create new
    console.log('🆕 Creating new conversation...');
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .insert({
        title: title || 'Doctor-Patient Chat',
        conversation_type: 'medical'
      })
      .select()
      .single();

    if (convError) {
      console.error('❌ Conversation creation failed:', convError);
      throw convError;
    }

    console.log('✅ New conversation created:', conversation.id);

    // Add both users as participants
    const participants = [
      { conversation_id: conversation.id, user_id: patientId },
      { conversation_id: conversation.id, user_id: doctorId }
    ];

    const { error: partError } = await supabase
      .from('participants')
      .insert(participants);

    if (partError) {
      console.error('❌ Failed to add participants:', partError);
      throw partError;
    }

    console.log('✅ Participants added to conversation');
    return conversation.id;

  } catch (error) {
    console.error('💥 getOrCreateConversation error:', error);
    throw error;
  }
}



  async sendMessage(conversationId: string, senderId: string, text: string) {
  const { localMessage, uiMessage } = this.createLocalMessageObjects({
    conversationId,
    senderId,
    text,
    isUser: true,
    prefix: 'local'
  });

  // Save locally
  await addMessageLocal(localMessage);

  // Emit to UI
  messageBus.emitCreated(uiMessage);

  // Try to push to Supabase if online
  if (this.online) {
    await this.pushLocalMessageToSupabase(localMessage);
  }

  return localMessage.id;
}

  
async syncOutgoing() {
  try {
    const unsynced = await getUnsyncedMessages();
    if (unsynced.length === 0) return;

    console.log(`📤 Attempting to sync ${unsynced.length} messages...`);

    let syncedCount = 0;

    for (const localMessage of unsynced) {
      const success = await this.pushLocalMessageToSupabase({
        id: localMessage.id,
        conversationId: localMessage.conversation_id,
        senderId: localMessage.sender_id,
        text: localMessage.text,
        createdAt: localMessage.created_at
      });

      if (!success) {
        console.warn(
          `⚠️ Sync stopped after ${syncedCount} messages. Will retry remaining later.`
        );
        break;
      }

      syncedCount++;
    }

    console.log(`✅ Successfully synced ${syncedCount} messages`);

  } catch (err) {
    console.error('💥 Unexpected error in syncOutgoing:', err);
  }
}


  // Subscribe to realtime messages for a conversation
  subscribeToConversation(
  conversationId: string,
  currentUserId: string,
  onNew: (message: ChatMessage) => void
) {
  console.log(`🔔 Setting up real-time subscription for conversation: ${conversationId}`);

  // Unsubscribe from existing subscription if any
  if (this.subscriptions[conversationId]) {
    console.log('🔄 Unsubscribing from existing subscription');
    this.subscriptions[conversationId].unsubscribe();
  }

  const channel = supabase
    .channel(`conversation:${conversationId}`)
    .on(
      'postgres_changes' as any,
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
        select: `*, sender:users(id, full_name, role)` // ✅ Include sender directly
      },
      async (payload) => {
        console.log('📨 Real-time message with sender data:', payload);

        const newMessage = payload.new;

        if (!newMessage) {
          console.warn('⚠️ No message found in payload:', payload);
          return;
        }

        // Save to local DB with sender info
        await saveMessageFromSupabase({
          id: newMessage.id,
          conversationId: newMessage.conversation_id,
          senderId: newMessage.sender_id,
          sender: newMessage.sender, // ✅ already included
          text: newMessage.text,
          createdAt: newMessage.created_at
        });

        // Prepare UI message
        const chatMsg: ChatMessage = {
          id: newMessage.id,
          text: newMessage.text,
          isUser: newMessage.sender_id === currentUserId,
          timestamp: new Date(newMessage.created_at),
          conversationId: newMessage.conversation_id,
          mode: 'doctor',
          isDeleted: false,
          sender: newMessage.sender
            ? {
                id: newMessage.sender.id,
                name: newMessage.sender.full_name,
                role: newMessage.sender.role
              }
            : undefined
        };

        console.log('🚀 Emitting message to UI:', chatMsg);
        messageBus.emitCreated(chatMsg);
        onNew(chatMsg);
      }
    )
    .subscribe((status) => {
      console.log(`📡 Subscription status for ${conversationId}:`, status);
    });

  this.subscriptions[conversationId] = channel;

  return () => {
    console.log(`🔕 Unsubscribing from conversation: ${conversationId}`);
    channel.unsubscribe();
    delete this.subscriptions[conversationId];
  };
}


  async loadMessages(
  conversationId: string,
  currentUserId: string,
  limit: number = 50,
  offset: number = 0
) {
  try {
    console.log(`📥 Loading messages for conversation: ${conversationId}`);

    // ✅ Fetch only messages for this conversation
    const { data: messages, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1); // pagination support

    if (error) {
      console.error('❌ Failed to load messages:', error);
      return [];
    }

    console.log(`📊 Fetched ${messages.length} messages from DB`);

    // Map to UI-friendly ChatMessage format
    const uiMessages: ChatMessage[] = messages.map((m: any) => ({
      id: m.id,
      text: m.text,
      senderId: m.sender_id,
      isUser: m.sender_id === currentUserId,
      timestamp: new Date(m.created_at),
      conversationId: m.conversation_id,
      mode: 'doctor',
      isDeleted: m.is_deleted || false
    }));

    return uiMessages;
  } catch (err) {
    console.error('💥 Unexpected error in loadMessages:', err);
    return [];
  }
}


  // Mark messages as read in remote DB
  async markConversationRead(conversationId: string, userId: string) {
  try {
    console.log(`📖 Marking messages as read for conversation: ${conversationId}, user: ${userId}`);

    // ✅ Fetch all messages not yet marked as read by this user
    const { data: unreadMessages, error } = await supabase
      .from('messages')
      .select('id')
      .not(`id`, 'in', supabase
        .from('message_reads')
        .select('message_id')
        .eq('user_id', userId)
      )
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('❌ Failed to fetch unread messages:', error);
      return;
    }

    if (!unreadMessages || unreadMessages.length === 0) {
      console.log('✅ No unread messages to mark.');
      return;
    }

    console.log(`📊 Marking ${unreadMessages.length} messages as read`);

    // ✅ Bulk insert read records for all unread messages
    const { error: insertError } = await supabase
      .from('message_reads')
      .insert(
        unreadMessages.map(msg => ({
          message_id: msg.id,
          user_id: userId,
          read_at: this.nowISO()
        }))
      );

    if (insertError) {
      console.error('❌ Failed to mark messages as read:', insertError);
      return;
    }

    console.log(`✅ Successfully marked ${unreadMessages.length} messages as read`);
  } catch (err) {
    console.error('💥 Unexpected error in markConversationRead:', err);
  }
}


  async getConversations(userId: string) {
  try {
    console.log(`📂 Fetching conversations for user: ${userId}`);

    // ✅ Single query: fetch conversations where the user is a participant
    const { data: conversations, error } = await supabase
      .from('conversations')
      .select(`
        *,
        participants!inner(user_id)
      `)
      .eq('participants.user_id', userId)
      .order('updated_at', { ascending: false }); // optional: latest updated first

    if (error) {
      console.error('❌ Failed to fetch conversations:', error);
      return [];
    }

    if (!conversations || conversations.length === 0) {
      console.log('⚠️ No conversations found for this user.');
      return [];
    }

    console.log(`✅ Fetched ${conversations.length} conversations`);
    return conversations;
  } catch (err) {
    console.error('💥 Unexpected error in getConversations:', err);
    return [];
  }
}


  // Check real-time setup
  async checkRealTimeSetup(conversationId: string) {
    try {
      console.log('🔍 Checking real-time setup for conversation:', conversationId);
      
      // Test if we can listen to changes
      const testChannel = supabase
        .channel('test-channel')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'messages',
            filter: `conversation_id=eq.${conversationId}`
          },
          (payload) => {
            console.log('🧪 Test channel received:', payload);
          }
        )
        .subscribe((status) => {
          console.log('🧪 Test channel status:', status);
        });

      // Unsubscribe after 5 seconds
      setTimeout(() => {
        testChannel.unsubscribe();
        console.log('🧪 Test channel unsubscribed');
      }, 5000);

    } catch (error) {
      console.error('❌ Real-time setup check failed:', error);
    }
  }
private nowISO(): string {
  return new Date().toISOString();
}


  private getTimestamps(isDeleted: boolean) {
  const now = this.nowISO();
  return {
    is_deleted: isDeleted,
    deleted_at: isDeleted ? now : null,
    updated_at: now
  };
}

private async updateAIMessageState(
  conversationId: string,
  messageId: string,
  isDeleted: boolean
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('chat_messages')
      .update(this.getTimestamps(isDeleted))
      .eq('id', messageId);

    if (error) {
      console.error('❌ AI message state update failed:', error);
      return false;
    }

    // You need to add conversationId parameter to this method
isDeleted
  ? messageBus.emitDeleted(conversationId, messageId)   
  : messageBus.emitRestored(conversationId, messageId); 

    return true;
  } catch (err) {
    console.error('❌ AI message state update error:', err);
    return false;
  }
}

private createLocalMessageObjects(params: {
  conversationId: string;
  senderId: string;
  text: string;
  isUser: boolean;
  prefix?: 'local' | 'ai';
}) {
  const createdAt = new Date().toISOString();
  const prefix = params.prefix ?? 'local';

  // Object for local DB
  const localMessage = {
    id: `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    conversationId: params.conversationId,
    senderId: params.senderId,
    text: params.text,
    createdAt,
    synced: 0
  };

  // Object for UI (ChatMessage)
  const uiMessage: ChatMessage = {
    ...localMessage,
    isUser: params.isUser,
    timestamp: new Date(createdAt),
    mode: params.isUser ? 'doctor' : 'ai',
    isDeleted: false
  };

  return { localMessage, uiMessage };
}




private async saveLocalAIMessages(
  conversationId: string,
  senderId: string,
  texts: string[],
  isUser: boolean
): Promise<string[]> {
  const messageIds: string[] = [];

  for (const text of texts) {
    // Use the new factory
    const { localMessage, uiMessage } = this.createLocalMessageObjects({
      conversationId,
      senderId,
      text,
      isUser,
      prefix: 'ai'
    });

    // Save locally
    await addMessageLocal(localMessage);

    // Emit to UI
    messageBus.emitCreated(uiMessage);

    messageIds.push(localMessage.id);
  }

  return messageIds;
}


private async pushLocalMessageToSupabase(localMessage: any): Promise<boolean> {
  try {
    const { data: msg, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: localMessage.conversationId,
        sender_id: localMessage.senderId,
        text: localMessage.text,
        created_at: localMessage.createdAt
      })
      .select()
      .single();

    if (error) {
      console.warn('❌ Failed to push message to Supabase:', error);
      return false;
    }

    // Link local → server ID
    await markMessageSynced(localMessage.id, msg.id);

    return true;
  } catch (err) {
    console.warn('❌ pushLocalMessageToSupabase error:', err);
    return false;
  }
}


async saveAIMessagesBatch(
  conversationId: string,
  userId: string,
  texts: string[],
  isUser = false
) {
  return this.saveLocalAIMessages(
    conversationId,
    isUser ? userId : 'ai-assistant',
    texts,
    isUser
  );
}



  // Save AI message locally
  async saveMessage(
  conversationId: string,
  userId: string,
  text: string,
  isUser: boolean
) {
  const ids = await this.saveLocalAIMessages(
    conversationId,
    isUser ? userId : 'ai-assistant',
    [text],
    isUser
  );

  return ids[0];
}


  // Get messages for specific conversation (filtered)
  getMessagesForConversation(messages: ChatMessage[], conversationId: string) {
    return messages.filter(msg => msg.conversationId === conversationId);
  }

  // Clear messages for specific conversation
  clearConversationMessages(messages: ChatMessage[], conversationId: string) {
    return messages.filter(msg => msg.conversationId !== conversationId);
  }


async updateMessage(conversationId: string, messageId: string, newText: string): Promise<boolean> {
  try {
    console.log('📝 Updating message:', messageId);
    
    const { error } = await supabase
      .from('messages')
      .update({
                text: newText,
                ...this.getTimestamps(false)
              })

      .eq('id', messageId);

    if (error) {
      console.error('❌ Failed to update message:', error);
      return false;
    }

    console.log('✅ Message updated:', messageId);
    
    // Emit update event
  //  messageBus.emitMessageUpdate(messageId, { text: newText });
    messageBus.emitUpdated(conversationId, messageId, { text: newText }); 
    
    return true;
  } catch (error) {
    console.error('❌ Update error:', error);
    return false;
  }
}

async deleteMessage(conversationId: string, messageId: string): Promise<boolean> {
  try {
    console.log('🗑️ Deleting message:', messageId);
    
    // SOFT DELETE: Mark as deleted but keep in DB
    const { error } = await supabase
      .from('messages')
      .update(this.getTimestamps(true))

      .eq('id', messageId);

    if (error) {
      console.error('❌ Failed to delete message:', error);
      return false;
    }

    console.log('✅ Message marked as deleted:', messageId);
    
    // Emit delete event to real-time subscribers
    messageBus.emitDeleted(conversationId, messageId);
    
    return true;
  } catch (error) {
    console.error('❌ Delete error:', error);
    return false;
  }
}

// For AI mode (chat_messages table)
async deleteAIMessage(conversationId: string, messageId: string) {
  return this.updateAIMessageState(conversationId, messageId, true);
}

async restoreAIMessage(conversationId: string, messageId: string) {
  return this.updateAIMessageState(conversationId, messageId, false);
}


}



export const chatService = new ChatService();
export type { SupabaseMessage as Message};