// models/ChatMessage.ts

// All allowed message types used across the app
export type MessageType =
  | 'text'
  | 'suggestion'
  | 'quick_reply'
  | 'medication_info'
  | 'reminder_set'
  | 'error';

// Core message type (non-generic — simpler and easier to use)
export interface ChatMessage {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;

  // allow any of the MessageType values
  type?: MessageType;
  suggestions?: string[]; // for quick-reply buttons
  metadata?: {
    medicationId?: number;
    intent?: string;
    confidence?: number;
  };
}

// For creation (omit id + timestamp)
export type CreateChatMessage = Omit<ChatMessage, 'id' | 'timestamp'> & {
  timestamp?: Date;
};

// Factory to create consistent ChatMessage objects
export const createChatMessage = (
  text: string,
  isUser: boolean,
  options?: Partial<CreateChatMessage>
): ChatMessage => ({
  id: Date.now().toString() + Math.random().toString(36).slice(2, 9),
  text,
  isUser,
  timestamp: options?.timestamp ?? new Date(),
  ...(options ?? {}),
});

// Convenience factories
export const isUserMessage = (m: ChatMessage) => m.isUser;
export const isBotMessage = (m: ChatMessage) => !m.isUser;
export const formatMessageTime = (ts: Date) =>
  ts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

// A typed message helper (if you want an explicit typed object)
export const createTypedMessage = (
  text: string,
  type: MessageType = 'text',
  data?: any
): ChatMessage => createChatMessage(text, false, { type, metadata: data });
