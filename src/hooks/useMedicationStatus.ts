// hooks/useMedicationStatus.ts
import { useMemo } from "react";
import { Medication } from "../models/Medication";
import { ComplianceInsights } from "../Services/centalizedMedicalStatus/ComplianceInsightsCalculator";
import { MedicationStatusService } from "../Services/centalizedMedicalStatus/MedicationStatusService";

// Create a type for medication-specific statuses
export type MedicationStatus = 
  | "taken"
  | "missed"
  | "snoozed"
  | "skipped"
  | "late"
  | "rescheduled"
  | "active"
  | "paused"
  | "refilled";

export interface MedWithStatus extends Medication {
  computedStatus: MedicationStatus;
  statusConfig: {
    label: string;
    color: string;
    icon: string;
    bgColor: string;
  };
  compliance?: ComplianceInsights;
  isDue?: boolean;
}

export interface UseMedicationStatusResult {
  medsWithStatus: MedWithStatus[];
  stats: {
    total: number;
    taken: number;
    missed: number;
    snoozed: number;
    skipped: number;
    late: number;
    rescheduled: number;
    refilled?: number;
    active: number;
    paused: number;
    due: number;
    avgComplianceRate?: number;
    medicationsWithData?: number;
    totalComplianceRecords?: number;
    totalComplianceActions?: number;
  };
  isLoading: boolean;
}

export function useMedicationStatus(
  medications: Medication[],
  complianceInsightsMap?: Record<number, ComplianceInsights>,
  isLoading: boolean = false
): UseMedicationStatusResult {
  return useMemo(() => {
    if (isLoading || medications.length === 0) {
      return {
        medsWithStatus: [],
        stats: {
          total: 0,
          taken: 0,
          missed: 0,
          snoozed: 0,
          skipped: 0,
          late: 0,
          rescheduled: 0,
          refilled: 0,
          active: 0,
          paused: 0,
          due: 0,
        },
        isLoading
      };
    }

    const medsWithStatus: MedWithStatus[] = medications.map(med => {
      const insights = med.id && complianceInsightsMap 
        ? complianceInsightsMap[med.id] 
        : undefined;
      
      // Get effective status from centralized service
      const effectiveStatus = MedicationStatusService.getEffectiveStatus(med, insights);
      
      // Ensure it's a valid medication status
      const allowedStatuses: MedicationStatus[] = [
        "taken", "missed", "snoozed", "skipped", "late", 
        "rescheduled", "active", "paused", "refilled"
      ];
      
      const computedStatus = allowedStatuses.includes(effectiveStatus as MedicationStatus)
        ? effectiveStatus as MedicationStatus
        : (med.enabled ? "active" : "paused");
      
      // Get status configuration
      const statusConfig = MedicationStatusService.getStatusConfig(computedStatus);
      
      // Check if medication is due (boolean only, no empty string)
      const isDue = Boolean(
        med.enabled && 
        computedStatus === "active" && 
        med.nextReminderAt && 
        new Date(med.nextReminderAt) <= new Date()
      );
      
      return { 
        ...med, 
        computedStatus,
        statusConfig,
        compliance: insights,
        isDue
      } as MedWithStatus; // Explicit cast to fix type issues
    });

    // Compute comprehensive stats
    const stats = medsWithStatus.reduce((acc, med) => {
      acc.total += 1;
      
      // Status counts
      switch (med.computedStatus) {
        case "taken": acc.taken += 1; break;
        case "missed": acc.missed += 1; break;
        case "snoozed": acc.snoozed += 1; break;
        case "skipped": acc.skipped += 1; break;
        case "late": acc.late += 1; break;
        case "rescheduled": acc.rescheduled += 1; break;
        case "refilled": acc.refilled = (acc.refilled || 0) + 1; break;
        case "active": acc.active += 1; break;
        case "paused": acc.paused += 1; break;
      }
      
      // Due count
      if (med.isDue) acc.due += 1;
      
      // Compliance data aggregation
      if (med.compliance?.totalRecords && med.compliance.totalRecords > 0) {
        acc.totalComplianceRecords = (acc.totalComplianceRecords || 0) + med.compliance.totalRecords;
        acc.totalComplianceActions = (acc.totalComplianceActions || 0) + 
          (med.compliance.takenCount || 0) + 
          (med.compliance.missedCount || 0) + 
          (med.compliance.snoozedCount || 0) + 
          (med.compliance.skippedCount || 0);
      }
      
      return acc;
    }, {
      total: 0,
      taken: 0,
      missed: 0,
      snoozed: 0,
      skipped: 0,
      late: 0,
      rescheduled: 0,
      refilled: 0,
      active: 0,
      paused: 0,
      due: 0,
      avgComplianceRate: 0,
      medicationsWithData: 0,
      totalComplianceRecords: 0,
      totalComplianceActions: 0
    } as UseMedicationStatusResult["stats"]);

    // Calculate average compliance rate
    const medsWithCompliance = medsWithStatus.filter(m => 
      (m.compliance?.complianceRate !== undefined || m.compliance?.compliancePercentage !== undefined) && 
      (m.compliance?.totalRecords || 0) > 0
    );
    
    if (medsWithCompliance.length > 0) {
      const totalCompliance = medsWithCompliance.reduce(
        (sum, m) => sum + (m.compliance!.complianceRate || m.compliance!.compliancePercentage || 0), 
        0
      );
      stats.avgComplianceRate = Math.round(totalCompliance / medsWithCompliance.length);
      stats.medicationsWithData = medsWithCompliance.length;
    }

    return { 
      medsWithStatus, 
      stats,
      isLoading: false
    };
  }, [medications, complianceInsightsMap, isLoading]);
}