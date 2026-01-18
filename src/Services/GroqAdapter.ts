// src/Services/GroqAdapter.ts
import { ChatMessage, createChatMessage } from "../models/ChatMessage";
import { sendChatMessageStreamXHR } from "../Services/api";

export interface GroqSendOptions {
  conversationId: string;
  userId: string;
  text: string;
  context?: {
    userMood?: any;
    userIsInCrisis?: boolean;
    suggestedTone?: any;
  };
  onResponse: (msg: ChatMessage) => void | Promise<void>;
}

export const GroqAdapter = {
  send: async (options: GroqSendOptions) => {
    const { conversationId, userId, text, context, onResponse } = options;
    
    console.log('📤 Sending to Groq with context:', {
      text: text.substring(0, 50) + (text.length > 50 ? '...' : ''),
      hasMoodContext: !!context?.userMood,
      isCrisis: context?.userIsInCrisis,
      suggestedTone: context?.suggestedTone?.tone
    });

    // ✅ Use factory function WITHOUT custom ID (let it generate one)
    const aiMsg = createChatMessage(
      "", // Start with empty text
      false, // isUser
      conversationId, // conversationId
      {
        timestamp: new Date(),
        // Add mood context from user if available
        moodScore: context?.userMood?.stressScore ? -context.userMood.stressScore : 0.5,
        stressScore: context?.userMood?.stressScore || 0.5,
        emotion: context?.userMood?.isCrisis ? 'concerned' : 'neutral',
        metadata: {
          userMoodContext: context?.userMood,
          aiTone: context?.suggestedTone ? {
            tone: context.suggestedTone.tone,
            empathyLevel: context.suggestedTone.empathyLevel === 'VERY_HIGH' ? 0.9 : 
                         context.suggestedTone.empathyLevel === 'HIGH' ? 0.8 : 0.6,
            responseStrategy: context.suggestedTone.action,
            priority: context.suggestedTone.priority,
            responseSpeed: context.suggestedTone.responseSpeed
          } : undefined
        }
      }
    );
    
    // ✅ Only call onResponse ONCE with the initial empty message
    await onResponse(aiMsg);

    try {
      await sendChatMessageStreamXHR(
        text,
        // ✅ onChunk callback - UPDATE existing message, don't create new ones
        (chunk: string) => {
          aiMsg.text += chunk;
          // ✅ Update the SAME message by passing the same ID
          onResponse({ ...aiMsg }); // Same ID = updates existing message
        },
        // ✅ onComplete callback
        () => {
          console.log("✅ Stream complete for:", conversationId);
        },
        // ✅ onError callback
        (error: Error) => {
          console.error("❌ Stream error:", error);
          aiMsg.text += "\n[Error: AI connection failed]";
          onResponse({ ...aiMsg }); // Update existing message
        }
      );
    } catch (error: any) {
      console.error("GroqAdapter error:", error);
      aiMsg.text = "⚠️ Failed to connect to AI assistant. Please try again.";
      await onResponse({ ...aiMsg }); // Update existing message
      throw error; // Re-throw to be caught by ChatRoom
    }
  },
  
  testConnection: async (): Promise<boolean> => {
    try {
      const response = await fetch('https://med-assistant-backend.onrender.com/api/test');
      return response.ok;
    } catch {
      return false;
    }
  }
};

export default GroqAdapter;