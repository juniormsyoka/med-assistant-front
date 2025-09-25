// Constants
export const DEFAULT_LEAD_TIME = 0;
export const HOURS_IN_DAY = 24;
export const MINUTES_IN_HOUR = 60;
export const DEFAULT_SOUND = 'default';

// Notification types
export interface MedicationNotificationData {
  medicationId: string;
  vibration: boolean;
  type: 'medication';
  scheduledTime: string;
  //later on added
   [key: string]: unknown;
}

export interface NotificationPreferences {
  reminderLeadTime: number;
  reminderSound: string;
  vibrationEnabled: boolean;
  inAppAlertsEnabled: boolean;
  soundEnabled: boolean;
  badgeEnabled: boolean;
}

// Error messages
export const ErrorMessages = {
  INVALID_TIME_FORMAT: (time: string) => `Invalid time format: ${time}. Expected HH:MM`,
  INVALID_TIME_VALUES: (time: string) => `Invalid time values: ${time}. Hours: 0-23, Minutes: 0-59`,
  SCHEDULING_FAILED: (medName: string) => `Failed to schedule reminder for ${medName}`,
  PERMISSION_DENIED: 'Notification permissions denied',
} as const;