import { Medication } from "../../models/Medication";
import { LogStatus } from "../../models/LogEntry";
import { ComplianceAction } from "../ComplianceTracker";
import { ComplianceInsights } from "./ComplianceInsightsCalculator";

export type StatusConfig = {
  label: string;
  color: string;
  icon: string;
  bgColor: string;
};

export class MedicationStatusService {
  static getEffectiveStatus(
    medication: Medication,
    insights?: ComplianceInsights
  ): LogStatus {
    if (insights?.lastAction && insights.lastActionTime) {
      const actionMap: Record<ComplianceAction, LogStatus> = {
        taken: "taken",
        missed: "missed",
        snoozed: "snoozed",
        skipped: "skipped",
        late: "late",
      };

      const lastActionDate = new Date(insights.lastActionTime);
      const today = new Date();

      if (lastActionDate.toDateString() === today.toDateString()) {
        return actionMap[insights.lastAction] ?? medication.status ?? "active";
      }
    }

    return medication.status ?? (medication.enabled ? "active" : "paused");
  }

  static getStatusConfig(status: LogStatus): StatusConfig {
    const configs: Record<LogStatus, StatusConfig> = {
      taken: { label: "Taken", color: "#4CAF50", icon: "checkmark-circle", bgColor: "#E8F5E8" },
      missed: { label: "Missed", color: "#FF3B30", icon: "close-circle", bgColor: "#FFEBEE" },
      snoozed: { label: "Snoozed", color: "#FF9800", icon: "time", bgColor: "#FFF3E0" },
      skipped: { label: "Skipped", color: "#9E9E9E", icon: "ban", bgColor: "#FAFAFA" },
      late: { label: "Late", color: "#FF6B35", icon: "alert-circle", bgColor: "#FFF3E0" },
      rescheduled: { label: "Rescheduled", color: "#9C27B0", icon: "calendar", bgColor: "#F3E5F5" },
      active: { label: "Active", color: "#4361EE", icon: "play-circle", bgColor: "#EEF2FF" },
      paused: { label: "Paused", color: "#666", icon: "pause-circle", bgColor: "#F5F5F5" },
      // Add the missing statuses
      refilled: { label: "Refilled", color: "#10B981", icon: "refresh-circle", bgColor: "#D1FAE5" },
      attended: { label: "Attended", color: "#8B5CF6", icon: "checkmark-done-circle", bgColor: "#EDE9FE" },
      missedAttendance: { label: "Missed Appointment", color: "#DC2626", icon: "calendar-clear", bgColor: "#FEE2E2" },
    };

    return configs[status] ?? configs.paused;
  }

  static isDateToday(dateString?: string): boolean {
    if (!dateString) return false;
    return new Date(dateString).toDateString() === new Date().toDateString();
  }
}