import { getCurriculum } from '../../curriculum/curriculumService';
import { generateUuid, getDatabase, nowIso } from '../../db/database';
import { deriveDayStatus } from '../../domain/progressStats';
import { BackupPayloadV1, DayProgress, DayStatus, IProgressRepository, SyncStatus } from '../types';
import { SQLiteProfileRepository } from './SQLiteProfileRepository';

interface DayProgressRow {
  id: string;
  user_id: string;
  day_number: number;
  theory_completed: number;
  exercise_completed: number;
  status: string;
  time_spent_seconds: number;
  user_notes: string;
  completed_at: string | null;
  updated_at: string;
  sync_status: string;
}

function mapProgress(row: DayProgressRow): DayProgress {
  return {
    id: row.id,
    user_id: row.user_id,
    day_number: row.day_number,
    theory_completed: row.theory_completed === 1,
    exercise_completed: row.exercise_completed === 1,
    status: row.status as DayStatus,
    time_spent_seconds: row.time_spent_seconds,
    user_notes: row.user_notes ?? '',
    completed_at: row.completed_at,
    updated_at: row.updated_at,
    sync_status: (row.sync_status as SyncStatus) || 'local_only',
  };
}

export class SQLiteProgressRepository implements IProgressRepository {
  async ensureDayRow(userId: string, dayNumber: number): Promise<DayProgress> {
    const db = await getDatabase();
    const existing = await db.getFirstAsync<DayProgressRow>(
      'SELECT * FROM day_progress WHERE user_id = ? AND day_number = ?;',
      userId,
      dayNumber
    );
    if (existing) {
      return mapProgress(existing);
    }

    const id = generateUuid();
    const ts = nowIso();
    await db.runAsync(
      `INSERT INTO day_progress (id, user_id, day_number, theory_completed, exercise_completed, status, time_spent_seconds, user_notes, completed_at, updated_at, sync_status)
       VALUES (?, ?, ?, 0, 0, 'not_started', 0, '', NULL, ?, 'local_only');`,
      id,
      userId,
      dayNumber,
      ts
    );

    const created = await db.getFirstAsync<DayProgressRow>('SELECT * FROM day_progress WHERE id = ?;', id);
    if (!created) {
      throw new Error(`Failed to initialize day ${dayNumber} progress.`);
    }
    return mapProgress(created);
  }

  async getAllProgress(userId: string): Promise<DayProgress[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<DayProgressRow>(
      'SELECT * FROM day_progress WHERE user_id = ? ORDER BY day_number ASC;',
      userId
    );
    return rows.map(mapProgress);
  }

