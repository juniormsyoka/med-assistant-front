// src/Services/centralizedMedicalStatus/types.ts
import { LogStatus } from "../models/LogEntry";

export interface MedicationActionResult {
  success: boolean;
  status: LogStatus;
  medicationId: number;
  nextReminderAt?: string;
  message?: string;
  timestamp: string;
  actionType: string;
}

export interface ActionMetrics {
  responseTime?: number; // How long user took to respond
  actionAccuracy?: number; // ML feature: how "correct" was this action
  predictedNextTime?: string; // ML prediction for next optimal time
}