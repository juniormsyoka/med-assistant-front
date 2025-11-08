import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { settingsService } from './Settings';
import { Medication } from '../models/Medication';
import { Appointment } from '../models/Appointment';
import {
  DEFAULT_LEAD_TIME,
  HOURS_IN_DAY,
  MINUTES_IN_HOUR,
  DEFAULT_SOUND,
  ErrorMessages,
} from '../models/notificationConstants';

const APPOINTMENT_PHRASES = [
  "It's time!",
  "Your appointment is starting now",
  "Don't be late!",
  "Ready for your appointment?",
];

const MONTHLY_MED_STORAGE_KEY = '@monthly_med_reminders';

let notificationHandlerConfigured = false;

export const generateNotificationId = (type: 'medication' | 'appointment', id: string | number, suffix?: string) =>
  `${type}_${id}${suffix ? `_${suffix}` : ''}`;

const validateTimeFormat = (time: string) => {
  const [hoursStr, minutesStr] = time.split(':');
  if (!hoursStr || !minutesStr) throw new Error(ErrorMessages.INVALID_TIME_FORMAT(time));

  const hours = parseInt(hoursStr);
  const minutes = parseInt(minutesStr);
  if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    throw new Error(ErrorMessages.INVALID_TIME_VALUES(time));
  }
};

const calculateLeadTime = (hours: number, minutes: number, leadTime: number) => {
  let totalMinutes = hours * MINUTES_IN_HOUR + minutes - (leadTime || DEFAULT_LEAD_TIME);
  if (totalMinutes < 0) totalMinutes = HOURS_IN_DAY * MINUTES_IN_HOUR + totalMinutes;

  return { leadHour: Math.floor(totalMinutes / MINUTES_IN_HOUR) % HOURS_IN_DAY, leadMinute: totalMinutes % MINUTES_IN_HOUR };
};

const logNotificationEvent = (event: string, metadata: any) => {
 // console.log(`📊 Notification Event: ${event}`, metadata);
  // Future: send to analytics service
};

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

    //console.log('✅ Notification permissions granted');
    return true;
  } catch (error) {
    console.error('❌ Error requesting notification permissions:', error);
    throw new Error(ErrorMessages.PERMISSION_DENIED);
  }
};

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

  // Medication channel
  await Notifications.setNotificationChannelAsync('medication-reminders', {
    name: 'Medication Reminders',
    importance: Notifications.AndroidImportance.HIGH,
    sound: preferences.reminderSound || DEFAULT_SOUND,
    vibrationPattern: preferences.vibrationEnabled ? [0, 250, 250, 250] : undefined,
    lightColor: '#FF231F7C',
  });

  // Appointment channel
  await Notifications.setNotificationChannelAsync('appointment-reminders', {
    name: 'Appointment Reminders',
    importance: Notifications.AndroidImportance.HIGH,
    sound: 'default',
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#FF231F7C',
  });

  notificationHandlerConfigured = true;
  console.log('🔔 Notification handler configured with medication & appointment channels');
};

export const getExistingMedicationReminder = async (medicationId: string): Promise<string | null> => {
  try {
    const notifications = await Notifications.getAllScheduledNotificationsAsync();
    const existing = notifications.find(n => n.content.data?.medicationId === medicationId);
    return existing?.identifier || null;
  } catch (error) {
    console.warn('⚠️ Could not check for existing reminders:', error);
    return null;
  }
};

export const scheduleMedicationReminder = async (
  med: Medication,
  onError?: (err: any) => void
): Promise<Date | null> => {
  try {
    const medIdStr = med.id?.toString();
    if (!medIdStr) throw new Error('Medication ID is missing');

    await cancelMedicationReminders(medIdStr);

    let target = new Date();
    if (med.time.includes('T')) {
      target = new Date(med.time);
    } else {
      const [hours, minutes] = med.time.split(':').map(Number);
      target.setHours(hours, minutes, 0, 0);
    }

    const now = new Date();
    if (target <= now) {
      if (med.repeatType === 'daily') {
        target.setDate(target.getDate() + 1);
      } else if (med.repeatType === 'weekly') {
        target.setDate(target.getDate() + 7);
      } else if (med.repeatType === 'monthly') {
        target.setMonth(target.getMonth() + 1);
      } else if (med.repeatType === 'once') {
        console.log(`⏰ One-time reminder for ${med.name} has already passed — skipping reschedule.`);
        return null; 
      }
    }

    const secondsUntilTarget = Math.floor((target.getTime() - now.getTime()) / 1000);

    const reminderOffsets = med.reminderMinutes || []; 

    for (const minsBefore of reminderOffsets) {
      const reminderTime = new Date(target.getTime() - minsBefore * 60 * 1000);
      if (reminderTime <= new Date()) continue;

      const seconds = Math.floor((reminderTime.getTime() - Date.now()) / 1000);

      await Notifications.scheduleNotificationAsync({
        identifier: generateNotificationId('medication', medIdStr, `reminder_${minsBefore}`),
        content: {
          title: `💊 Reminder: ${med.name}`,
          body: `It's almost time to take your ${med.dosage}.`,
          data: {
            medicationId: medIdStr,
            type: 'medication',
            reminderType: 'advance',
            minutesBefore: minsBefore,
          },
          sound: DEFAULT_SOUND,
          ...(Platform.OS === 'android' && { channelId: 'medication-reminders' }),
        },
        trigger: {
          type: 'timeInterval',
          seconds,
          repeats: false,
        } as Notifications.TimeIntervalTriggerInput,
      });
    }

    const phraseOptions = [
      `Time to take your ${med.name}!`,
      `Don’t forget your ${med.dosage} of ${med.name}.`,
      `Stay on track — ${med.name} time!`,
    ];
    const phrase = phraseOptions[Math.floor(Math.random() * phraseOptions.length)];

    await Notifications.scheduleNotificationAsync({
      identifier: generateNotificationId('medication', medIdStr, 'exact_time'),
      content: {
        title: `💊 ${med.name}`,
        body: phrase,
        data: {
          medicationId: medIdStr,
          type: 'medication-now',
          repeatType: med.repeatType,
        },
        sound: DEFAULT_SOUND,
        ...(Platform.OS === 'android' && { channelId: 'medication-reminders' }),
      },
      trigger: {
        type: 'timeInterval',
        seconds: secondsUntilTarget,
        repeats: false,
      } as Notifications.TimeIntervalTriggerInput,
    });

    if (med.repeatType !== 'once') {
      const repeatSeconds =
        med.repeatType === 'daily'
          ? 24 * 60 * 60
          : med.repeatType === 'weekly'
          ? 7 * 24 * 60 * 60
          : 30 * 24 * 60 * 60;

      await Notifications.scheduleNotificationAsync({
        identifier: generateNotificationId('medication', medIdStr, `repeat_${med.repeatType}`),
        content: {
          title: `💊 ${med.name}`,
          body: `It's time again for your ${med.dosage}.`,
          data: {
            medicationId: medIdStr,
            type: 'medication-repeat',
            repeatType: med.repeatType,
          },
          sound: DEFAULT_SOUND,
          ...(Platform.OS === 'android' && { channelId: 'medication-reminders' }),
        },
        trigger: {
          type: 'timeInterval',
          seconds: repeatSeconds,
          repeats: true,
        } as Notifications.TimeIntervalTriggerInput,
      });
    }

    logNotificationEvent('medication-scheduled', {
      medId: medIdStr,
      time: target.toISOString(),
      repeatType: med.repeatType,
    });

    return target;
  } catch (error) {
    console.error(`❌ Failed to schedule reminder for ${med.name}:`, error);
    onError?.(error);
    return null; 
  }
};



