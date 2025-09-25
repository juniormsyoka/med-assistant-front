import * as SQLite from "expo-sqlite";
import { Medication, CreateMedication } from "../models/Medication";
import { LogEntry, CreateLogEntry } from "../models/LogEntry";
import { UserProfile, defaultPreferences } from "../models/User";

// Async DB handle
let db: SQLite.SQLiteDatabase | null = null;

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
      createdAt TEXT NOT NULL
    );
  `);

  // --- Add missing 'status' column if it doesn't exist ---
  try {
    await db.execAsync(`ALTER TABLE medications ADD COLUMN status TEXT NOT NULL DEFAULT 'active';`);
  } catch (err) {
    // Column already exists → ignore
   // console.log('Status column already exists, skipping ALTER TABLE');
  }

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

  console.log("Database initialized successfully");
};


//
// Medication operations
//
export const addMedication = async (medication: CreateMedication): Promise<number> => {
  if (!db) throw new Error("Database not initialized");

  const result = await db.runAsync(
    `INSERT INTO medications (name, dosage, time, enabled, status, createdAt) 
     VALUES (?, ?, ?, ?, ?, ?);`,
    [
      medication.name,
      medication.dosage,
      medication.time,
      medication.enabled ? 1 : 0,
      medication.status ?? "active",
      new Date().toISOString(),
    ]
  );

  return result.lastInsertRowId as number;
};

export const getMedications = async (): Promise<Medication[]> => {
  if (!db) throw new Error("Database not initialized");

  const result = await db.getAllAsync<any>(
    "SELECT * FROM medications ORDER BY time;"
  );

  return result.map((item) => ({
    ...item,
    enabled: item.enabled === 1,
  })) as Medication[];
};

export const updateMedicationStatus = async (
  id: number,
  status: Medication["status"]
): Promise<void> => {
  if (!db) throw new Error("Database not initialized");

  await db.runAsync(
    `UPDATE medications SET status = ? WHERE id = ?;`,
    [status ?? "active", id] // fallback ensures no undefined
  );
};


export const deleteMedication = async (id: number): Promise<void> => {
  if (!db) throw new Error("Database not initialized");
  await db.runAsync("DELETE FROM medications WHERE id = ?;", [id]);
};

//
// Log operations
//
export const addLogEntry = async (log: CreateLogEntry): Promise<number> => {
  if (!db) throw new Error("Database not initialized");

  // Begin transaction
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

    // Sync medication status with latest log
    await updateMedicationStatus(log.medicationId, log.status);

    await db.execAsync("COMMIT;");
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
// User profile operations
//
export const getUserProfile = async (): Promise<UserProfile | null> => {
  if (!db) throw new Error("Database not initialized");

  const result = await db.getAllAsync<any>(
    "SELECT * FROM user_profile WHERE id = 1;"
  );

  if (result.length > 0) {
    const user = result[0];
    return {
      ...user,
      preferences: JSON.parse(user.preferences),
    } as UserProfile;
  }

  return null;
};

export const saveUserProfile = async (profile: Partial<UserProfile>): Promise<void> => {
  if (!db) throw new Error("Database not initialized");

  const now = new Date().toISOString();
  const existing = await db.getAllAsync<any>(
    "SELECT id FROM user_profile WHERE id = 1;"
  );

  if (existing.length > 0) {
    // Update existing user
    await db.runAsync(
      `UPDATE user_profile 
       SET name = ?, email = ?, phone = ?, preferences = ?, updatedAt = ?
       WHERE id = 1;`,
      [
        profile.name ?? "User",
        profile.email ?? null,
        profile.phone ?? null,
        JSON.stringify(profile.preferences ?? defaultPreferences),
        now,
      ]
    );
  } else {
    // Insert new user
    await db.runAsync(
      `INSERT INTO user_profile (id, name, email, phone, preferences, createdAt, updatedAt) 
       VALUES (1, ?, ?, ?, ?, ?, ?);`,
      [
        profile.name ?? "User",
        profile.email ?? null,
        profile.phone ?? null,
        JSON.stringify(profile.preferences ?? defaultPreferences),
        now,
        now,
      ]
    );
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
        OR (repeatType = 'weekly' AND weekday = ${weekday})
        OR (repeatType = 'monthly' AND day = ${day})
      );
  `);

  console.log("🔄 Medication statuses reset for new day");
};