  async getDayProgress(userId: string, dayNumber: number): Promise<DayProgress | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<DayProgressRow>(
      'SELECT * FROM day_progress WHERE user_id = ? AND day_number = ?;',
      userId,
      dayNumber
    );
    return row ? mapProgress(row) : null;
  }

  private async updateProgressFields(
    userId: string,
    dayNumber: number,
    updater: (cur: DayProgress) => {
      theory_completed: boolean;
      exercise_completed: boolean;
      time_spent_seconds: number;
      user_notes: string;
    }
  ): Promise<DayProgress> {
    const db = await getDatabase();
    const cur = await this.ensureDayRow(userId, dayNumber);
    const next = updater(cur);
    const status = deriveDayStatus(
      next.theory_completed,
      next.exercise_completed,
      next.time_spent_seconds,
      next.user_notes
    );
    const ts = nowIso();
    const completedAt =
      status === 'completed' ? cur.completed_at ?? ts : null;

    await db.runAsync(
      `UPDATE day_progress
       SET theory_completed = ?,
           exercise_completed = ?,
           status = ?,
           time_spent_seconds = ?,
           user_notes = ?,
           completed_at = ?,
           updated_at = ?,
           sync_status = 'local_only'
       WHERE id = ?;`,
      next.theory_completed ? 1 : 0,
      next.exercise_completed ? 1 : 0,
      status,
      next.time_spent_seconds,
      next.user_notes,
      completedAt,
      ts,
      cur.id
    );

    const updated = await db.getFirstAsync<DayProgressRow>('SELECT * FROM day_progress WHERE id = ?;', cur.id);
    if (!updated) {
      throw new Error(`Failed to reload day ${dayNumber} progress.`);
    }
    return mapProgress(updated);
  }

  async toggleTheory(userId: string, dayNumber: number, done: boolean): Promise<DayProgress> {
    return this.updateProgressFields(userId, dayNumber, (cur) => ({
      theory_completed: done,
      exercise_completed: cur.exercise_completed,
      time_spent_seconds: cur.time_spent_seconds,
      user_notes: cur.user_notes,
    }));
  }

  async toggleExercise(userId: string, dayNumber: number, done: boolean): Promise<DayProgress> {
    return this.updateProgressFields(userId, dayNumber, (cur) => ({
      theory_completed: cur.theory_completed,
      exercise_completed: done,
      time_spent_seconds: cur.time_spent_seconds,
      user_notes: cur.user_notes,
    }));
  }

  async addPracticeSeconds(userId: string, dayNumber: number, seconds: number): Promise<DayProgress> {
    const delta = Math.max(0, Math.round(seconds));
    return this.updateProgressFields(userId, dayNumber, (cur) => ({
      theory_completed: cur.theory_completed,
      exercise_completed: cur.exercise_completed,
      time_spent_seconds: cur.time_spent_seconds + delta,
      user_notes: cur.user_notes,
    }));
  }

  async saveNotes(userId: string, dayNumber: number, notes: string): Promise<DayProgress> {
    return this.updateProgressFields(userId, dayNumber, (cur) => ({
      theory_completed: cur.theory_completed,
      exercise_completed: cur.exercise_completed,
      time_spent_seconds: cur.time_spent_seconds,
      user_notes: notes,
    }));
  }

  async getPendingSyncCount(userId: string): Promise<number> {
    const db = await getDatabase();
    const pCount = await db.getFirstAsync<{ cnt: number }>(
      "SELECT COUNT(*) as cnt FROM day_progress WHERE user_id = ? AND sync_status != 'synced';",
      userId
    );
    const sCount = await db.getFirstAsync<{ cnt: number }>(
      "SELECT COUNT(*) as cnt FROM sketch_uploads WHERE sync_status != 'synced';"
    );
    return (pCount?.cnt ?? 0) + (sCount?.cnt ?? 0);
  }

  async exportBackupJson(userId: string): Promise<BackupPayloadV1> {
    const db = await getDatabase();
    const profileRepo = new SQLiteProfileRepository();
    const profile = await profileRepo.getOrCreateProfile();
    const day_progress = await this.getAllProgress(userId);
    const sketchRows = await db.getAllAsync<{
      id: string;
      day_progress_id: string;
      day_number: number;
      local_file_uri: string;
      remote_file_url: string | null;
      created_at: string;
      deleted_at: string | null;
      sync_status: string;
    }>('SELECT * FROM sketch_uploads ORDER BY created_at DESC;');

    return {
      schema_version: 1,
      exported_at: nowIso(),
      course_version: getCurriculum().course_version,
      profile,
      day_progress,
      sketch_uploads: sketchRows.map((r) => ({
        ...r,
        sync_status: (r.sync_status as SyncStatus) || 'local_only',
      })),
    };
  }

  async importBackupJson(
    userId: string,
    payload: BackupPayloadV1
  ): Promise<{ importedDays: number }> {
    const db = await getDatabase();
    let importedDays = 0;

    await db.withTransactionAsync(async () => {
      for (const item of payload.day_progress) {
        if (typeof item.day_number !== 'number' || item.day_number < 1 || item.day_number > 30) {
          continue;
        }
        const existing = await db.getFirstAsync<DayProgressRow>(
          'SELECT * FROM day_progress WHERE user_id = ? AND day_number = ?;',
          userId,
          item.day_number
        );

        const theory = Boolean(item.theory_completed);
        const exercise = Boolean(item.exercise_completed);
        const timeSec = Math.max(0, Number(item.time_spent_seconds) || 0);
        const notes = typeof item.user_notes === 'string' ? item.user_notes : '';
        const status = deriveDayStatus(theory, exercise, timeSec, notes);
        const updatedAt = item.updated_at || nowIso();
        const completedAt = status === 'completed' ? item.completed_at ?? updatedAt : null;

        if (!existing) {
          await db.runAsync(
            `INSERT INTO day_progress (id, user_id, day_number, theory_completed, exercise_completed, status, time_spent_seconds, user_notes, completed_at, updated_at, sync_status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'local_only');`,
            item.id || generateUuid(),
            userId,
            item.day_number,
            theory ? 1 : 0,
            exercise ? 1 : 0,
            status,
            timeSec,
            notes,
            completedAt,
            updatedAt
          );
          importedDays += 1;
        } else if (updatedAt >= existing.updated_at) {
          // Last-Write-Wins merge aligned with future cloud sync semantics
          await db.runAsync(
            `UPDATE day_progress
             SET theory_completed = ?,
                 exercise_completed = ?,
                 status = ?,
                 time_spent_seconds = ?,
                 user_notes = ?,
                 completed_at = ?,
                 updated_at = ?,
                 sync_status = 'local_only'
             WHERE id = ?;`,
            theory ? 1 : 0,
            exercise ? 1 : 0,
            status,
            timeSec,
            notes,
            completedAt,
            updatedAt,
            existing.id
          );
          importedDays += 1;
        }
      }
    });

    return { importedDays };
  }
}
