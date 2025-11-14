// Services/dataService.ts
import { supabase } from './supabaseClient';
import * as localDB from './storage';
import NetInfo from '@react-native-community/netinfo';
import { Medication, CreateMedication } from '../models/Medication';
import { Appointment, CreateAppointment } from '../models/Appointment';
import { LogEntry, CreateLogEntry } from '../models/LogEntry';
import { Refill, CreateRefill } from '../models/Refill';
//import { getLowSupplyMedications, addRefill } from './storage';
import { addRefill, getRefillByMedicationId, getLowSupplyMedications } from "./storage";

class DataService {
  private isOnline = true;

  constructor() {
    // Monitor network status
    NetInfo.addEventListener(state => {
      this.isOnline = state.isConnected ?? false;
      console.log('Network status:', this.isOnline ? 'Online' : 'Offline');
    });
  }

  // ===== MEDICATION METHODS =====
  async getMedications(): Promise<Medication[]> {
    try {
      if (this.isOnline) {
        const { data, error } = await supabase
          .from('medications')
          .select('*')
          .is('deleted_at', null)
          .order('time');
        
        if (!error && data) {
          const normalizedData = this.normalizeMedications(data);
          // TODO: Sync to local storage if needed
          return normalizedData;
        }
      }
      
      // Fallback to local storage
      return await localDB.getMedications();
    } catch (error) {
      console.error('Error fetching medications:', error);
      return await localDB.getMedications();
    }
  }

  async addMedication(medication: CreateMedication): Promise<number> {
    try {
      // Always save to local first for immediate response
      const localId = await localDB.addMedication(medication);
      
      if (this.isOnline) {
        const supabaseData = this.toSupabaseMedication(medication);
        const { data, error } = await supabase
          .from('medications')
          .insert(supabaseData)
          .select()
          .single();

        if (!error && data) {
          // Update local record with server ID for future sync
          await this.syncLocalMedication(localId, data.id);
          return data.id;
        }
      }
      
      return localId;
    } catch (error) {
      console.error('Error adding medication:', error);
      return await localDB.addMedication(medication);
    }
  }

  async updateMedication(id: number, medication: CreateMedication): Promise<void> {
    try {
      // Update local first
      await localDB.updateMedication(id, medication);
      
      if (this.isOnline) {
        const supabaseData = this.toSupabaseMedication(medication);
        const { error } = await supabase
          .from('medications')
          .update(supabaseData)
          .eq('local_id', id); // Use local_id to find the record

        if (error) {
          console.warn('Supabase update failed, keeping local only:', error);
        }
      }
    } catch (error) {
      console.error('Error updating medication:', error);
      throw error;
    }
  }

  async deleteMedication(id: number): Promise<void> {
    try {
      // Soft delete in Supabase, hard delete locally
      if (this.isOnline) {
        const { error } = await supabase
          .from('medications')
          .update({ deleted_at: new Date().toISOString() })
          .eq('local_id', id);

        if (error) {
          console.warn('Supabase delete failed, deleting locally only:', error);
        }
      }
      
      await localDB.deleteMedication(id);
    } catch (error) {
      console.error('Error deleting medication:', error);
      throw error;
    }
  }

  async updateMedicationStatus(id: number, status: Medication['status']): Promise<void> {
    try {
      await localDB.updateMedicationStatus(id, status);
      
      if (this.isOnline) {
        const { error } = await supabase
          .from('medications')
          .update({ status })
          .eq('local_id', id);

        if (error) {
          console.warn('Supabase status update failed:', error);
        }
      }
    } catch (error) {
      console.error('Error updating medication status:', error);
      throw error;
    }
  }

