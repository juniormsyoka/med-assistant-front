// src/models/LogEntry.ts

export type LogStatus = 
  | 'taken'
  | 'missed'
  | 'snoozed'
  | 'skipped'
  | 'late'
  | 'rescheduled'
  | 'active'
  | 'paused'
  | 'refilled'
  | 'attended'
  | 'missedAttendance';

export interface LogEntry {
  id?: number;                 // local ID
  server_id?: string;          // ID from Supabase once synced
  synced_at?: string | null;   // when it was last synced to Supabase
  medicationId: number;
  medicationName: string;
  status: LogStatus;
  scheduledTime: string;       // ISO string
  actualTime?: string;
  dosage?: string;
  snoozeMinutes?: number;
  createdAt?: string;          // ISO string
}

export type CreateLogEntry = Omit<LogEntry, 'id' | 'createdAt' | 'server_id' | 'synced_at'>;
