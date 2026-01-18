import { ComplianceAction } from "../ComplianceTracker";

export type ComplianceInsights = {
  takenCount: number;
  missedCount: number;
  snoozedCount: number;
  skippedCount: number;
  lateCount?: number;
  totalRecords: number;
  lastAction?: ComplianceAction;
  lastActionTime?: string;
  compliancePercentage?: number | null;
  complianceRate?: number; // Add this property
};

export class ComplianceInsightsCalculator {
  static calculate(records: any[]): ComplianceInsights {
    const takenCount = records.filter(r => r.actualAction === "taken").length;
    const missedCount = records.filter(r => r.actualAction === "missed").length;
    const snoozedCount = records.filter(r => r.actualAction === "snoozed").length;
    const skippedCount = records.filter(r => r.actualAction === "skipped").length;
    const lateCount = records.filter(r => r.actualAction === "late").length;

    const totalRecords = records.length;
    const lastRecord = records[records.length - 1];

    const totalActions = takenCount + missedCount + skippedCount;
    const compliancePercentage =
      totalActions > 0 ? Math.round((takenCount / totalActions) * 100) : null;

    return {
      takenCount,
      missedCount,
      snoozedCount,
      skippedCount,
      lateCount,
      totalRecords,
      compliancePercentage,
      complianceRate: compliancePercentage ?? 0, // Add complianceRate
      lastAction: lastRecord?.actualAction,
      lastActionTime: lastRecord?.actionTime,
    };
  }
}