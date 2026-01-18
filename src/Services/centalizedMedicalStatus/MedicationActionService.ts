// src/Services/centralizedMedicalStatus/MedicationActionService.ts
import { Medication } from "../../models/Medication";
import { LogStatus } from "../../models/LogEntry";
import { NotificationService } from "../notifications";
import { ComplianceTracker } from "../ComplianceTracker";
import { 
  addLogEntry, 
  updateMedicationStatus as updateMedicationStatusDB
} from "../storage";
import { MedicationActionResult } from "../../types/medicalStatus";
import { useMedicationStore } from "../../stores/medicationStore";

export type MedicationActionType = "take" | "miss" | "snooze" | "skip" | "enable" | "disable" | "refill" | "reschedule";

export interface ActionContext {
  minutes?: number; // For snooze
  newTime?: string; // For reschedule
  quantity?: number; // For refill
  note?: string; // Optional note for logging
}

// Define a type for allowed medication statuses (exclude appointment-related ones)
type AllowedMedicationStatus = 
  | "taken" 
  | "missed" 
  | "snoozed" 
  | "skipped" 
  | "late" 
  | "rescheduled" 
  | "active" 
  | "paused" 
  | "refilled";

export class MedicationActionService {
  // Main entry point for all medication actions
  static async handleAction(
    medication: Medication,
    actionType: MedicationActionType,
    context: ActionContext = {}
  ): Promise<MedicationActionResult> {
    try {
      const medId = medication.id;
      if (!medId) {
        throw new Error("Medication ID is required");
      }

      console.log(`🎯 Action Service: ${actionType} for ${medication.name}`);

      // Step 1: Cancel existing notifications if needed
      if (actionType === "take" || actionType === "miss" || actionType === "snooze" || actionType === "skip") {
        await this.cancelNotifications(medId.toString());
      }

      // Step 2: Update medication status in DB
      const newStatus = this.getStatusForAction(actionType);
      // Convert LogStatus to allowed medication status
      const allowedStatus = this.convertToAllowedStatus(newStatus);
      await updateMedicationStatusDB(medId, allowedStatus);

      // Step 3: Record compliance data
      await this.recordComplianceAction(medication, actionType, context);

      // Step 4: Log the action
      await this.createLogEntry(medication, actionType, newStatus, context);

      // Step 5: Handle action-specific side effects
      await this.handleActionSpecificSideEffects(medication, actionType, context);

      // Step 6: Schedule new notifications if needed
      const nextReminderAt = await this.handleNotificationScheduling(medication, actionType, context);

      // Step 7: Trigger store refresh
      await this.triggerStoreRefresh();

      // Step 8: Return structured result
      return {
        success: true,
        status: newStatus,
        medicationId: medId,
        nextReminderAt,
        message: this.getSuccessMessage(actionType, medication.name),
        timestamp: new Date().toISOString(),
        actionType
      } as MedicationActionResult;

    } catch (error) {
      console.error(`❌ Action Service failed for ${actionType}:`, error);
      
      // Attempt to rollback if possible
      await this.attemptRollback(medication, actionType);
      
      return {
        success: false,
        status: (medication.status || "active") as LogStatus,
        medicationId: medication.id || -1,
        message: `Failed to ${actionType}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date().toISOString(),
        actionType
      } as MedicationActionResult;
    }
  }

  // Private helper methods
  private static async cancelNotifications(medicationId: string): Promise<void> {
    try {
      await NotificationService.cancelMedicationReminders(medicationId);
    } catch (error) {
      console.warn(`⚠️ Failed to cancel notifications for ${medicationId}:`, error);
      // Continue anyway - this is not critical
    }
  }

  private static getStatusForAction(actionType: MedicationActionType): LogStatus {
    const statusMap: Record<MedicationActionType, LogStatus> = {
      take: "taken",
      miss: "missed",
      snooze: "snoozed",
      skip: "skipped",
      enable: "active",
      disable: "paused",
      refill: "refilled",
      reschedule: "active"
    };
    return statusMap[actionType] || "active";
  }

  // Convert LogStatus to allowed medication status for DB update
// Replace the convertToAllowedStatus method with this:
private static convertToAllowedStatus(status: LogStatus): 
  "taken" | "missed" | "snoozed" | "skipped" | "late" | "rescheduled" | "active" | "paused" | undefined {
  // Map statuses to those accepted by updateMedicationStatusDB
  const statusMap: Record<string, 
    "taken" | "missed" | "snoozed" | "skipped" | "late" | "rescheduled" | "active" | "paused" | undefined
  > = {
    "taken": "taken",
    "missed": "missed",
    "snoozed": "snoozed",
    "skipped": "skipped",
    "late": "late",
    "rescheduled": "rescheduled",
    "active": "active",
    "paused": "paused",
    "refilled": "taken", // Map refilled to taken for DB purposes
    "attended": "taken",
    "missedAttendance": "missed",
  };
  
  return statusMap[status] || "active";
}
  private static async recordComplianceAction(
    medication: Medication,
    actionType: MedicationActionType,
    context: ActionContext
  ): Promise<void> {
    try {
      const complianceAction = this.mapToComplianceAction(actionType);
      const reminderOffsetUsed = medication.reminderMinutes?.length 
        ? Math.min(...medication.reminderMinutes)
        : 60;

      // Create context object without dosage (since it might not be in the expected type)
      const complianceContext: Record<string, any> = {
        ...context,
        actionType
      };
      
      // Add dosage only if it exists in medication
      if (medication.dosage) {
        complianceContext.dosage = medication.dosage;
      }

      await ComplianceTracker.recordMedicationAction(
        medication.id!,
        medication.name,
        new Date(),
        reminderOffsetUsed,
        complianceAction,
        new Date(),
        complianceContext
      );
    } catch (error) {
      console.warn(`⚠️ Compliance tracking failed:`, error);
      // Non-critical, continue execution
    }
  }

  // Replace the mapToComplianceAction method with this:
private static mapToComplianceAction(actionType: MedicationActionType): 
  "taken" | "missed" | "snoozed" | "skipped" | "late" {
  const map: Record<MedicationActionType, "taken" | "missed" | "snoozed" | "skipped" | "late"> = {
    take: "taken",
    miss: "missed",
    snooze: "snoozed",
    skip: "skipped",
    enable: "taken", // Map enable to taken
    disable: "skipped", // Map disable to skipped
    refill: "taken", // Map refill to taken
    reschedule: "snoozed", // Map reschedule to snoozed
  };
  return map[actionType] || "taken";
}

  private static async createLogEntry(
    medication: Medication,
    actionType: MedicationActionType,
    status: LogStatus,
    context: ActionContext
  ): Promise<void> {
    try {
      await addLogEntry({
        medicationId: medication.id!,
        medicationName: medication.name,
        status,
        scheduledTime: new Date().toISOString(),
        actualTime: new Date().toISOString(),
        dosage: medication.dosage || "",
        snoozeMinutes: actionType === "snooze" ? context.minutes : undefined,
      });
    } catch (error) {
      console.warn(`⚠️ Failed to create log entry:`, error);
    }
  }

  private static async handleActionSpecificSideEffects(
    medication: Medication,
    actionType: MedicationActionType,
    context: ActionContext
  ): Promise<void> {
    switch (actionType) {
      case "snooze":
        if (context.minutes) {
          const newTime = new Date(Date.now() + context.minutes * 60000);
          medication.nextReminderAt = newTime.toISOString();
        }
        break;
      
      case "reschedule":
        if (context.newTime) {
          medication.nextReminderAt = context.newTime;
        }
        break;
      
      case "enable":
        medication.enabled = true;
        break;
      
      case "disable":
        medication.enabled = false;
        break;
      
      case "refill":
        // Refill logic would update supply count
        // This should be handled by your refill service
        break;
    }
  }

  private static async handleNotificationScheduling(
    medication: Medication,
    actionType: MedicationActionType,
    context: ActionContext
  ): Promise<string | undefined> {
    try {
      // Don't schedule for take/miss/skip actions for non-repeating meds
      if (actionType === "take" || actionType === "miss" || actionType === "skip") {
        if (medication.repeatType === "once") {
          return undefined;
        }
        
        // For repeating meds, schedule next dose
        // Check if repeatType is valid for scheduling
        const repeatType = medication.repeatType as any;
        if (medication.enabled && repeatType && repeatType !== "as_needed") {
          await NotificationService.scheduleMedicationReminder(medication);
          return medication.nextReminderAt;
        }
        return undefined;
      }

      // For snooze, schedule notification
      if (actionType === "snooze" && context.minutes) {
        const snoozeMedication = {
          ...medication,
          time: new Date(Date.now() + context.minutes * 60000).toISOString(),
          repeatType: "once" as const // Snooze is one-time
        };
        await NotificationService.scheduleMedicationReminder(snoozeMedication);
        return snoozeMedication.time;
      }

      // For enable/reschedule, schedule normally
      if ((actionType === "enable" || actionType === "reschedule") && medication.enabled) {
        await NotificationService.scheduleMedicationReminder(medication);
        return medication.nextReminderAt;
      }

      return undefined;
    } catch (error) {
      console.warn(`⚠️ Failed to schedule notification:`, error);
      return undefined;
    }
  }

  private static async triggerStoreRefresh(): Promise<void> {
    try {
      // Get the store instance and trigger refresh
      const store = useMedicationStore.getState();
      await store.refresh();
    } catch (error) {
      console.warn(`⚠️ Failed to refresh store:`, error);
    }
  }

  private static getSuccessMessage(actionType: MedicationActionType, medicationName: string): string {
    const messages: Record<MedicationActionType, string> = {
      take: `${medicationName} marked as taken`,
      miss: `${medicationName} marked as missed`,
      snooze: `${medicationName} snoozed`,
      skip: `${medicationName} skipped`,
      enable: `${medicationName} enabled`,
      disable: `${medicationName} disabled`,
      refill: `${medicationName} refilled`,
      reschedule: `${medicationName} rescheduled`
    };
    return messages[actionType] || "Action completed";
  }

  private static async attemptRollback(
    medication: Medication,
    actionType: MedicationActionType
  ): Promise<void> {
    console.log(`🔄 Attempting rollback for ${actionType} on ${medication.name}`);
    
    try {
      // Re-schedule notification if we canceled it
      if (medication.enabled && medication.id) {
        await NotificationService.scheduleMedicationReminder(medication);
      }
    } catch (rollbackError) {
      console.error(`❌ Rollback failed:`, rollbackError);
    }
  }

  // Convenience methods matching your existing API
  static async markTaken(med: Medication): Promise<MedicationActionResult> {
    return this.handleAction(med, "take");
  }

  static async markMissed(med: Medication): Promise<MedicationActionResult> {
    return this.handleAction(med, "miss");
  }

  static async snooze(med: Medication, minutes: number): Promise<MedicationActionResult> {
    return this.handleAction(med, "snooze", { minutes });
  }

  static async skip(med: Medication): Promise<MedicationActionResult> {
    return this.handleAction(med, "skip");
  }

  static async toggleEnabled(med: Medication): Promise<MedicationActionResult> {
    const actionType = med.enabled ? "disable" : "enable";
    return this.handleAction(med, actionType);
  }

  static async reschedule(med: Medication, newTime: string): Promise<MedicationActionResult> {
    return this.handleAction(med, "reschedule", { newTime });
  }

  static async refill(med: Medication, quantity: number): Promise<MedicationActionResult> {
    return this.handleAction(med, "refill", { quantity });
  }
}