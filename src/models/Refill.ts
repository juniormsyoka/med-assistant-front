export interface Refill {
  id?: number;
  medicationId: number;
  initialSupply: number;
  currentSupply: number;
  dosagePerUse: number;
  refillThreshold: number;   // alert when supply reaches this
  refillQuantity: number;    // how much to refill
  lastRefillDate: string;    // ISO string
  nextRefillDate?: string;   // ISO string
  isActive: boolean;
  synced_at?: string | null; // last time synced with Supabase
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateRefill {
  medicationId: number;
  initialSupply: number;
  currentSupply: number;
  dosagePerUse: number;
  refillThreshold: number;
  refillQuantity: number;
  lastRefillDate: string;
  nextRefillDate?: string;
  isActive: boolean;
}
