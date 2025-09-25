import * as Notifications from 'expo-notifications';
import { settingsService } from './Settings';
import { Medication } from '../models/Medication';
import { Platform } from 'react-native';
import {
  DEFAULT_LEAD_TIME,
  HOURS_IN_DAY,
  MINUTES_IN_HOUR,
  DEFAULT_SOUND,
  MedicationNotificationData,
  ErrorMessages
} from '../models/notificationConstants';

// Configure notification handler with preferences
let notificationHandlerConfigured = false;

export const configureNotificationHandler = async (): Promise<void> => {
  if (notificationHandlerConfigured) return;

  const preferences = await settingsService.getPreferences();

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: preferences.inAppAlertsEnabled ?? true,
      shouldPlaySound: preferences.soundEnabled ?? true,
      shouldSetBadge: preferences.badgeEnabled ?? true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });

  // ✅ Configure Android channel for reliability
  await Notifications.setNotificationChannelAsync('medication-reminders', {
    name: 'Medication Reminders',
    importance: Notifications.AndroidImportance.HIGH,
    sound: preferences.reminderSound || DEFAULT_SOUND,
    vibrationPattern: preferences.vibrationEnabled ? [0, 250, 250, 250] : undefined,
    lightColor: '#FF231F7C',
  });

  notificationHandlerConfigured = true;
  console.log('🔔 Notification handler configured with user preferences and Android channel');
};

// Validation utilities
const validateTimeFormat = (time: string): void => {
  const timeParts = time.split(':');
  if (timeParts.length !== 2) {
    throw new Error(ErrorMessages.INVALID_TIME_FORMAT(time));
  }

  const hours = parseInt(timeParts[0]);
  const minutes = parseInt(timeParts[1]);

  if (isNaN(hours) || isNaN(minutes) ||
    hours < 0 || hours > 23 ||
    minutes < 0 || minutes > 59) {
    throw new Error(ErrorMessages.INVALID_TIME_VALUES(time));
  }
};

// ✅ Improved midnight-crossing handling
const calculateLeadTime = (
  hours: number,
  minutes: number,
  leadTime: number
): { leadHour: number; leadMinute: number } => {
  const totalMinutes = (hours * MINUTES_IN_HOUR + minutes) - (leadTime || DEFAULT_LEAD_TIME);

  let adjustedTotal = totalMinutes;
  if (adjustedTotal < 0) {
    adjustedTotal = HOURS_IN_DAY * MINUTES_IN_HOUR + adjustedTotal; // Wrap back across midnight
  }

  const leadHour = Math.floor(adjustedTotal / MINUTES_IN_HOUR) % HOURS_IN_DAY;
  const leadMinute = adjustedTotal % MINUTES_IN_HOUR;

  return { leadHour, leadMinute };
};

// Duplicate prevention
export const getExistingMedicationReminder = async (medicationId: string): Promise<string | null> => {
  try {
    const existingNotifications = await Notifications.getAllScheduledNotificationsAsync();
    const existing = existingNotifications.find(n =>
      n.content.data?.medicationId === medicationId
    );
    return existing?.identifier || null;
  } catch (error) {
    console.warn('⚠️ Could not check for existing reminders:', error);
    return null;
  }
};

// Permission handling
export const requestPermissions = async (): Promise<boolean> => {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('🔕 Notification permissions denied by user');
      return false;
    }

    console.log('✅ Notification permissions granted');
    return true;
  } catch (error) {
    console.error('❌ Error requesting notification permissions:', error);
    throw new Error(ErrorMessages.PERMISSION_DENIED);
  }
};

// Main scheduling function
// Main scheduling function

export async function scheduleMedicationReminder(med: Medication): Promise<Date> {
  try {
    let target: Date;
    let hours: number;
    let minutes: number;

    // 🕒 Handle ISO string (new) vs HH:mm (legacy)
    if (med.time.includes("T")) {
      // Already stored as ISO
      target = new Date(med.time);
      hours = target.getHours();
      minutes = target.getMinutes();
    } else {
      // Legacy HH:mm support
      const [h, m] = med.time.split(":").map(Number);
      hours = h;
      minutes = m;
      target = new Date();
      target.setHours(hours, minutes, 0, 0);
    }

    const now = new Date();
    if (target <= now) {
      if (med.repeatType === "daily") {
        target.setDate(target.getDate() + 1);
      } else if (med.repeatType === "weekly") {
        target.setDate(target.getDate() + 7);
      } else if (med.repeatType === "monthly") {
        target.setMonth(target.getMonth() + 1);
      }
    }

    const secondsUntilTarget = Math.floor((target.getTime() - now.getTime()) / 1000);

    let trigger: Notifications.NotificationTriggerInput;

    if (Platform.OS === "ios") {
      // iOS → calendar trigger works
      trigger = {
        type: "calendar",
        hour: hours,
        minute: minutes,
        repeats: true,
        ...(med.repeatType === "weekly" && { weekday: med.weekday }),
        ...(med.repeatType === "monthly" && { day: med.day }),
      } as Notifications.CalendarTriggerInput;
    } else {
      if (med.repeatType === "daily" || med.repeatType === "weekly") {
        // Step 1 → schedule first exact-time notification
        await Notifications.scheduleNotificationAsync({
          content: {
            title: `💊 ${med.name}`,
            body: `Time to take ${med.dosage}`,
            data: { medicationId: med.id },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
            seconds: secondsUntilTarget,
            repeats: false,
          } as Notifications.TimeIntervalTriggerInput,
        });

        // Step 2 → schedule repeating notification
        const repeatSeconds =
          med.repeatType === "daily"
            ? 24 * 60 * 60
            : 7 * 24 * 60 * 60;

        trigger = {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: repeatSeconds,
          repeats: true,
        } as Notifications.TimeIntervalTriggerInput;
      } else {
        // ⚠️ Monthly → only schedule one-time
        trigger = {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: secondsUntilTarget,
          repeats: false,
        } as Notifications.TimeIntervalTriggerInput;

        console.warn(
          `⚠️ Monthly repeat for "${med.name}" requires manual re-scheduling each month`
        );
      }
    }

    // Final scheduling (repeat OR one-time for monthly)
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `💊 ${med.name}`,
        body: `Time to take ${med.dosage}`,
        data: { medicationId: med.id },
      },
      trigger,
    });

    console.log(
      `✅ Reminder scheduled for "${med.name}" (${med.repeatType}) at ${target.toLocaleString()}`
    );

    // 🔑 Return the next reminder time so UI can display it
    return target;
  } catch (error) {
    console.error(`❌ Failed to schedule reminder for ${med.name}:`, error);
    throw error;
  }
}




export const cancelReminder = async (notificationId: string): Promise<void> => {
  await Notifications.cancelScheduledNotificationAsync(notificationId);
};

export const cancelAllReminders = async (): Promise<void> => {
  await Notifications.cancelAllScheduledNotificationsAsync();
};

