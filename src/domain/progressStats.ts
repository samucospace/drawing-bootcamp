import { BackupPayloadV1, DayProgress, DayStatus } from '../repositories/types';

export interface CourseStats {
  completedDays: number;
  inProgressDays: number;
  totalSeconds: number;
  totalHoursFormatted: string;
  currentStreak: number;
  nextDayNumber: number;
}

export function deriveDayStatus(
  theoryCompleted: boolean,
  exerciseCompleted: boolean,
  timeSpentSeconds: number,
  userNotes: string
): DayStatus {
  if (theoryCompleted && exerciseCompleted) {
    return 'completed';
  }
  if (theoryCompleted || exerciseCompleted || timeSpentSeconds > 0 || userNotes.trim().length > 0) {
    return 'in_progress';
  }
  return 'not_started';
}

function toLocalDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function shiftDateKey(dateKey: string, deltaDays: number): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const dt = new Date(y, m - 1, d + deltaDays);
  return toLocalDateKey(dt);
}

/**
 * Computes dashboard statistics from local progress records.
 * Streak counts consecutive calendar days with at least one completed day,
 * ending on today or yesterday (so a streak stays alive until midnight tonight).
 */
export function computeCourseStats(
  progressList: DayProgress[],
  referenceNow: Date = new Date()
): CourseStats {
  const byDay = new Map<number, DayProgress>();
  const completedDateKeys = new Set<string>();
  let totalSeconds = 0;
  let completedDays = 0;
  let inProgressDays = 0;

  for (const row of progressList) {
    byDay.set(row.day_number, row);
    totalSeconds += Math.max(0, row.time_spent_seconds || 0);
    if (row.status === 'completed') {
      completedDays += 1;
      if (row.completed_at) {
        const parsed = new Date(row.completed_at);
        if (!Number.isNaN(parsed.getTime())) {
          completedDateKeys.add(toLocalDateKey(parsed));
        }
      }
    } else if (row.status === 'in_progress') {
      inProgressDays += 1;
    }
  }

  // Next uncompleted day 1..30 (or 30 if all 30 are completed)
  let nextDayNumber = 30;
  for (let d = 1; d <= 30; d++) {
    const rec = byDay.get(d);
    if (!rec || rec.status !== 'completed') {
      nextDayNumber = d;
      break;
    }
  }

  // Consecutive streak
  const todayKey = toLocalDateKey(referenceNow);
  const yesterdayKey = shiftDateKey(todayKey, -1);
  let cursor = completedDateKeys.has(todayKey)
    ? todayKey
    : completedDateKeys.has(yesterdayKey)
      ? yesterdayKey
      : null;

  let currentStreak = 0;
  while (cursor && completedDateKeys.has(cursor)) {
    currentStreak += 1;
    cursor = shiftDateKey(cursor, -1);
  }

  const hours = totalSeconds / 3600;
  const totalHoursFormatted =
    hours < 0.1 && totalSeconds > 0
      ? `${Math.max(1, Math.round(totalSeconds / 60))}m`
      : `${hours.toFixed(1)}h`;

  return {
    completedDays,
    inProgressDays,
    totalSeconds,
    totalHoursFormatted,
    currentStreak,
    nextDayNumber,
  };
}

export function validateBackupPayload(raw: unknown): BackupPayloadV1 {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Backup file is not a valid JSON object.');
  }
  const obj = raw as Record<string, unknown>;
  if (obj.schema_version !== 1) {
    throw new Error('Unsupported backup schema version.');
  }
  if (!Array.isArray(obj.day_progress)) {
    throw new Error('Backup file is missing day_progress array.');
  }
  return obj as unknown as BackupPayloadV1;
}
