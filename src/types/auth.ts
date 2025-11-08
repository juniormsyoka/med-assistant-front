// src/types/auth.ts
export type UserRole = 'super_admin' | 'admin' | 'doctor' | 'patient';

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  hospital_id?: string | null;
  doctor_id?: string | null; // for patients
  is_verified: boolean;
  created_at: string;
}

export interface Hospital {
  id: string;
  name: string;
  address: string;
  phone: string;
  super_admin_id: string;
  is_active: boolean;
  created_at: string;
}