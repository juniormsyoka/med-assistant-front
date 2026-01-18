// src/models/Conversation.ts
export interface Conversation {
  id: string;
  title?: string;
  participants?: Array<{
    id: string;
    full_name: string;
  }>;
  last_message?: {
    text: string;
    sender?: {
      full_name: string;
    };
    created_at: string;
  };
  unread_count?: number;
  updated_at?: string;
  [key: string]: any; // For any additional properties
}