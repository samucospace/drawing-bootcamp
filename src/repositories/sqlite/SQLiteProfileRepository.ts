import { generateUuid, getDatabase, nowIso } from '../../db/database';
import { IProfileRepository, ThemePref, UserProfile } from '../types';

interface UserProfileRow {
  id: string;
  reminder_enabled: number;
  reminder_time: string;
  keep_awake_default: number;
  theme_preference: string;
  onboarding_dismissed: number;
  created_at: string;
  updated_at: string;
}

function mapProfile(row: UserProfileRow): UserProfile {
  return {
    id: row.id,
    reminder_enabled: row.reminder_enabled === 1,
    reminder_time: row.reminder_time,
    keep_awake_default: row.keep_awake_default === 1,
    theme_preference: (row.theme_preference as ThemePref) || 'system',
    onboarding_dismissed: row.onboarding_dismissed === 1,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export class SQLiteProfileRepository implements IProfileRepository {
  async getOrCreateProfile(): Promise<UserProfile> {
    const db = await getDatabase();
    const existing = await db.getFirstAsync<UserProfileRow>('SELECT * FROM user_profile LIMIT 1;');
    if (existing) {
      return mapProfile(existing);
    }

    const id = generateUuid();
    const ts = nowIso();
    await db.runAsync(
      `INSERT INTO user_profile (id, reminder_enabled, reminder_time, keep_awake_default, theme_preference, onboarding_dismissed, created_at, updated_at)
       VALUES (?, 0, '19:00', 1, 'system', 0, ?, ?);`,
      id,
      ts,
      ts
    );

    const created = await db.getFirstAsync<UserProfileRow>('SELECT * FROM user_profile WHERE id = ?;', id);
    if (!created) {
      throw new Error('Failed to create anonymous user profile.');
    }
    return mapProfile(created);
  }

  async updateSettings(
    partial: Partial<
      Pick<
        UserProfile,
        'reminder_enabled' | 'reminder_time' | 'keep_awake_default' | 'theme_preference' | 'onboarding_dismissed'
      >
    >
  ): Promise<UserProfile> {
    const db = await getDatabase();
    const current = await this.getOrCreateProfile();
    const ts = nowIso();

    const nextReminderEnabled = partial.reminder_enabled ?? current.reminder_enabled;
    const nextReminderTime = partial.reminder_time ?? current.reminder_time;
    const nextKeepAwake = partial.keep_awake_default ?? current.keep_awake_default;
    const nextTheme = partial.theme_preference ?? current.theme_preference;
    const nextDismissed = partial.onboarding_dismissed ?? current.onboarding_dismissed;

    await db.runAsync(
      `UPDATE user_profile
       SET reminder_enabled = ?,
           reminder_time = ?,
           keep_awake_default = ?,
           theme_preference = ?,
           onboarding_dismissed = ?,
           updated_at = ?
       WHERE id = ?;`,
      nextReminderEnabled ? 1 : 0,
      nextReminderTime,
      nextKeepAwake ? 1 : 0,
      nextTheme,
      nextDismissed ? 1 : 0,
      ts,
      current.id
    );

    const updated = await db.getFirstAsync<UserProfileRow>('SELECT * FROM user_profile WHERE id = ?;', current.id);
    if (!updated) {
      throw new Error('Failed to reload user profile after update.');
    }
    return mapProfile(updated);
  }
}
