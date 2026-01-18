import * as SQLite from "expo-sqlite";
import { Medication, CreateMedication } from "../models/Medication";
import { LogEntry, CreateLogEntry } from "../models/LogEntry";
import { UserProfile, defaultPreferences } from "../models/User";
import { Appointment, CreateAppointment } from "../models/Appointment";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Refill, CreateRefill } from "../models/Refill";
import * as FileSystem from "expo-file-system/legacy";


//import { recordMedicationAction } from './notifications';
import { ComplianceTracker } from '../Services/ComplianceTracker';
// Async DB handle
let db: SQLite.SQLiteDatabase | null = null;
const USER_PROFILE_KEY = 'user_profile';

// Add this type definition for messages
type LocalMessage = {
  id: string;
  conversation_id: string;
  sender_id: string;
  text: string;
  created_at: string;
  synced: number;
};

export const initDatabase = async (): Promise<void> => {
  if (!db) db = await SQLite.openDatabaseAsync("medications.db");

  // Create medications table if not exists
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS medications (
      id INTEGER PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      dosage TEXT NOT NULL,
      time TEXT NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1,
      status TEXT NOT NULL DEFAULT 'active',
      repeatType TEXT NOT NULL DEFAULT 'daily',
      weekday INTEGER,
      day INTEGER,
      nextReminderAt TEXT,
      supplyTotalQuantity INTEGER,
      supplyUnits TEXT,
      supplyDosagePerUse INTEGER,
      createdAt TEXT NOT NULL
    );
  `);

  // Create logs table
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS logs (
      id INTEGER PRIMARY KEY NOT NULL,
      medicationId INTEGER NOT NULL,
      medicationName TEXT NOT NULL,
      status TEXT NOT NULL,
      scheduledTime TEXT NOT NULL,
      actualTime TEXT,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (medicationId) REFERENCES medications (id) ON DELETE CASCADE
    );
  `);

  // Create user profile table
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS user_profile (
      id INTEGER PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      preferences TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );
  `);

  // Create refills table
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS refills (
      id INTEGER PRIMARY KEY NOT NULL,
      medicationId INTEGER NOT NULL,
      initialSupply INTEGER NOT NULL,
      currentSupply INTEGER NOT NULL,
      dosagePerUse INTEGER NOT NULL DEFAULT 1,
      refillThreshold INTEGER NOT NULL DEFAULT 7,
      refillQuantity INTEGER NOT NULL,
      lastRefillDate TEXT NOT NULL,
      nextRefillDate TEXT,
      isActive INTEGER NOT NULL DEFAULT 1,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (medicationId) REFERENCES medications (id) ON DELETE CASCADE
    );
  `);

  // Create appointments table
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS appointments (
      id INTEGER PRIMARY KEY NOT NULL,
      title TEXT NOT NULL,
      type TEXT NOT NULL,
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      location TEXT,
      doctorName TEXT,
      notes TEXT,
      reminderMinutes TEXT NOT NULL,
      isCompleted INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL
    );
  `);

  //local message for table for offline caching
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY NOT NULL,         -- use Supabase uuid or local temporary id prefixed
      conversation_id TEXT NOT NULL,
      sender_id TEXT NOT NULL,
      text TEXT NOT NULL,
      created_at TEXT NOT NULL,             -- ISO timestamp
      synced INTEGER NOT NULL DEFAULT 0,    -- 0 = not synced to Supabase, 1 = synced
      updated_at TEXT,
      deleted_at TEXT
    );
  `);

  console.log("Database initialized successfully");
};

