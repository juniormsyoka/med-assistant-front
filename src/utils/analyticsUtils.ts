import { LogEntry, LogStatus } from "../models/LogEntry";

export const predictMissProbability = (log: LogEntry): number => {
  let probability = 0.2;
  const hour = new Date(log.scheduledTime).getHours();
  const isEvening = hour >= 18;
  const isWeekend = [0, 6].includes(new Date(log.scheduledTime).getDay());

  if (isEvening) probability += 0.3;
  if (isWeekend) probability += 0.2;
  if (log.medicationName?.toLowerCase().includes("antibiotic")) probability += 0.1;

  return Math.min(probability, 1);
};

export const getStatusColor = (status: LogStatus) => {
  switch (status) {
    case "taken": return "#4CAF50";
    case "missed": return "#FF3B30";
    case "snoozed": return "#FF9800";
    case "skipped": return "#9C27B0";
    case "late": return "#2196F3";
    case "rescheduled": return "#607D8B";
    default: return "#000";
  }
};

export const formatDate = (d: string) => new Date(d).toLocaleDateString();
export const formatTime = (d: string) => new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
