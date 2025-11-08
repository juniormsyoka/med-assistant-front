// utils/medicationUtils.ts
import { Medication } from "../models/Medication";

export function isMedicationDue(med: Medication): boolean {
  if (!med.enabled) return false;
  //if (["taken", "missed", "skipped", "rescheduled"].includes(med.status as string)) return false;

  const now = new Date();
  const [hours, minutes] = med.time.split(":").map(Number);
  const medTime = new Date();
  medTime.setHours(hours, minutes, 0, 0);

  if (med.repeatType === "weekly" && med.weekday !== now.getDay() + 1) return false;
  if (med.repeatType === "monthly" && med.day !== now.getDate()) return false;

  return Math.abs(now.getTime() - medTime.getTime()) <= 5 * 60 * 1000;
}