//
// Medication operations
//
export const addMedication = async (medication: CreateMedication): Promise<number> => {
  if (!db) throw new Error("Database not initialized");

  const result = await db.runAsync(
    `INSERT INTO medications (name, dosage, time, enabled, status, repeatType, weekday, day, nextReminderAt, supplyTotalQuantity, supplyUnits, supplyDosagePerUse, createdAt) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      medication.name,
      medication.dosage,
      medication.time,
      medication.enabled ? 1 : 0,
      medication.status ?? "active",
      medication.repeatType,
      medication.weekday ?? null,
      medication.day ?? null,
      medication.nextReminderAt ?? null,
      medication.supplyInfo?.totalQuantity ?? null,
      medication.supplyInfo?.units ?? null,
      medication.supplyInfo?.dosagePerUse ?? null,
      new Date().toISOString(),
    ]
  );

  console.log('💊 Medication added to database:', medication.name, 'ID:', result.lastInsertRowId);
  return result.lastInsertRowId as number;
};

export const getMedications = async (): Promise<Medication[]> => {
  if (!db) throw new Error("Database not initialized");

  const result = await db.getAllAsync<any>(
    "SELECT * FROM medications ORDER BY time;"
  );

  const medications = result.map((item) => ({
    ...item,
    enabled: item.enabled === 1,
    supplyInfo: item.supplyTotalQuantity ? {
      totalQuantity: item.supplyTotalQuantity,
      units: item.supplyUnits,
      dosagePerUse: item.supplyDosagePerUse,
    } : undefined,
  })) as Medication[];

  return medications;
};

export const updateMedicationStatus = async (
  id: number,
  status: Medication["status"]
): Promise<void> => {
  if (!db) throw new Error("Database not initialized");

  await db.runAsync(
    `UPDATE medications SET status = ? WHERE id = ?;`,
    [status ?? "active", id]
  );
  console.log('💊 Medication status updated:', id, status);
};

export const updateMedication = async (id: number, medication: CreateMedication): Promise<void> => {
  if (!db) throw new Error("Database not initialized");

  await db.runAsync(
    `UPDATE medications 
     SET name = ?, dosage = ?, time = ?, enabled = ?, status = ?, repeatType = ?, weekday = ?, day = ?, nextReminderAt = ?, supplyTotalQuantity = ?, supplyUnits = ?, supplyDosagePerUse = ?
     WHERE id = ?;`,
    [
      medication.name,
      medication.dosage,
      medication.time,
      medication.enabled ? 1 : 0,
      medication.status ?? "active",
      medication.repeatType,
      medication.weekday ?? null,
      medication.day ?? null,
      medication.nextReminderAt ?? null,
      medication.supplyInfo?.totalQuantity ?? null,
      medication.supplyInfo?.units ?? null,
      medication.supplyInfo?.dosagePerUse ?? null,
      id
    ]
  );
  console.log('💊 Medication updated:', id, medication.name);
};

export const deleteMedication = async (id: number): Promise<void> => {
  if (!db) throw new Error("Database not initialized");
  
  // First get the medication name for logging
  const med = await db.getFirstAsync<any>("SELECT name FROM medications WHERE id = ?;", [id]);
  
  await db.runAsync("DELETE FROM medications WHERE id = ?;", [id]);
  console.log('🗑️ Medication deleted from database:', med?.name, 'ID:', id);
};

//
// Log operations
//
// In storage.ts - UPDATED addLogEntry function:

export const addLogEntry = async (log: CreateLogEntry): Promise<number> => {
  if (!db) throw new Error("Database not initialized");

  await db.execAsync("BEGIN TRANSACTION;");

  try {
    const result = await db.runAsync(
      `INSERT INTO logs (medicationId, medicationName, status, scheduledTime, actualTime, createdAt) 
       VALUES (?, ?, ?, ?, ?, ?);`,
      [
        log.medicationId,
        log.medicationName,
        log.status,
        log.scheduledTime,
        log.actualTime ?? null,
        new Date().toISOString(),
      ]
    );

    // 1. Update medication status (your existing code)
    await updateMedicationStatus(
      log.medicationId,
      log.status === "refilled" ? "taken" : log.status as any
    );

    // ====================================================
    // 2. NEW: COMPLIANCE TRACKING INTEGRATION
    // ====================================================
    try {
      // Get the medication details
      const medication = await getMedicationById(log.medicationId);
      
      if (medication) {
        // Map LogStatus to ComplianceAction
        type LogStatus = 'taken' | 'missed' | 'snoozed' | 'skipped' | 'late' | 'rescheduled' | 'active' | 'paused' | 'refilled' | 'attended' | 'missedAttendance';
        type ComplianceAction = 'taken' | 'missed' | 'snoozed' | 'skipped' | 'late';
        
        const statusMap: Record<LogStatus, ComplianceAction> = {
          'taken': 'taken',
          'missed': 'missed',
          'snoozed': 'snoozed',
          'skipped': 'skipped',
          'late': 'late',
          'rescheduled': 'missed',
          'active': 'taken',
          'paused': 'skipped',
          'refilled': 'taken',
          'attended': 'taken',
          'missedAttendance': 'missed'
        };
        
        const complianceAction = statusMap[log.status as LogStatus];
        
        // Determine which reminder offset was used
        const reminderOffsetUsed = medication.reminderMinutes?.length 
          ? Math.min(...medication.reminderMinutes)
          : 60; // Default 60 minutes
        
        // Get battery level for context
        let batteryLevel: number | undefined;
        try {
          // Dynamic import to avoid loading if not needed
          const batteryModule = await import('expo-battery');
          const batteryPercent = await batteryModule.getBatteryLevelAsync();
          batteryLevel = Math.round(batteryPercent * 100);
        } catch (e) {
          console.log('Battery level not available:', e);
        }
        
        // Prepare context with proper types
        const context: {
          location?: 'home' | 'work' | 'traveling' | 'other';
          mood?: 'good' | 'ok' | 'bad' | 'stressed' | 'busy';
          batteryLevel?: number;
          skippedReason?: string;
        } = {};
        
        // Add battery level if available
        if (batteryLevel !== undefined) {
          context.batteryLevel = batteryLevel;
        }
        
        // Record compliance data
        await ComplianceTracker.recordMedicationAction(
          log.medicationId,
          log.medicationName,
          new Date(log.scheduledTime),
          reminderOffsetUsed,
          complianceAction,
          log.actualTime ? new Date(log.actualTime) : undefined,
          context
        );
        
        console.log('📊 Compliance tracked:', log.medicationName, complianceAction);
      }
    } catch (complianceError) {
      // Don't let compliance tracking failure break the main log entry
      console.warn('⚠️ Compliance tracking failed:', complianceError);
    }
    // ====================================================

    await db.execAsync("COMMIT;");
    
    console.log('📝 Log entry added for medication:', log.medicationName, 'Status:', log.status);
    return result.lastInsertRowId as number;
  } catch (err) {
    await db.execAsync("ROLLBACK;");
    throw err;
  }
};

export const getLogs = async (limit = 100): Promise<LogEntry[]> => {
  if (!db) throw new Error("Database not initialized");

  return await db.getAllAsync<LogEntry>(
    "SELECT * FROM logs ORDER BY createdAt DESC LIMIT ?;",
    [limit]
  );
};

//
// Refill operations
export const addRefill = async (refill: CreateRefill): Promise<number> => {
  if (!db) throw new Error("Database not initialized");

  const result = await db.runAsync(
    `INSERT INTO refills (
      medicationId,
      initialSupply,
      currentSupply,
      dosagePerUse,
      refillThreshold,
      refillQuantity,
      lastRefillDate,
      nextRefillDate,
      isActive,
      createdAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      refill.medicationId,
      refill.initialSupply,
      refill.currentSupply,
      refill.dosagePerUse,
      refill.refillThreshold,
      refill.refillQuantity,
      refill.lastRefillDate,
      refill.nextRefillDate ?? null,
      refill.isActive ? 1 : 0,
      new Date().toISOString()
    ]
  );

  console.log("💊 Refill added locally for medication ID:", refill.medicationId);
  return result.lastInsertRowId as number;
};

