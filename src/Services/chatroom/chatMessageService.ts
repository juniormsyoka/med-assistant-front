// services/ChatMessageService.ts
import { supabase } from '../../Services/supabaseClient';
import { ChatMessage } from '../../models/ChatMessage';

export class ChatMessageService {
  private static instance: ChatMessageService;

  static getInstance(): ChatMessageService {
    if (!ChatMessageService.instance) {
      ChatMessageService.instance = new ChatMessageService();
    }
    return ChatMessageService.instance;
  }

  async saveMessage(message: ChatMessage, userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          id: message.id,
          conversation_id: message.conversationId,
          user_id: userId,
          text: message.text,
          is_user: message.isUser,
          mood_score: message.moodScore,
          stress_score: message.stressScore,
          emotion: message.emotion,
          metadata: message.metadata,
          created_at: message.timestamp.toISOString()
        });

      if (error) {
        console.error('❌ Failed to save message:', error);
        return false;
      }

      console.log('✅ Message saved to DB:', message.id);
      return true;
    } catch (error) {
      console.error('❌ Database error saving message:', error);
      return false;
    }
  }

  async updateMessage(messageId: string, updates: Partial<ChatMessage>): Promise<boolean> {
    try {
      const updateData: any = {
        updated_at: new Date().toISOString()
      };

      if (updates.text !== undefined) updateData.text = updates.text;
      if (updates.moodScore !== undefined) updateData.mood_score = updates.moodScore;
      if (updates.stressScore !== undefined) updateData.stress_score = updates.stressScore;
      if (updates.emotion !== undefined) updateData.emotion = updates.emotion;
      if (updates.metadata !== undefined) updateData.metadata = updates.metadata;
      if (updates.isAnalyzing !== undefined) updateData.is_analyzing = updates.isAnalyzing;

      const { error } = await supabase
        .from('chat_messages')
        .update(updateData)
        .eq('id', messageId);

      if (error) {
        console.error('❌ Failed to update message:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('❌ Database error updating message:', error);
      return false;
    }
  }

  async loadMessages(conversationId: string, userId: string): Promise<ChatMessage[]> {
    try {
      const { data: messages, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('❌ Failed to load messages:', error);
        return [];
      }

      return messages.map(msg => ({
        id: msg.id,
        text: msg.text,
        isUser: msg.is_user,
        timestamp: new Date(msg.created_at),
        type: 'text',
        conversationId: msg.conversation_id,
        moodScore: msg.mood_score,
        stressScore: msg.stress_score,
        emotion: msg.emotion,
        metadata: msg.metadata,
        isAnalyzing: msg.is_analyzing,
      }));

    } catch (error) {
      console.error('❌ Database error loading messages:', error);
      return [];
    }
  }

  async deleteMessage(messageId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('chat_messages')
        .delete()
        .eq('id', messageId);

      if (error) {
        console.error('❌ Failed to delete message:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('❌ Database error deleting message:', error);
      return false;
    }
  }
}