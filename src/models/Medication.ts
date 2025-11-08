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