export const updateRefillSupply = async (medicationId: number, newSupply: number): Promise<void> => {
  if (!db) throw new Error("Database not initialized");
  
  await db.runAsync(
    `UPDATE refills SET currentSupply = ? WHERE medicationId = ? AND isActive = 1;`,
    [newSupply, medicationId]
  );
  console.log('🔄 Refill supply updated for medication ID:', medicationId, 'New supply:', newSupply);
};

export const getRefillByMedicationId = async (medicationId: number): Promise<Refill | null> => {
  if (!db) throw new Error("Database not initialized");
  
  const result = await db.getFirstAsync<any>(
    "SELECT * FROM refills WHERE medicationId = ? AND isActive = 1;",
    [medicationId]
  );
  
  return result ? {
    ...result,
    isActive: result.isActive === 1,
  } as Refill : null;
};

export const getLowSupplyMedications = async (): Promise<Array<{medication: Medication, refill: Refill}>> => {
  if (!db) throw new Error("Database not initialized");
  
  const result = await db.getAllAsync<any>(`
    SELECT m.*, r.* 
    FROM medications m
    JOIN refills r ON m.id = r.medicationId
    WHERE r.isActive = 1 AND r.currentSupply <= r.refillThreshold;
  `);
  
  return result.map(item => ({
    medication: { 
      ...item, 
      enabled: item.enabled === 1,
      supplyInfo: item.supplyTotalQuantity ? {
        totalQuantity: item.supplyTotalQuantity,
        units: item.supplyUnits,
        dosagePerUse: item.supplyDosagePerUse,
      } : undefined
    },
    refill: { 
      ...item, 
      isActive: item.isActive === 1 
    }
  }));
};

