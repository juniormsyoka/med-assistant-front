// src/models/Appointment.ts

export interface Appointment {
  id?: number; // local ID
  server_id?: string; // optional server-side ID (from Supabase)
  synced_at?: string | null; // when last synced to Supabase
  title: string;
  type: 'doctor' | 'dentist' | 'specialist' | 'lab' | 'surgery' | 'other';
  date: string; // ISO string (YYYY-MM-DD)
  time: string; // HH:MM format
  location?: string;
  doctorName?: string;
  notes?: string;
  reminderMinutes: number[]; // [60, 1440] = 1 hour and 1 day before
  isCompleted: boolean;
  createdAt?: string;
}

export interface CreateAppointment {
  title: string;
  type: Appointment['type'];
  date: string;
  time: string;
  location?: string;
  doctorName?: string;
  notes?: string;
  reminderMinutes: number[];
  isCompleted: boolean;
}
