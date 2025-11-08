import { ChatMessage } from "../models/ChatMessage";

export const DoctorAdapter = {
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
    // Simulate doctor reply
    setTimeout(() => {
      const reply: ChatMessage = {
        id: `doc-${Date.now()}`,
        text: `Doctor reply to "${text}"`,
        isUser: false,
        timestamp: new Date(),
      };
      onResponse(reply);
    }, 1500);
  },
};