export const markRefillCompleted = async (medicationId: number, refillQuantity: number): Promise<void> => {
  if (!db) throw new Error("Database not initialized");
  
  await db.runAsync(`
    UPDATE refills 
    SET currentSupply = currentSupply + ?, lastRefillDate = ?, nextRefillDate = ?
    WHERE medicationId = ? AND isActive = 1;
  `, [
    refillQuantity,
    new Date().toISOString(),
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
    medicationId
  ]);
  
  console.log('✅ Refill completed for medication ID:', medicationId);
};

//
// Appointment operations
//
export const addAppointment = async (appointment: CreateAppointment): Promise<number> => {
  if (!db) throw new Error("Database not initialized");
  
  const result = await db.runAsync(
    `INSERT INTO appointments (title, type, date, time, location, doctorName, notes, reminderMinutes, isCompleted, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      appointment.title,
      appointment.type,
      appointment.date,
      appointment.time,
      appointment.location || null,
      appointment.doctorName || null,
      appointment.notes || null,
      JSON.stringify(appointment.reminderMinutes),
      appointment.isCompleted ? 1 : 0,
      new Date().toISOString()
    ]
  );
  
  console.log('🗓️ Appointment added:', appointment.title);
  return result.lastInsertRowId as number;
};

export const getAppointments = async (): Promise<Appointment[]> => {
  if (!db) throw new Error("Database not initialized");
  
  const result = await db.getAllAsync<any>(`
    SELECT * FROM appointments 
    ORDER BY date, time;
  `);
  
  return result.map(item => ({
    ...item,
    reminderMinutes: JSON.parse(item.reminderMinutes),
    isCompleted: item.isCompleted === 1,
  })) as Appointment[];
};

export const getUpcomingAppointments = async (days: number = 7): Promise<Appointment[]> => {
  if (!db) throw new Error("Database not initialized");
  
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);
  
  const result = await db.getAllAsync<any>(`
    SELECT * FROM appointments 
    WHERE date BETWEEN date('now') AND date(?) 
    AND isCompleted = 0
    ORDER BY date, time;
  `, [futureDate.toISOString().split('T')[0]]);
  
  return result.map(item => ({
    ...item,
    reminderMinutes: JSON.parse(item.reminderMinutes),
    isCompleted: item.isCompleted === 1,
  })) as Appointment[];
};

export const updateAppointment = async (id: number, appointment: CreateAppointment): Promise<void> => {
  if (!db) throw new Error("Database not initialized");
  
  await db.runAsync(
    `UPDATE appointments 
     SET title = ?, type = ?, date = ?, time = ?, location = ?, doctorName = ?, notes = ?, reminderMinutes = ?, isCompleted = ?
     WHERE id = ?;`,
    [
      appointment.title,
      appointment.type,
      appointment.date,
      appointment.time,
      appointment.location || null,
      appointment.doctorName || null,
      appointment.notes || null,
      JSON.stringify(appointment.reminderMinutes),
      appointment.isCompleted ? 1 : 0,
      id
    ]
  );
  
  console.log('🗓️ Appointment updated:', appointment.title);
};

export const markAppointmentCompleted = async (id: number): Promise<void> => {
  if (!db) throw new Error("Database not initialized");
  
  await db.runAsync(
    `UPDATE appointments SET isCompleted = 1 WHERE id = ?;`,
    [id]
  );
  
  console.log('✅ Appointment marked completed ID:', id);
};

export const deleteAppointment = async (id: number): Promise<void> => {
  if (!db) throw new Error("Database not initialized");
  
  await db.runAsync("DELETE FROM appointments WHERE id = ?;", [id]);
  console.log('🗑️ Appointment deleted ID:', id);
};

//
// User profile operations
//
export const getUserProfile = async (): Promise<UserProfile | null> => {
  try {
    const profileJson = await AsyncStorage.getItem(USER_PROFILE_KEY);
    
    if (profileJson) {
      const profile = JSON.parse(profileJson);
      return profile;
    }
    return null;
  } catch (error) {
    console.error('Error getting user profile:', error);
    return null;
  }
};

export const saveUserProfile = async (profile: UserProfile): Promise<void> => {
  try {
    console.log('Saving profile to storage:', {
      name: profile.name,
      hasProfilePicture: !!profile.profilePicture,
      profilePicture: profile.profilePicture
    });
    
    await AsyncStorage.setItem(USER_PROFILE_KEY, JSON.stringify(profile));
    
    // Verify the save worked
    const saved = await AsyncStorage.getItem(USER_PROFILE_KEY);
    console.log('Verified save - profile exists:', !!saved);
  } catch (error) {
    console.error('Error saving user profile:', error);
    throw error;
  }
};

export const resetDailyStatuses = async (): Promise<void> => {
  if (!db) throw new Error("Database not initialized");

  const today = new Date();
  const weekday = today.getDay() + 1; // Sunday=1..Saturday=7
  const day = today.getDate();

  await db.runAsync(`
    UPDATE medications 
    SET status = 'active'
    WHERE status IN ('taken','missed','skipped','rescheduled')
      AND (
        repeatType = 'daily'
        OR (repeatType = 'weekly' AND weekday = ?)
        OR (repeatType = 'monthly' AND day = ?)
      );
  `, [weekday, day]);

  console.log("🔄 Medication statuses reset for new day");
};

// Helper function to get a single medication by ID
export const getMedicationById = async (id: number): Promise<Medication | null> => {
  if (!db) throw new Error("Database not initialized");

  const result = await db.getFirstAsync<any>(
    "SELECT * FROM medications WHERE id = ?;",
    [id]
  );

  return result ? {
    ...result,
    enabled: result.enabled === 1,
    supplyInfo: result.supplyTotalQuantity ? {
      totalQuantity: result.supplyTotalQuantity,
      units: result.supplyUnits,
      dosagePerUse: result.supplyDosagePerUse,
    } : undefined,
  } as Medication : null;
};

export const resetDatabase = async (): Promise<void> => {
  try {
    const dbPath = `${FileSystem.documentDirectory}SQLite/medications.db`;
    console.log("🧩 Database path:", dbPath);

    // Check if the database file exists
    const info = await FileSystem.getInfoAsync(dbPath);
    console.log("📄 getInfoAsync result:", info);

    if (info.exists) {
      await FileSystem.deleteAsync(dbPath);
      console.log("🗑️ Old database deleted");
    } else {
      console.log("⚠️ No database file found — nothing to delete");
    }

    // Optional: list remaining files for verification
    const remainingFiles = await FileSystem.readDirectoryAsync(`${FileSystem.documentDirectory}SQLite/`);
    console.log("📂 Remaining SQLite directory contents:", remainingFiles);
  } catch (error) {
    console.error("❌ Error deleting database:", error);
  }
};

// Message storage functions with proper typing
export const addMessageLocal = async (message: {
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  createdAt: string;
  synced: number;
}) => {
  try {
    if (!db) {
      throw new Error('Database not initialized');
    }

    console.log('💾 Saving message locally:', message.id);

    const result = await db.runAsync(
      `INSERT OR IGNORE INTO messages (id, conversation_id, sender_id, text, created_at, synced) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        message.id,
        message.conversationId,
        message.senderId,
        message.text,
        message.createdAt,
        message.synced
      ]
    );
    
    console.log('✅ Message saved locally:', message.id, 'Result:', result);
    return result;
  } catch (error) {
    console.error('❌ Failed to save message locally:', error);
    throw error;
  }
};