  // ===== APPOINTMENT METHODS =====
  async getAppointments(): Promise<Appointment[]> {
    try {
      if (this.isOnline) {
        const { data, error } = await supabase
          .from('appointments')
          .select('*')
          .is('deleted_at', null)
          .order('date');
        
        if (!error && data) {
          return this.normalizeAppointments(data);
        }
      }
      
      return await localDB.getAppointments();
    } catch (error) {
      console.error('Error fetching appointments:', error);
      return await localDB.getAppointments();
    }
  }
   async addAppointment(appointmentData: CreateAppointment & { patient_id?: string, doctor_id?: string }) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('appointments')
      .insert([{
        patient_id: appointmentData.patient_id || user.id,
        doctor_id: appointmentData.doctor_id,
        appointment_date: `${appointmentData.date}T${appointmentData.time}:00`,
        status: 'scheduled',
        notes: appointmentData.notes || `Appointment for: ${appointmentData.title}`,
        // Store additional metadata in notes or create separate columns if needed
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateAppointment(id: string, appointmentData: Partial<CreateAppointment>) {
    const updateData: any = {};
    
    if (appointmentData.date && appointmentData.time) {
      updateData.appointment_date = `${appointmentData.date}T${appointmentData.time}:00`;
    }
    if (appointmentData.notes) {
      updateData.notes = appointmentData.notes;
    }
    if (appointmentData.title) {
      // Store title in notes or add a title column to your table
      updateData.notes = `${appointmentData.title} - ${appointmentData.notes || ''}`;
    }

    const { data, error } = await supabase
      .from('appointments')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getPatientAppointments(patientId?: string) {
    const { data: { user } } = await supabase.auth.getUser();
    const userId = patientId || user?.id;
    
    if (!userId) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('appointments')
      .select(`
        *,
        doctors:doctor_id (full_name, email),
        patients:patient_id (full_name, email)
      `)
      .eq('patient_id', userId)
      .order('appointment_date', { ascending: true });

    if (error) throw error;
    return data;
  }

  async getDoctorAppointments(doctorId?: string) {
    const { data: { user } } = await supabase.auth.getUser();
    const userId = doctorId || user?.id;
    
    if (!userId) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('appointments')
      .select(`
        *,
        patients:patient_id (full_name, email)
      `)
      .eq('doctor_id', userId)
      .order('appointment_date', { ascending: true });

    if (error) throw error;
    return data;
  }
  async deleteAppointment(id: number): Promise<void> {
    try {
      if (this.isOnline) {
        const { error } = await supabase
          .from('appointments')
          .update({ deleted_at: new Date().toISOString() })
          .eq('local_id', id);

        if (error) {
          console.warn('Supabase appointment delete failed:', error);
        }
      }
      
      await localDB.deleteAppointment(id);
    } catch (error) {
      console.error('Error deleting appointment:', error);
      throw error;
    }
  }

  // ===== LOG METHODS =====
  async addLogEntry(log: CreateLogEntry): Promise<number> {
    try {
      const localId = await localDB.addLogEntry(log);
      
      if (this.isOnline) {
        const supabaseData = this.toSupabaseLog(log);
        const { error } = await supabase
          .from('medication_logs')
          .insert(supabaseData);

        if (error) {
          console.warn('Supabase log insert failed:', error);
        }
      }
      
      return localId;
    } catch (error) {
      console.error('Error adding log entry:', error);
      return await localDB.addLogEntry(log);
    }
  }

  async getLogs(limit = 100): Promise<LogEntry[]> {
    try {
      if (this.isOnline) {
        const { data, error } = await supabase
          .from('medication_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(limit);
        
        if (!error && data) {
          return this.normalizeLogs(data);
        }
      }
      
      return await localDB.getLogs(limit);
    } catch (error) {
      console.error('Error fetching logs:', error);
      return await localDB.getLogs(limit);
    }
  }

  // ===== SYNC METHODS =====
  async syncAllData(): Promise<void> {
    if (!this.isOnline) {
      console.log('Offline - skipping sync');
      return;
    }

    try {
      console.log('Starting data sync...');
      await this.syncMedications();
      await this.syncAppointments();
      await this.syncRefills();
      await this.syncLogs();
      console.log('Data sync completed');
    } catch (error) {
      console.error('Background sync failed:', error);
    }
  }

  async syncMedications(): Promise<void> {
    try {
      // Get local medications that need sync
      const localMeds = await localDB.getMedications();
      
      for (const med of localMeds) {
        if (!med.synced_at) { // Add synced_at field to track sync status
          await this.addMedication(med as CreateMedication);
        }
      }
    } catch (error) {
      console.error('Medication sync failed:', error);
    }
  }

  async syncAppointments(): Promise<void> {
    try {
      const localAppointments = await localDB.getAppointments();
      
      for (const appointment of localAppointments) {
        if (!appointment.synced_at) {
          await this.addAppointment(appointment as CreateAppointment);
        }
      }
    } catch (error) {
      console.error('Appointment sync failed:', error);
    }
  }

  async syncLogs(): Promise<void> {
    try {
      const localLogs = await localDB.getLogs(1000); // Get more logs for sync
      
      for (const log of localLogs) {
        if (!log.synced_at) {
          await this.addLogEntry(log as CreateLogEntry);
        }
      }
    } catch (error) {
      console.error('Log sync failed:', error);
    }
  }

  async getRefills(): Promise<Refill[]> {
  try {
    if (this.isOnline) {
      const { data, error } = await supabase
        .from("refills")
        .select("*")
        .is("deleted_at", null)
        .order("lastRefillDate", { ascending: false });
      
      if (!error && data) {
        const normalized = this.normalizeRefills(data);
        return normalized;
      }
    }
    return await getLowSupplyMedications().then(res => res.map(r => r.refill));
  } catch (error) {
    console.error("Error fetching refills:", error);
    return await getLowSupplyMedications().then(res => res.map(r => r.refill));
  }
}


async addRefill(refill: CreateRefill): Promise<number> {
  try {
    const localId = await addRefill(refill);

    if (this.isOnline) {
      const supabaseData = this.toSupabaseRefill(refill);
      const { data, error } = await supabase
        .from("refills")
        .insert(supabaseData)
        .select()
        .single();

      if (!error && data) {
        await this.syncLocalRefill(localId, data.id);
        return data.id;
      }
    }
    return localId;
  } catch (error) {
    console.error("Error adding refill:", error);
    return await addRefill(refill);
  }
}

async updateRefill(id: number, refill: CreateRefill): Promise<void> {
  try {
    await addRefill(refill); // local overwrite or patch

    if (this.isOnline) {
      const supabaseData = this.toSupabaseRefill(refill);
      const { error } = await supabase
        .from("refills")
        .update(supabaseData)
        .eq("local_id", id);

      if (error) console.warn("Supabase refill update failed:", error);
    }
  } catch (error) {
    console.error("Error updating refill:", error);
    throw error;
  }
}


async syncRefills(): Promise<void> {
  try {
    const localRefills = await getLowSupplyMedications().then(res => res.map(r => r.refill));

    for (const refill of localRefills) {
      if (!refill.synced_at) {
        await this.addRefill(refill as CreateRefill);
      }
    }
  } catch (error) {
    console.error("Refill sync failed:", error);
  }
}








  // ===== DATA TRANSFORMATION METHODS =====
  private normalizeMedications(data: any[]): Medication[] {
    return data.map(item => ({
      id: item.local_id || parseInt(item.id), // Use local_id if available
      name: item.name,
      dosage: item.dosage,
      time: item.time,
      enabled: item.enabled ?? true,
      status: item.status || 'active',
      repeatType: item.repeat_type || 'daily',
      weekday: item.weekday,
      day: item.day,
      supplyInfo: item.supply_total_quantity ? {
        totalQuantity: item.supply_total_quantity,
        units: item.supply_units,
        dosagePerUse: item.supply_dosage_per_use,
      } : undefined,
      createdAt: item.created_at,
      synced_at: item.updated_at, // Track sync status
    }));
  }

  private normalizeAppointments(data: any[]): Appointment[] {
    return data.map(item => ({
      id: item.local_id || parseInt(item.id),
      title: item.title,
      type: item.type,
      date: item.date,
      time: item.time,
      location: item.location,
      doctorName: item.doctor_name,
      notes: item.notes,
      reminderMinutes: Array.isArray(item.reminder_minutes) 
        ? item.reminder_minutes 
        : JSON.parse(item.reminder_minutes || '[]'),
      isCompleted: item.is_completed ?? false,
      createdAt: item.created_at,
      synced_at: item.updated_at,
    }));
  }

  private normalizeLogs(data: any[]): LogEntry[] {
    return data.map(item => ({
      id: item.id,
      medicationId: item.medication_id ? parseInt(item.medication_id) : item.medication_id,
      medicationName: item.medication_name,
      status: item.status,
      scheduledTime: item.scheduled_time,
      actualTime: item.actual_time,
      dosage: item.dosage,
      snoozeMinutes: item.snooze_minutes,
      createdAt: item.created_at,
    }));
  }

  private toSupabaseMedication(med: CreateMedication): any {
    return {
      local_id: (med as any).id, // Temporary local ID
      name: med.name,
      dosage: med.dosage,
      time: med.time,
      enabled: med.enabled,
      status: med.status,
      repeat_type: med.repeatType,
      weekday: med.weekday,
      day: med.day,
      supply_total_quantity: med.supplyInfo?.totalQuantity,
      supply_units: med.supplyInfo?.units,
      supply_dosage_per_use: med.supplyInfo?.dosagePerUse,
    };
  }

  private toSupabaseAppointment(appt: CreateAppointment): any {
    return {
      local_id: (appt as any).id,
      title: appt.title,
      type: appt.type,
      date: appt.date,
      time: appt.time,
      location: appt.location,
      doctor_name: appt.doctorName,
      notes: appt.notes,
      reminder_minutes: appt.reminderMinutes,
      is_completed: appt.isCompleted,
    };
  }

  private toSupabaseLog(log: CreateLogEntry): any {
    return {
      medication_id: log.medicationId,
      medication_name: log.medicationName,
      status: log.status,
      scheduled_time: log.scheduledTime,
      actual_time: log.actualTime,
      dosage: log.dosage,
      snooze_minutes: (log as any).snoozeMinutes,
    };
  }

  // ===== SYNC HELPER METHODS =====
  private async syncLocalMedication(localId: number, serverId: string): Promise<void> {
    // In a real implementation, you'd update the local record
    // to store the server ID and mark as synced
    console.log(`Synced medication: local=${localId}, server=${serverId}`);
  }

  private async syncLocalAppointment(localId: number, serverId: string): Promise<void> {
    console.log(`Synced appointment: local=${localId}, server=${serverId}`);
  }


  private normalizeRefills(data: any[]): Refill[] {
  return data.map(item => ({
    id: item.id,
    medicationId: item.medication_id,
    initialSupply: item.initial_supply,
    currentSupply: item.current_supply,
    dosagePerUse: item.dosage_per_use,
    refillThreshold: item.refill_threshold,
    refillQuantity: item.refill_quantity,
    lastRefillDate: item.last_refill_date,
    nextRefillDate: item.next_refill_date,
    isActive: item.is_active,
    synced_at: item.updated_at,
    createdAt: item.created_at,
    updatedAt: item.updated_at,
  }));
}

private toSupabaseRefill(refill: CreateRefill): any {
  return {
    local_id: (refill as any).id,
    medication_id: refill.medicationId,
    initial_supply: refill.initialSupply,
    current_supply: refill.currentSupply,
    dosage_per_use: refill.dosagePerUse,
    refill_threshold: refill.refillThreshold,
    refill_quantity: refill.refillQuantity,
    last_refill_date: refill.lastRefillDate,
    next_refill_date: refill.nextRefillDate,
    is_active: refill.isActive,
  };
}

private async syncLocalRefill(localId: number, serverId: string): Promise<void> {
  console.log(`Synced refill: local=${localId}, server=${serverId}`);
}


  // ===== UTILITY METHODS =====
  getOnlineStatus(): boolean {
    return this.isOnline;
  }

  async forceSync(): Promise<void> {
    console.log('Manual sync triggered');
    await this.syncAllData();
  }


}

export const dataService = new DataService();