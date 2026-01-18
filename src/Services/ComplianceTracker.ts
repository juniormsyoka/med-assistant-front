// src/services/ComplianceTracker.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ComplianceAction = 'taken' | 'missed' | 'snoozed' | 'skipped' | 'late';
export type LocationType = 'home' | 'work' | 'traveling' | 'other';
export type MoodType = 'good' | 'ok' | 'bad' | 'stressed' | 'busy';

export interface ComplianceRecord {
  id?: number;
  medicationId: number;
  medicationName: string;
  scheduledTime: string;
  reminderOffsetUsed: number;
  actualAction: ComplianceAction;
  actionTime?: string;
  dayOfWeek: number;
  hourOfDay: number;

    timeSinceLastDose?: number;     // hours
  isWeekend?: boolean;
  timeOfDayCategory?: 'morning' | 'afternoon' | 'evening' | 'night';


  latencySeconds?: number;
  location?: LocationType;
  mood?: MoodType;
  batteryLevel?: number;
  skippedReason?: string;

  // Optional interaction data
  notificationOpened?: boolean;
  appInForeground?: boolean;

  createdAt: string;
}

export interface ReminderScheduleRecord {
  id?: number;
  medicationId: number;
  scheduledTime: string;
  reminderOffsets: number[];
  scheduledAt: string;
}

const COMPLIANCE_STORAGE_KEY = '@compliance_records';
const SCHEDULE_STORAGE_KEY = '@reminder_schedules';

export class ComplianceTracker {
  // Record when a reminder is scheduled
  static async recordReminderScheduled(
    medicationId: number,
    medicationName: string,
    scheduledTime: Date,
    reminderOffsets: number[]
  ): Promise<void> {
    try {
      const scheduleRecord: ReminderScheduleRecord = {
        medicationId,
        scheduledTime: scheduledTime.toISOString(),
        reminderOffsets,
        scheduledAt: new Date().toISOString()
      };
      
      const existingSchedules = await this.getReminderSchedules();
      existingSchedules.push(scheduleRecord);
      
      // Keep only last 100 schedules
      const trimmed = existingSchedules.slice(-100);
      
      await AsyncStorage.setItem(
        SCHEDULE_STORAGE_KEY,
        JSON.stringify(trimmed)
      );
      
      console.log(`📅 Recorded schedule for med ${medicationId}: ${reminderOffsets.join(',')} min before`);
    } catch (error) {
      console.error('❌ Error recording reminder schedule:', error);
    }
  }
  
  static getTimeOfDayCategory(hour: number): 'morning' | 'afternoon' | 'evening' | 'night' {
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}

static async getTimeSinceLastDose(
  medicationId: number,
  scheduledTime: Date
): Promise<number | undefined> {
  const records = await this.getMedicationRecords(medicationId);

  const previousTaken = records
    .filter(r => r.actualAction === 'taken' && r.actionTime)
    .sort(
      (a, b) =>
        new Date(b.actionTime!).getTime() -
        new Date(a.actionTime!).getTime()
    )[0];

  if (!previousTaken?.actionTime) return undefined;

  const lastDoseTime = new Date(previousTaken.actionTime);
  const diffMs = scheduledTime.getTime() - lastDoseTime.getTime();

  return Math.round(diffMs / (1000 * 60 * 60)); // hours
}


  // Record medication action
  static async recordMedicationAction(
  medicationId: number,
  medicationName: string,
  scheduledTime: Date,
  reminderOffsetUsed: number,
  action: ComplianceAction,
  actionTime?: Date,
  context?: {
    location?: LocationType;
    mood?: MoodType;
    batteryLevel?: number;
    skippedReason?: string;
    notificationOpened?: boolean;
    appInForeground?: boolean;
  }
): Promise<void> {
  try {
    /* ------------------ Latency Calculation ------------------ */
    let latencySeconds: number | undefined;
    if (actionTime && action === 'taken') {
      latencySeconds = Math.round(
        (actionTime.getTime() - scheduledTime.getTime()) / 1000
      );
    }

    /* ------------------ Extended Feature Engineering ------------------ */
    const timeSinceLastDose =
      await this.getTimeSinceLastDose(medicationId, scheduledTime);

    const isWeekend =
      scheduledTime.getDay() === 0 || scheduledTime.getDay() === 6;

    const timeOfDayCategory =
      this.getTimeOfDayCategory(scheduledTime.getHours());

    /* ------------------ Compliance Record ------------------ */
    const record: ComplianceRecord = {
      medicationId,
      medicationName,

      // Core timing data
      scheduledTime: scheduledTime.toISOString(),
      reminderOffsetUsed,
      actualAction: action,
      actionTime: actionTime?.toISOString(),

      // Temporal features
      dayOfWeek: scheduledTime.getDay(),
      hourOfDay: scheduledTime.getHours(),
      isWeekend,
      timeOfDayCategory,

      // Behavior features
      latencySeconds,
      timeSinceLastDose,
      //currentStreak,

      // Contextual features
      location: context?.location,
      mood: context?.mood,
      batteryLevel: context?.batteryLevel,
      skippedReason: context?.skippedReason,

      // Notification interaction
      notificationOpened: context?.notificationOpened ?? false,
      appInForeground: context?.appInForeground ?? false,

      // Metadata
      createdAt: new Date().toISOString()
    };

    /* ------------------ Storage Management ------------------ */
    const existingRecords = await this.getComplianceRecords();
    existingRecords.push(record);

    // Keep only last 500 records per medication
    const medRecords = existingRecords.filter(
      r => r.medicationId === medicationId
    );
    const otherRecords = existingRecords.filter(
      r => r.medicationId !== medicationId
    );

    const trimmedMedRecords = medRecords.slice(-500);
    const allRecords = [...otherRecords, ...trimmedMedRecords];

    await AsyncStorage.setItem(
      COMPLIANCE_STORAGE_KEY,
      JSON.stringify(allRecords)
    );

    console.log(
      `📝 Recorded ${action} for med ${medicationId}  | latency=${latencySeconds ?? 'n/a'}s`
    );
  } catch (error) {
    console.error('❌ Error recording medication action:', error);
  }
}