export const getMessagesLocal = async (conversationId: string, limit: number = 100): Promise<LocalMessage[]> => {
  try {
    if (!db) {
      throw new Error('Database not initialized');
    }

    const messages = await db.getAllAsync<LocalMessage>(
      `SELECT * FROM messages 
       WHERE conversation_id = ? 
       ORDER BY created_at ASC 
       LIMIT ?`,
      [conversationId, limit]
    );
    
    return messages;
  } catch (error) {
    console.error('Failed to get local messages:', error);
    return [];
  }
};

export const getUnsyncedMessages = async (): Promise<LocalMessage[]> => {
  try {
    if (!db) {
      throw new Error('Database not initialized');
    }

    const messages = await db.getAllAsync<LocalMessage>(
      'SELECT * FROM messages WHERE synced = 0 ORDER BY created_at ASC'
    );
    
    return messages;
  } catch (error) {
    console.error('Failed to get unsynced messages:', error);
    return [];
  }
};

export const saveMessageFromSupabase = async (message: {
  id: string;
  conversationId: string;
  senderId: string;
  sender:string;
  text: string;
  createdAt: string;
}) => {
  try {
    if (!db) {
      throw new Error('Database not initialized');
    }

    await db.runAsync(
      `INSERT OR REPLACE INTO messages (id, conversation_id, sender_id, text, created_at, synced) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        message.id,
        message.conversationId,
        message.senderId,
        message.text,
        message.createdAt,
        1 // Mark as synced
      ]
    );
    
    console.log('✅ Supabase message saved locally:', message.id);
  } catch (error) {
    console.error('Failed to save Supabase message:', error);
    throw error;
  }
};

export const markMessageSynced = async (localId: string, serverId: string) => {
  try {
    if (!db) {
      throw new Error('Database not initialized');
    }

    console.log(`🔄 Syncing message: ${localId} -> ${serverId}`);

    const localMessages = await db.getAllAsync<LocalMessage>(
      'SELECT * FROM messages WHERE id = ?',
      [localId]
    );

    if (localMessages.length > 0) {
      const localMsg = localMessages[0];
      
      await db.runAsync('DELETE FROM messages WHERE id = ?', [localId]);
      
      await db.runAsync(
        `INSERT INTO messages (id, conversation_id, sender_id, text, created_at, synced) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          serverId,
          localMsg.conversation_id,
          localMsg.sender_id,
          localMsg.text,
          localMsg.created_at,
          1 // Mark as synced
        ]
      );
      
      console.log(`✅ Message synced: ${localId} -> ${serverId}`);
    } else {
      console.warn(`⚠️ Local message not found for syncing: ${localId}`);
    }
  } catch (error) {
    console.error('Failed to mark message as synced:', error);
    throw error;
  }
};

export const resetMessagesTable = async () => {
  try {
    if (!db) {
      console.error('Database not initialized');
      return;
    }

    await db.execAsync('DELETE FROM messages;');
    
    console.log('✅ Local messages table reset');
  } catch (error) {
    console.error('Failed to reset messages table:', error);
  }
};

// Services/storage.ts (add this function)
export async function updateMessageLocal(
  messageId: string, 
  updates: { text?: string; synced?: number }
): Promise<void> {
  try {
    await AsyncStorage.setItem(
      `message_${messageId}`,
      JSON.stringify(updates)
    );
    console.log('✅ Message updated locally:', messageId);
  } catch (error) {
    console.error('❌ Failed to update message locally:', error);
  }
}

// Export the LocalMessage type for use in other files
export type { LocalMessage };