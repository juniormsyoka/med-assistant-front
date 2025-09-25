export type LogStatus = 
  | 'taken'        // dose taken on time
  | 'missed'       // dose was not taken at all
  | 'snoozed'      // remind me later
  | 'skipped'      // intentionally skipped
  | 'late'         // taken, but after scheduled time
  | 'rescheduled'; // dose time moved

export interface LogEntry {
  id?: number;
  medicationId: number;
  medicationName: string;
  status: LogStatus;
  scheduledTime: string;  // ISO string
  actualTime?: string;    // ISO string (null/undefined for missed/skipped)
  createdAt?: string;     // ISO string
}

export type CreateLogEntry = Omit<LogEntry, 'id' | 'createdAt'>;
