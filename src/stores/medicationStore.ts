// stores/medicationStore.ts - Fully Reactive Version
import { create } from 'zustand';
import { Medication } from '../models/Medication';
import { LogStatus } from '../models/LogEntry';
import * as Notifications from 'expo-notifications';
import {
  getMedications,
  deleteMedication,
  addLogEntry,
  updateMedicationStatus as updateMedicationStatusDB
} from '../Services/storage';
import {
  NotificationService
} from '../Services/notifications';
import { MedicationActionService } from '../Services/centalizedMedicalStatus/MedicationActionService';
import { updateRefillSupply } from '../Services/storage';
import { ComplianceTracker } from '../Services/ComplianceTracker';

// ------------------------------
// Type-safe Actions
// ------------------------------
type MedicationAction =
  | { type: 'take'; medication: Medication }
  | { type: 'miss'; medication: Medication }
  | { type: 'snooze'; medication: Medication; data: { minutes: number } }
  | { type: 'delete'; medication: Medication }
  | { type: 'reminder'; medication: Medication }
  | { type: 'refill'; medication: Medication; quantity: number };

interface ScheduledNotification {
  medicationId: string;
  scheduledTime: Date;
  type: 'medication' | 'snooze';
}

// Type for allowed medication status (matching Medication model)
type AllowedMedicationStatus = 
  | "taken" 
  | "missed" 
  | "snoozed" 
  | "skipped" 
  | "late" 
  | "rescheduled" 
  | "active" 
  | "paused" 
  | undefined;

// ------------------------------
// Store State
// ------------------------------
interface MedicationState {
  medications: Medication[];
  loading: boolean;
  error: string | null;
  refreshing: boolean;

  reminderVisible: boolean;
  deleteVisible: boolean;
  activeMedication: Medication | null;
  medicationToDelete: Medication | null;

  scheduledNotifications: ScheduledNotification[];
  dueMedications: Medication[];

  refresh: () => Promise<void>;
  handleAction: (action: MedicationAction) => Promise<void>;
  closeReminderModal: () => void;
  confirmDelete: () => Promise<void>;
  cancelDelete: () => void;
  clearError: () => void;
  updateMedicationStatus: (medicationId: number, status: AllowedMedicationStatus) => Promise<boolean>;

  scheduleMedicationReminder: (medication: Medication) => Promise<void>;
  cancelMedicationNotification: (medicationId: string) => Promise<void>;
  rescheduleAllMedications: () => Promise<void>;

  getComplianceInsights: (medicationId: number) => Promise<{
    complianceRate: number;
    avgResponseTime?: number;
    mostEffectiveOffset?: number;
    totalRecords: number;
  }>;
}

