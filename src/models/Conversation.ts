// src/models/Conversation.ts
export interface Conversation {
  id: string;
  patientId: string;
  doctorId: string;
  lastMessage?: string;
  updatedAt: string; // ISO string
  // future: metadata like priority, tags, unread counts
}