export const cancelMedicationReminders = async (medicationId: string): Promise<void> => {
  try {
    const notifications = await Notifications.getAllScheduledNotificationsAsync();
    const medNotifications = notifications.filter(n => n.content.data?.medicationId === medicationId);

    for (const n of medNotifications) await Notifications.cancelScheduledNotificationAsync(n.identifier);

    logNotificationEvent('medication-cancelled', { medicationId });
  } catch (error) {
    console.error('Error cancelling medication reminders:', error);
    throw error;
  }
};

// Bulk reschedule
export const rescheduleAllMedications = async (medications: Medication[]) => {
  const existing = await Notifications.getAllScheduledNotificationsAsync();
  for (const n of existing.filter(n => n.content.data?.type === 'medication')) {
    await Notifications.cancelScheduledNotificationAsync(n.identifier);
  }
  for (const med of medications) await scheduleMedicationReminder(med);
};

// Appointment Reminders
const formatAppointmentTimeText = (minutesBefore: number) => {
  if (minutesBefore >= 1440) return `in ${minutesBefore / 1440} day${minutesBefore / 1440 > 1 ? 's' : ''}`;
  if (minutesBefore >= 60) return `in ${minutesBefore / 60} hour${minutesBefore / 60 > 1 ? 's' : ''}`;
  return `in ${minutesBefore} minutes`;
};

export const scheduleAppointmentReminder = async (appointment: Appointment) => {
  await cancelAppointmentReminders(appointment.id!);

  const apptTime = new Date(`${appointment.date}T${appointment.time}`);
  for (const minsBefore of appointment.reminderMinutes) {
    const reminderTime = new Date(apptTime.getTime() - minsBefore * 60 * 1000);
    if (reminderTime <= new Date()) continue;

    const seconds = Math.floor((reminderTime.getTime() - Date.now()) / 1000);
    await Notifications.scheduleNotificationAsync({
      identifier: generateNotificationId('appointment', appointment.id!, `reminder_${minsBefore}`),
      content: {
        title: `📅 Upcoming: ${appointment.title}`,
        body: `Hey! ${formatAppointmentTimeText(minsBefore)}. Don't forget to prepare!`,
        data: { appointmentId: appointment.id, type: 'appointment', reminderType: 'advance' },
      },
      trigger: { type: 'timeInterval', seconds, repeats: false } as Notifications.TimeIntervalTriggerInput,
    });
  }

  const secondsUntilAppt = Math.floor((apptTime.getTime() - Date.now()) / 1000);
  if (secondsUntilAppt > 0) {
    const phrase = APPOINTMENT_PHRASES[Math.floor(Math.random() * APPOINTMENT_PHRASES.length)];
    await Notifications.scheduleNotificationAsync({
      identifier: generateNotificationId('appointment', appointment.id!, 'exact_time'),
      content: {
        title: `📅 ${appointment.title}`,
        body: `${phrase}${appointment.location ? ` at ${appointment.location}` : ''}`,
        data: { appointmentId: appointment.id, type: 'appointment-now', reminderType: 'exact' },
      },
      trigger: { type: 'timeInterval', seconds: secondsUntilAppt, repeats: false } as Notifications.TimeIntervalTriggerInput,
    });
  }
};

export const cancelAppointmentReminders = async (appointmentId: number) => {
  const notifications = await Notifications.getAllScheduledNotificationsAsync();
  for (const n of notifications.filter(n => n.content.data?.appointmentId === appointmentId)) {
    await Notifications.cancelScheduledNotificationAsync(n.identifier);
  }
};

// Export Service
export const NotificationService = {
  requestPermissions,
  configureNotificationHandler,
  scheduleMedicationReminder,
  cancelMedicationReminders,
  rescheduleAllMedications,
  scheduleAppointmentReminder,
  cancelAppointmentReminders,
};

export default NotificationService;