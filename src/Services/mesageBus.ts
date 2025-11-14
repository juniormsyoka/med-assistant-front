import { ChatMessage } from '../models/ChatMessage';

type MessageCallback = (msg: ChatMessage) => void;

class MessageBus {
  private listeners: Record<string, MessageCallback[]> = {};

  //
emitMessage(conversationId: string, msg: ChatMessage) {
    this.listeners[conversationId]?.forEach(cb => cb(msg));
  }

  onMessage(conversationId: string, callback: MessageCallback) {
    if (!this.listeners[conversationId]) {
      this.listeners[conversationId] = [];
    }
    this.listeners[conversationId].push(callback);

    return () => {
      this.listeners[conversationId] = this.listeners[conversationId].filter(cb => cb !== callback);
    };
  }
}

export const messageBus = new MessageBus();
