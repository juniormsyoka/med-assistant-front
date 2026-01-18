// src/models/ComplianceRecord.ts

export type ComplianceAction = 
  | 'taken' 
  | 'missed' 
  | 'snoozed' 
  | 'skipped' 
  | 'late';

export interface ComplianceRecord {
  id?: number;                 // Local SQLite ID
  server_id?: string;          // Supabase ID once synced
  synced_at?: string | null;   // Sync timestamp
  
  medicationId: number;        // References Medication.id
  medicationName: string;      // Denormalized for offline queries
  scheduledTime: string;       // ISO string - when dose was scheduled
  reminderOffsetUsed: number;  // Which reminder worked (minutes before scheduled time)
  actualAction: ComplianceAction;
  actionTime?: string;         // ISO string - when user actually took/skipped
  dayOfWeek: number;           // 0-6 (Sunday = 0)
  hourOfDay: number;          // 0-23
  latencySeconds?: number;    // Response time in seconds (reminder → action)
  
  // Context data (optional)
  location?: 'home' | 'work' | 'traveling' | 'other';
  mood?: 'good' | 'ok' | 'bad' | 'stressed' | 'busy';
  batteryLevel?: number;      // Device battery % when reminder fired
  skippedReason?: 'forgot' | 'busy' | 'side_effects' | 'not_available';
  
  createdAt: string;          // ISO string
}

// For creating new records (without auto fields)
export type CreateComplianceRecord = Omit<
  ComplianceRecord, 
  'id' | 'server_id' | 'synced_at' | 'createdAt'
>;

// For tracking reminder scheduling (separate from actual compliance)
export interface ReminderScheduleRecord {
  id?: number;
  medicationId: number;
  scheduledTime: string;       // When dose is due
  reminderOffsets: number[];   // Array of minutes before scheduled
  scheduledAt: string;         // When reminders were scheduled
}