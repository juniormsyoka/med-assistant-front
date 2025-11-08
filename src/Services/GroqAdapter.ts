import { ChatMessage } from "../models/ChatMessage";
import { sendChatMessageStreamXHR } from "../Services/api";

export const GroqAdapter = {
  send: async ({
    conversationId,
    userId,
    text,
    onResponse,
  }: {
    conversationId: string;
    userId: string;
    text: string;
    onResponse: (msg: ChatMessage) => void;
  }) => {
    // Create ONE placeholder AI message
    const aiMsg: ChatMessage = {
      id: `ai-${Date.now()}`,
      text: "",
      isUser: false,
      timestamp: new Date(),
    };
    
    // ✅ Only call onResponse ONCE with the initial empty message
    onResponse(aiMsg);

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
      aiMsg.text = "⚠️ Failed to connect to AI assistant.";
      onResponse({ ...aiMsg }); // Update existing message
    }
  },
};