  // Get all compliance records
  static async getComplianceRecords(): Promise<ComplianceRecord[]> {
    try {
      const json = await AsyncStorage.getItem(COMPLIANCE_STORAGE_KEY);
      return json ? JSON.parse(json) : [];
    } catch (error) {
      console.error('❌ Error getting compliance records:', error);
      return [];
    }
  }
  
  // Get records for specific medication
  static async getMedicationRecords(medicationId: number): Promise<ComplianceRecord[]> {
    const allRecords = await this.getComplianceRecords();
    return allRecords.filter(record => record.medicationId === medicationId);
  }
  
  // Get reminder schedule records
  static async getReminderSchedules(): Promise<ReminderScheduleRecord[]> {
    try {
      const json = await AsyncStorage.getItem(SCHEDULE_STORAGE_KEY);
      return json ? JSON.parse(json) : [];
    } catch (error) {
      console.error('❌ Error getting reminder schedules:', error);
      return [];
    }
  }
  
  // Calculate compliance statistics
  static async getComplianceStats(medicationId: number): Promise<{
    totalRecords: number;
    takenCount: number;
    missedCount: number;
    complianceRate: number;
    avgResponseTime?: number;
    mostEffectiveOffset?: number;
  }> {
    const records = await this.getMedicationRecords(medicationId);
    
    if (records.length === 0) {
      return {
        totalRecords: 0,
        takenCount: 0,
        missedCount: 0,
        complianceRate: 0
      };
    }
    
    const takenRecords = records.filter(r => r.actualAction === 'taken');
    const missedRecords = records.filter(r => r.actualAction === 'missed');
    
    // Calculate average response time
    let avgResponseTime: number | undefined;
    const takenWithLatency = takenRecords.filter(r => r.latencySeconds !== undefined);
    if (takenWithLatency.length > 0) {
      const totalLatency = takenWithLatency.reduce((sum, r) => sum + (r.latencySeconds || 0), 0);
      avgResponseTime = Math.round(totalLatency / takenWithLatency.length);
    }
    
    // Find most effective reminder offset
    const offsetSuccess = new Map<number, number>();
    takenRecords.forEach(record => {
      const count = offsetSuccess.get(record.reminderOffsetUsed) || 0;
      offsetSuccess.set(record.reminderOffsetUsed, count + 1);
    });
    
    let mostEffectiveOffset: number | undefined;
    let maxSuccess = 0;
    offsetSuccess.forEach((count, offset) => {
      if (count > maxSuccess) {
        maxSuccess = count;
        mostEffectiveOffset = offset;
      }
    });
    
    return {
      totalRecords: records.length,
      takenCount: takenRecords.length,
      missedCount: missedRecords.length,
      complianceRate: Math.round((takenRecords.length / records.length) * 100),
      avgResponseTime,
      mostEffectiveOffset
    };
  }
  
  // Clear all compliance data
  static async clearAllData(): Promise<void> {
    await AsyncStorage.removeItem(COMPLIANCE_STORAGE_KEY);
    await AsyncStorage.removeItem(SCHEDULE_STORAGE_KEY);
    console.log('🧹 Cleared all compliance tracking data');
  }
  
  // Export compliance data
  static async exportData(): Promise<{
    complianceRecords: ComplianceRecord[];
    scheduleRecords: ReminderScheduleRecord[];
    summary: {
      totalRecords: number;
      uniqueMedications: number;
      dateRange: { start: string; end: string };
    }
  }> {
    const complianceRecords = await this.getComplianceRecords();
    const scheduleRecords = await this.getReminderSchedules();
    
    const medicationIds = [...new Set(complianceRecords.map(r => r.medicationId))];
    const sortedRecords = complianceRecords.sort((a, b) => 
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    
    return {
      complianceRecords,
      scheduleRecords,
      summary: {
        totalRecords: complianceRecords.length,
        uniqueMedications: medicationIds.length,
        dateRange: {
          start: sortedRecords[0]?.createdAt || 'No data',
          end: sortedRecords[sortedRecords.length - 1]?.createdAt || 'No data'
        }
      }
    };
  }

  
}