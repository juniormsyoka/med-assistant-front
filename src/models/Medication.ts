// models/Medication.ts
export interface Medication {
  id?: number;
  name: string;
  dosage: string;
  time: string;
  enabled: boolean;
  createdAt?: string;
  takenToday?: boolean;
  status?: 'taken' | 'missed' | 'snoozed' | 'skipped' | 'late' | 'rescheduled' | 'active' | 'paused';
  repeatType: 'once' | 'daily' | 'weekly' | 'monthly';
  weekday?: number;
  reminderMinutes?: number[];
  day?: number;
  nextReminderAt?: string;
  // ✅ Add supplyInfo to match storage.ts
  supplyInfo?: {
    totalQuantity: number;
    units: 'pills' | 'bottles' | 'puffs' | 'patches' | 'doses';
    dosagePerUse: number;
  };
  // ✅ Add sync tracking for Supabase integration
  synced_at?: string;
  server_id?: string;
  local_id?: number; // For tracking during sync

  personalization?: {
    enabled: boolean;
    optimalReminderOffsets?: number[]; // ML-suggested offsets
    userAdjustedOffsets?: number[];    // User-overridden offsets
    learningConfidence: number;        // 0-100%
    lastAnalyzed?: string;             // ISO string
    totalComplianceRecords: number;    // How much data we have
  };


}

export interface CreateMedication {
  name: string;
  dosage: string;
  time: string;
  enabled: boolean;
  status?: Medication['status'];
  repeatType: 'once' | 'daily' | 'weekly' | 'monthly';
  weekday?: number;
  day?: number;
  nextReminderAt?: string;
  reminderMinutes?: number[];
   personalization?: Medication['personalization'];
  // ✅ Add supplyInfo to match storage.ts
  supplyInfo?: {
    totalQuantity: number;
    units: 'pills' | 'bottles' | 'puffs' | 'patches' | 'doses';
    dosagePerUse: number;
  };
  // ✅ Optional sync fields for creation
  synced_at?: string;
  server_id?: string;
  local_id?: number;
}



export interface ComplianceRecord {
  id?: number;
  medicationId: number;
  scheduledTime: string;
  reminderOffsetUsed: number; // Which reminder worked (minutes before)
  actualAction: 'taken' | 'missed' | 'snoozed' | 'skipped';
  actionTime?: string; // When user actually took/skipped
  dayOfWeek: number;
  hourOfDay: number;
  latencySeconds?: number; // Response time
  createdAt: string;
}