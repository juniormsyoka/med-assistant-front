// stores/medicationStore.ts - Fully Reactive Version
import { create } from 'zustand';
import { Medication } from '../models/Medication';
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
import { updateRefillSupply } from '../Services/storage';

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
  dueMedications: Medication[]; // ✅ Medications with pending reminders

  refresh: () => Promise<void>;
  handleAction: (action: MedicationAction) => Promise<void>;
  closeReminderModal: () => void;
  confirmDelete: () => Promise<void>;
  cancelDelete: () => void;
  clearError: () => void;
  updateMedicationStatus: (medicationId: number, status: Medication['status']) => Promise<boolean>;

  scheduleMedicationReminder: (medication: Medication) => Promise<void>;
  cancelMedicationNotification: (medicationId: string) => Promise<void>;
  rescheduleAllMedications: () => Promise<void>;
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
  // Initialize Notification Listener
  // ------------------------------
  Notifications.addNotificationResponseReceivedListener(async (response) => {
    const medId = response.notification.request.content.data.medicationId;
    const medication = get().medications.find(m => m.id?.toString() === medId);
    if (medication) {
      // Open reminder modal automatically
      set({ activeMedication: medication, reminderVisible: true });
    }
    // Refresh dueMedications
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

        // Reschedule all medications to ensure consistency
        await get().rescheduleAllMedications();

        // Update due medications
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
      case 'miss': {
        await get().cancelMedicationNotification(medication.id!.toString());
        const status = action.type === 'take' ? 'taken' : 'missed';

        await get().updateMedicationStatus(medication.id!, status);

        await addLogEntry({
          medicationId: medication.id!,
          medicationName: medication.name,
          status,
          scheduledTime: new Date().toISOString(),
          actualTime: new Date().toISOString(),
          dosage: medication.dosage,
        });

        if (
          medication.repeatType !== 'daily' &&
          medication.repeatType !== 'weekly' &&
          medication.repeatType !== 'monthly'
        ) {
          await get().scheduleMedicationReminder(medication);
        }

        await get().refresh();
        set({ reminderVisible: false, activeMedication: null });
        break;
      }

      case 'snooze': {
        const minutes = action.data?.minutes || 15;
        await get().cancelMedicationNotification(medication.id!.toString());

        await NotificationService.scheduleMedicationReminder({
          ...medication,
          time: new Date(Date.now() + minutes * 60 * 1000).toISOString(),
        });

        await get().updateMedicationStatus(medication.id!, 'snoozed');

        await addLogEntry({
          medicationId: medication.id!,
          medicationName: medication.name,
          status: 'snoozed',
          scheduledTime: new Date().toISOString(),
          actualTime: new Date().toISOString(),
          dosage: medication.dosage,
          snoozeMinutes: minutes,
        });

        await get().refresh();
        set({ reminderVisible: false, activeMedication: null });
        break;
      }

      case 'reminder':
        set({ activeMedication: medication, reminderVisible: true });
        break;

      case 'refill': {
        const quantity = action.quantity || 0;

        // Update supply in storage
        if (medication.id != null) {
          await updateRefillSupply(medication.id, quantity);
        }

        await addLogEntry({
  medicationId: medication.id!,
  medicationName: medication.name,
  status: 'refilled',
  scheduledTime: new Date().toISOString(),
  actualTime: new Date().toISOString(),
  dosage: quantity.toString(), // convert number to string
});


        // Optionally refresh store state
        await get().refresh();

        // Optionally close any active modals
        set({ reminderVisible: false, activeMedication: null });
        break;
      }
    }

    // Update due medications after every action
    await updateDueMedications();
  } catch (err) {
    console.error('⚠️ handleAction failed:', err);
    set({ error: `Failed to ${action.type} medication` });
  }
},


    // ------------------------------
    scheduleMedicationReminder: async (medication: Medication) => {
      try {
        await NotificationService.scheduleMedicationReminder(medication);
        await updateDueMedications();
      } catch (err) {
        console.error('❌ Failed to schedule reminder:', err);
      }
    },

    cancelMedicationNotification: async (medicationId: string) => {
      try {
        await NotificationService.cancelMedicationReminders(medicationId);
        await updateDueMedications();
      } catch (err) {
        console.error('❌ Failed to cancel reminders:', err);
      }
    },

    rescheduleAllMedications: async () => {
      try {
        const { medications } = get();
        await NotificationService.rescheduleAllMedications(medications);
        await updateDueMedications();
      } catch (err) {
        console.error('❌ Failed to reschedule medications:', err);
      }
    },

    closeReminderModal: () => set({ reminderVisible: false, activeMedication: null }),

    confirmDelete: async () => {
      const { medicationToDelete, medications } = get();
      if (!medicationToDelete) return;

      try {
        await get().cancelMedicationNotification(medicationToDelete.id!.toString());
        await deleteMedication(medicationToDelete.id!);

        set({
          medications: medications.filter(m => m.id !== medicationToDelete.id),
          deleteVisible: false,
          medicationToDelete: null,
        });

        await updateDueMedications();
      } catch (err) {
        console.error('❌ Failed to delete medication:', err);
        set({ error: 'Failed to delete medication' });
      }
    },

    cancelDelete: () => set({ deleteVisible: false, medicationToDelete: null }),
    clearError: () => set({ error: null }),

    updateMedicationStatus: async (medicationId, status) => {
      try {
        await updateMedicationStatusDB(medicationId, status);
        set(state => ({
          medications: state.medications.map(m =>
            m.id === medicationId ? { ...m, status } : m
          ),
        }));
        await updateDueMedications();
        return true;
      } catch (err) {
        console.error('❌ Failed to update medication status:', err);
        set({ error: "Failed to update medication status" });
        return false;
      }
    },
  };
});