// ------------------------------
// Create Store
// ------------------------------
export const useMedicationStore = create<MedicationState>((set, get) => {

  // ------------------------------
  // Helper: Update dueMedications based on active scheduled notifications
  // ------------------------------
  const updateDueMedications = async () => {
    const allNotifications = await Notifications.getAllScheduledNotificationsAsync();
    const now = new Date();

    const dueMedIds = allNotifications
      .filter(n => n.content.data?.type === 'medication' || n.content.data?.type === 'snooze')
      .filter(n => (n.trigger as any)?.date && new Date((n.trigger as any)?.date) <= now)
      .map(n => n.content.data?.medicationId);

    set(state => ({
      dueMedications: state.medications.filter(m => m.id && dueMedIds.includes(m.id.toString()))
    }));
  };

  // ------------------------------
  // Helper: Convert LogStatus to allowed medication status
  // ------------------------------
  const convertToAllowedStatus = (status: LogStatus): AllowedMedicationStatus => {
    const statusMap: Record<string, AllowedMedicationStatus> = {
      "taken": "taken",
      "missed": "missed",
      "snoozed": "snoozed",
      "skipped": "skipped",
      "late": "late",
      "rescheduled": "rescheduled",
      "active": "active",
      "paused": "paused",
      "refilled": "taken",
      "attended": "taken",
      "missedAttendance": "missed",
    };
    
    return statusMap[status] || "active";
  };

  // ------------------------------
  // Initialize Notification Listener
  // ------------------------------
  Notifications.addNotificationResponseReceivedListener(async (response) => {
    const medId = response.notification.request.content.data.medicationId;
    const medication = get().medications.find(m => m.id?.toString() === medId);
    if (medication) {
      set({ activeMedication: medication, reminderVisible: true });
    }
    await updateDueMedications();
  });

  Notifications.addNotificationReceivedListener((notification) => {
    const medId = notification.request.content.data.medicationId;
    const medication = get().medications.find(m => m.id?.toString() === medId);
    if (medication) {
      set({ activeMedication: medication, reminderVisible: true });
    }
  });

  // ------------------------------
  return {
    medications: [],
    loading: false,
    error: null,
    refreshing: false,
    reminderVisible: false,
    deleteVisible: false,
    activeMedication: null,
    medicationToDelete: null,
    scheduledNotifications: [],
    dueMedications: [],

    // ------------------------------
    refresh: async () => {
      try {
        set({ refreshing: true, error: null });
        const fetched = await getMedications();
        set({ medications: fetched, refreshing: false });

        await get().rescheduleAllMedications();
        await updateDueMedications();
      } catch (err) {
        set({ error: "Failed to load medications", refreshing: false });
      }
    },

    // ------------------------------
    handleAction: async (action: MedicationAction) => {
      try {
        const { medication } = action;
        
        switch (action.type) {
          case 'delete':
            set({ medicationToDelete: medication, deleteVisible: true });
            break;

          case 'take':
          case 'miss':
          case 'snooze':
          case 'refill': {
            // Delegate to MedicationActionService
            const result = await MedicationActionService.handleAction(
              medication,
              action.type,
              action.type === 'snooze' ? { minutes: action.data?.minutes } : 
              action.type === 'refill' ? { quantity: action.quantity } : {}
            );

            if (result.success) {
              // Convert LogStatus to allowed medication status
              const allowedStatus = convertToAllowedStatus(result.status);
              
              // Update local state
              set(state => ({
                ...state,
                medications: state.medications.map(m =>
                  m.id === medication.id ? { 
                    ...m, 
                    status: allowedStatus,
                    nextReminderAt: result.nextReminderAt || m.nextReminderAt
                  } : m
                ),
                reminderVisible: false,
                activeMedication: null
              }));
            } else {
              set(state => ({
                ...state,
                error: result.message || `Failed to ${action.type} medication`
              }));
            }
            break;
          }

          case 'reminder':
            set({ activeMedication: medication, reminderVisible: true });
            break;
        }

        await updateDueMedications();
      } catch (err) {
        console.error('⚠️ handleAction failed:', err);
        set(state => ({ ...state, error: `Failed to ${action.type} medication` }));
      }
    },

    // ------------------------------
    scheduleMedicationReminder: async (medication: Medication) => {
      try {
        await NotificationService.scheduleMedicationReminder(medication);
        
        // Compliance tracking
        try {
          let targetTime = new Date();
          if (medication.time.includes('T')) {
            targetTime = new Date(medication.time);
          } else {
            const [hours, minutes] = medication.time.split(':').map(Number);
            targetTime.setHours(hours, minutes, 0, 0);
          }
          
          await ComplianceTracker.recordReminderScheduled(
            medication.id!,
            medication.name,
            targetTime,
            medication.reminderMinutes || [60, 30, 5]
          );
        } catch (trackingError) {
          console.warn('⚠️ Failed to track reminder schedule:', trackingError);
        }
        
        await updateDueMedications();
      } catch (err) {
        console.error('❌ Failed to schedule reminder:', err);
      }
    },

    // ------------------------------
    cancelMedicationNotification: async (medicationId: string) => {
      try {
        await NotificationService.cancelMedicationReminders(medicationId);
        await updateDueMedications();
      } catch (err) {
        console.error('❌ Failed to cancel reminders:', err);
      }
    },

    // ------------------------------
    rescheduleAllMedications: async () => {
      try {
        const { medications } = get();
        await NotificationService.rescheduleAllMedications(medications);
        
        // Compliance tracking for all medications
        for (const med of medications) {
          if (med.enabled) {
            try {
              let targetTime = new Date();
              if (med.time.includes('T')) {
                targetTime = new Date(med.time);
              } else {
                const [hours, minutes] = med.time.split(':').map(Number);
                targetTime.setHours(hours, minutes, 0, 0);
              }
              
              await ComplianceTracker.recordReminderScheduled(
                med.id!,
                med.name,
                targetTime,
                med.reminderMinutes || [60, 30, 5]
              );
            } catch (error) {
              console.warn(`⚠️ Failed to track schedule for ${med.name}:`, error);
            }
          }
        }
        
        await updateDueMedications();
      } catch (err) {
        console.error('❌ Failed to reschedule medications:', err);
      }
    },

    // ------------------------------
    closeReminderModal: () => set(state => ({ 
      ...state, 
      reminderVisible: false, 
      activeMedication: null 
    })),

    // ------------------------------
    confirmDelete: async () => {
      const { medicationToDelete, medications } = get();
      if (!medicationToDelete) return;

      try {
        await get().cancelMedicationNotification(medicationToDelete.id!.toString());
        await deleteMedication(medicationToDelete.id!);

        set(state => ({
          ...state,
          medications: state.medications.filter(m => m.id !== medicationToDelete.id),
          deleteVisible: false,
          medicationToDelete: null,
        }));

        await updateDueMedications();
      } catch (err) {
        console.error('❌ Failed to delete medication:', err);
        set(state => ({ ...state, error: 'Failed to delete medication' }));
      }
    },

    // ------------------------------
    cancelDelete: () => set(state => ({ 
      ...state, 
      deleteVisible: false, 
      medicationToDelete: null 
    })),

    // ------------------------------
    clearError: () => set(state => ({ ...state, error: null })),

    // ------------------------------
    updateMedicationStatus: async (medicationId, status) => {
      try {
        await updateMedicationStatusDB(medicationId, status);
        set(state => ({
          ...state,
          medications: state.medications.map(m =>
            m.id === medicationId ? { ...m, status } : m
          ),
        }));
        await updateDueMedications();
        return true;
      } catch (err) {
        console.error('❌ Failed to update medication status:', err);
        set(state => ({ ...state, error: "Failed to update medication status" }));
        return false;
      }
    },

    // ------------------------------
    getComplianceInsights: async (medicationId: number) => {
      try {
        return await ComplianceTracker.getComplianceStats(medicationId);
      } catch (error) {
        console.error('❌ Failed to get compliance insights:', error);
        return {
          complianceRate: 0,
          totalRecords: 0
        };
      }
    },
  };
});