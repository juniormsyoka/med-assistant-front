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

  // Find or create a conversation for patient↔doctor
/* async getOrCreateConversation(patientId: string, doctorId: string, title?: string) {
  try {
    console.log('🔍 [getOrCreateConversation] Creating conversation...');

    const { data: conversation, error } = await supabase
      .from('conversations')
      .insert({ 
        title: title || 'Doctor-Patient Chat',
        conversation_type: 'medical'  // ✅ Use 'medical' instead of 'consultation'
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Conversation creation failed:', error);
      throw error;
    }

    console.log('✅ Conversation created:', conversation.id);
    return conversation.id;

  } catch (error: any) {
    console.error('💥 Error:', error);
    throw error;
  }
}*/

async getOrCreateConversation(patientId: string, doctorId: string, title?: string) {
  try {
    console.log('🔍 [getOrCreateConversation] Looking for conversation between:', {
      patientId,
      doctorId
    });

    // First, try to find an existing conversation between these two users
    const { data: existingParticipants, error: participantsError } = await supabase
      .from('participants')
      .select('conversation_id')
      .in('user_id', [patientId, doctorId]);

    if (participantsError) {
      console.error('❌ Error fetching participants:', participantsError);
      throw participantsError;
    }

    console.log('📊 Found participants:', existingParticipants);

    if (existingParticipants && existingParticipants.length >= 2) {
      // Group by conversation_id to find conversations with both users
      const conversationCounts: Record<string, number> = {};
      existingParticipants.forEach(participant => {
        conversationCounts[participant.conversation_id] = 
          (conversationCounts[participant.conversation_id] || 0) + 1;
      });

      // Find conversation that has both users (count = 2)
      const existingConvoId = Object.keys(conversationCounts).find(
        convId => conversationCounts[convId] >= 2
      );

      if (existingConvoId) {
        console.log('✅ Found existing conversation:', existingConvoId);
        return existingConvoId;
      }
    }

    // If no existing conversation found, create a new one
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

  } catch (error: any) {
    console.error('💥 getOrCreateConversation error:', error);
    throw error;
  }
}


 async sendMessage(conversationId: string, senderId: string, text: string) {
  const localId = `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const createdAt = new Date().toISOString();

  // Save locally first (unsynced)
  await addMessageLocal({
    id: localId,
    conversationId,
    senderId,
    text,
    createdAt,
    synced: 0
  });

  // Emit locally so UI shows message instantly
  messageBus.emitMessage(conversationId, {
    id: localId,
    text,
    isUser: true,
    timestamp: new Date(createdAt),
  });

  // Try to send to Supabase if online
  if (this.online) {
    try {
      const { data: msg, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: senderId,
          text: text
        })
        .select()
        .single();

      if (error) throw error;

      console.log('✅ Message sent to Supabase, server ID:', msg.id);

      // ⚠️ ONLY call markMessageSynced - NOT saveMessageFromSupabase
      await markMessageSynced(localId, msg.id);

    } catch (err) {
      console.warn('sendMessage supabase failed, will keep local until sync', err);
    }
  }

  return localId;
}
  

 async syncOutgoing() {
  const unsynced = await getUnsyncedMessages();
  for (const m of unsynced) {
    try {
      console.log(`📤 Syncing message: ${m.id}`);
      
      const { data: msg, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: m.conversation_id,
          sender_id: m.sender_id,
          text: m.text,
          created_at: m.created_at
        })
        .select()
        .single();

      if (error) {
        console.warn('❌ Failed to sync message to Supabase:', m.id, error);
        continue;
      }

      console.log('✅ Message synced to Supabase:', msg.id);
      await markMessageSynced(m.id, msg.id);

    } catch (err) {
      console.warn('syncOutgoing inner error:', err);
    }
  }
}


  // Subscribe to realtime messages for a conversation
  subscribeToConversation(conversationId: string, currentUserId: string, onNew: (message: any) => void) {
  console.log(`🔔 Setting up real-time subscription for conversation: ${conversationId}`);
  
  // Unsubscribe from existing subscription if any
  if (this.subscriptions[conversationId]) {
    console.log('🔄 Unsubscribing from existing subscription');
    this.subscriptions[conversationId].unsubscribe();
  }

  const channel = supabase
    .channel(`conversation:${conversationId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`
      },
      async (payload) => {
        console.log('📨 Real-time message received:', payload);
        
        const newId = payload.new.id;
        
        // Fetch the complete message with sender info
        const { data: newMessage, error } = await supabase
          .from('messages')
          .select(`*, sender:users ( id, full_name, role )`)
          .eq('id', newId)
          .single();

        if (error) {
          console.error('❌ Failed to fetch message details:', error);
          return;
        }

        if (!newMessage) {
          console.warn('⚠️ No message found for ID:', newId);
          return;
        }

        console.log('✅ New message details:', {
          id: newMessage.id,
          text: newMessage.text,
          sender_id: newMessage.sender_id,
          currentUserId: currentUserId
        });

        // Save to local DB
        await saveMessageFromSupabase({
          id: newMessage.id,
          conversationId: newMessage.conversation_id,
          senderId: newMessage.sender_id,
          text: newMessage.text,
          createdAt: newMessage.created_at
        });

        // Emit to UI
        const chatMsg = {
          id: newMessage.id,
          text: newMessage.text,
          isUser: newMessage.sender_id === currentUserId,
          timestamp: new Date(newMessage.created_at),
          sender: newMessage.sender ? {
            id: newMessage.sender.id,
            name: newMessage.sender.full_name,
            role: newMessage.sender.role
          } : undefined
        };

        console.log('🚀 Emitting message to UI:', chatMsg);
        messageBus.emitMessage(conversationId, chatMsg);
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

  // Load messages (local first, then remote if online)
  async loadMessages(conversationId: string, currentUserId: string) {
  // load local messages and return them
  const local = await getMessagesLocal(conversationId, 1000);

  // convert to UI shape
  const ui = local.map(m => ({
    id: m.id,
    text: m.text,
    senderId: m.sender_id, // Fixed: use m.sender_id instead of m.senderId
    isUser: m.sender_id === currentUserId,
    timestamp: new Date(m.created_at) // Fixed: use m.created_at instead of m.createdAt
  }));

  return ui;
}

  // Mark messages as read in remote DB
  async markConversationRead(conversationId: string, userId: string) {
    // get latest messages that are not read by user and bulk insert into message_reads
    // For simplicity we'll insert a read record for the latest message
    const { data: last } = await supabase
      .from('messages')
      .select('id')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (last?.id) {
      await supabase.from('message_reads').insert({
        message_id: last.id,
        user_id: userId,
        read_at: new Date().toISOString()
      });
    }
  }

  // Add this near the bottom of your messagingService object
  async getConversations(userId: string) {
  // get conversation IDs where user is a participant
  const { data: convRows, error } = await supabase
    .from('participants')
    .select('conversation_id')
    .eq('user_id', userId);

  if (error) throw error;

  if (!convRows || !convRows.length) return [];

  // fetch conversation details
  const convoIds = convRows.map(r => r.conversation_id);
  const { data: conversations } = await supabase
    .from('conversations')
    .select('*')
    .in('id', convoIds);

  return conversations || [];
}



// Add this method to your ChatService class
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


}

export const chatService = new ChatService();
export type { SupabaseMessage as Message};


