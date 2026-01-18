// Services/messageBus.ts
import { ChatMessage } from '../models/ChatMessage';

type MessageCallback = (msg: ChatMessage) => void;
type DeleteCallback = (data: { messageId: string }) => void;
type UpdateCallback = (data: { messageId: string; updates: Partial<ChatMessage> }) => void;
type RestoreCallback = (data: { messageId: string }) => void;

class MessageBus {
  private messageListeners: Record<string, MessageCallback[]> = {};
  private deleteListeners: DeleteCallback[] = [];
  private updateListeners: UpdateCallback[] = [];
  private restoreListeners: RestoreCallback[] = [];

  // Emit new message
  emitMessage(conversationId: string, msg: ChatMessage) {
    console.log('📢 Emitting message for conversation:', conversationId, msg.id);
    if (this.messageListeners[conversationId]) {
      this.messageListeners[conversationId].forEach(cb => cb(msg));
    }
  }

  // Listen for new messages in a conversation
  onMessage(conversationId: string, callback: MessageCallback) {
    if (!this.messageListeners[conversationId]) {
      this.messageListeners[conversationId] = [];
    }
    this.messageListeners[conversationId].push(callback);

    return () => {
      this.messageListeners[conversationId] =
        this.messageListeners[conversationId].filter(cb => cb !== callback);
    };
  }

  // Emit message delete event
  emitMessageDelete(messageId: string) {
    console.log('🚨 Emitting message delete:', messageId);
    this.deleteListeners.forEach(callback => callback({ messageId }));
  }

  // Listen for message delete events
  onMessageDelete(callback: DeleteCallback) {
    this.deleteListeners.push(callback);
    return () => {
      this.deleteListeners = this.deleteListeners.filter(cb => cb !== callback);
    };
  }

  offMessageDelete(callback: DeleteCallback) {
    this.deleteListeners = this.deleteListeners.filter(cb => cb !== callback);
  }

  // Emit message update event
  emitMessageUpdate(messageId: string, updates: Partial<ChatMessage>) {
    console.log('📝 Emitting message update:', messageId, updates);
    this.updateListeners.forEach(callback => callback({ messageId, updates }));
  }

  // Listen for message updates
  onMessageUpdate(callback: UpdateCallback) {
    this.updateListeners.push(callback);
    return () => {
      this.updateListeners = this.updateListeners.filter(cb => cb !== callback);
    };
  }

  // Clean up all listeners for a conversation
  cleanupConversation(conversationId: string) {
    console.log('🧹 Cleaning up listeners for conversation:', conversationId);
    delete this.messageListeners[conversationId];
  }

  // Get listener counts for debugging
  getListenerCounts() {
    return {
      conversationListeners: Object.keys(this.messageListeners).length,
      deleteListeners: this.deleteListeners.length,
      updateListeners: this.updateListeners.length,
      restoreListeners: this.restoreListeners.length
    };
  }

  emitMessageRestore(messageId: string) {
    console.log('♻️ Emitting message restore:', messageId);
    this.restoreListeners.forEach(cb => cb({ messageId }));
  }

  onMessageRestore(callback: RestoreCallback) {
    this.restoreListeners.push(callback);
    return () => {
      this.restoreListeners = this.restoreListeners.filter(cb => cb !== callback);
    };
  }

  offMessageRestore(callback: RestoreCallback) {
    this.restoreListeners = this.restoreListeners.filter(cb => cb !== callback);
  }

  // =============================
  // 💡 Helper emission methods
  // =============================

 /* emitCreated(message: { id: string; text: string; ui: ChatMessage['ui'] }) {
    this.emitMessage(message.ui.conversationId, {
      id: message.id,
      text: message.text,
      ...message.ui
    });
  }*/

    emitCreated(message: ChatMessage) {
      this.emitMessage(message.conversationId, message);
    }


  emitUpdated(conversationId: string, messageId: string, updates: Partial<ChatMessage>) {
    this.emitMessageUpdate(messageId, updates);
  }

  emitDeleted(conversationId: string, messageId: string) {
    this.emitMessageDelete(messageId);
  }

  emitRestored(conversationId: string, messageId: string) {
    this.emitMessageRestore(messageId);
  }
}

export const messageBus = new MessageBus();
