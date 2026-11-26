import { generateUuid, getDatabase, nowIso } from '../../db/database';
import { ISketchRepository, SketchUpload, SyncStatus } from '../types';
import { SQLiteProgressRepository } from './SQLiteProgressRepository';

interface SketchRow {
  id: string;
  day_progress_id: string;
  day_number: number;
  local_file_uri: string;
  remote_file_url: string | null;
  created_at: string;
  deleted_at: string | null;
  sync_status: string;
}

function mapSketch(row: SketchRow): SketchUpload {
  return {
    id: row.id,
    day_progress_id: row.day_progress_id,
    day_number: row.day_number,
    local_file_uri: row.local_file_uri,
    remote_file_url: row.remote_file_url,
    created_at: row.created_at,
    deleted_at: row.deleted_at,
    sync_status: (row.sync_status as SyncStatus) || 'local_only',
  };
}

export class SQLiteSketchRepository implements ISketchRepository {
  private progressRepo = new SQLiteProgressRepository();

  async getAllSketches(): Promise<SketchUpload[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<SketchRow>(
      'SELECT * FROM sketch_uploads WHERE deleted_at IS NULL ORDER BY day_number ASC, created_at DESC;'
    );
    return rows.map(mapSketch);
  }

  async getSketchesForDay(dayNumber: number): Promise<SketchUpload[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<SketchRow>(
      'SELECT * FROM sketch_uploads WHERE day_number = ? AND deleted_at IS NULL ORDER BY created_at DESC;',
      dayNumber
    );
    return rows.map(mapSketch);
  }

  async addSketch(userId: string, dayNumber: number, localFileUri: string): Promise<SketchUpload> {
    const db = await getDatabase();
    const dayProgress = await this.progressRepo.ensureDayRow(userId, dayNumber);
    const id = generateUuid();
    const ts = nowIso();

    await db.runAsync(
      `INSERT INTO sketch_uploads (id, day_progress_id, day_number, local_file_uri, remote_file_url, created_at, deleted_at, sync_status)
       VALUES (?, ?, ?, ?, NULL, ?, NULL, 'local_only');`,
      id,
      dayProgress.id,
      dayNumber,
      localFileUri,
      ts
    );

    const created = await db.getFirstAsync<SketchRow>('SELECT * FROM sketch_uploads WHERE id = ?;', id);
    if (!created) {
      throw new Error('Failed to save sketch upload.');
    }
    return mapSketch(created);
  }

  async softDeleteSketch(id: string): Promise<void> {
    const db = await getDatabase();
    const ts = nowIso();
    await db.runAsync(
      "UPDATE sketch_uploads SET deleted_at = ?, sync_status = 'local_only' WHERE id = ?;",
      ts,
      id
    );
  }
}
