export interface Medication {
  id?: number; // SQLite auto-increments this
  name: string;
  dosage: string;
  time: string; // Store as string 'HH:MM' for simplicity
  enabled: boolean; // 1 for true, 0 for false in SQLite
  createdAt?: string; // ISO string for date
  takenToday?: boolean;
  status?: 'taken' | 'missed' | 'snoozed' | 'skipped' | 'late' | 'rescheduled' | 'active' | 'paused';
  repeatType: 'daily' | 'weekly' | 'monthly';  // ✅ new
  weekday?: number; // for weekly
  day?: number;     // for monthly
}

export interface CreateMedication {
  name: string;
  dosage: string;
  time: string;      // "HH:mm"
  enabled: boolean;
  status?: Medication['status'];
  repeatType: 'daily' | 'weekly' | 'monthly';  // ✅ new
  weekday?: number; // for weekly
  day?: number;     // for monthly

  
}