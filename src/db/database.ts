import * as Crypto from 'expo-crypto';
import * as SQLite from 'expo-sqlite';

const DB_NAME = 'drawing_bootcamp.db';
const SCHEMA_VERSION = 1;

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export function generateUuid(): string {
  return Crypto.randomUUID();
}

export function nowIso(): string {
  return new Date().toISOString();
}

async function runMigrations(db: SQLite.SQLiteDatabase): Promise<void> {
  const versionRow = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version;');
  const currentVersion = versionRow?.user_version ?? 0;

  if (currentVersion < 1) {
    await db.execAsync(`
      PRAGMA journal_mode = WAL;
      PRAGMA foreign_keys = ON;

      CREATE TABLE IF NOT EXISTS user_profile (
        id TEXT PRIMARY KEY NOT NULL,
        reminder_enabled INTEGER NOT NULL DEFAULT 0,
        reminder_time TEXT NOT NULL DEFAULT '19:00',
        keep_awake_default INTEGER NOT NULL DEFAULT 1,
        theme_preference TEXT NOT NULL DEFAULT 'system',
        onboarding_dismissed INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS day_progress (
        id TEXT PRIMARY KEY NOT NULL,
        user_id TEXT NOT NULL,
        day_number INTEGER NOT NULL,
        theory_completed INTEGER NOT NULL DEFAULT 0,
        exercise_completed INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'not_started',
        time_spent_seconds INTEGER NOT NULL DEFAULT 0,
        user_notes TEXT NOT NULL DEFAULT '',
        completed_at TEXT,
        updated_at TEXT NOT NULL,
        sync_status TEXT NOT NULL DEFAULT 'local_only',
        FOREIGN KEY (user_id) REFERENCES user_profile(id) ON DELETE CASCADE,
        UNIQUE(user_id, day_number)
      );

      CREATE TABLE IF NOT EXISTS sketch_uploads (
        id TEXT PRIMARY KEY NOT NULL,
        day_progress_id TEXT NOT NULL,
        day_number INTEGER NOT NULL,
        local_file_uri TEXT NOT NULL,
        remote_file_url TEXT,
        created_at TEXT NOT NULL,
        deleted_at TEXT,
        sync_status TEXT NOT NULL DEFAULT 'local_only',
        FOREIGN KEY (day_progress_id) REFERENCES day_progress(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_day_progress_user_day ON day_progress(user_id, day_number);
      CREATE INDEX IF NOT EXISTS idx_sketch_uploads_day ON sketch_uploads(day_number);
      PRAGMA user_version = ${SCHEMA_VERSION};
    `);
  }
}

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync(DB_NAME);
      await runMigrations(db);
      return db;
    })();
  }
  return dbPromise;
}
