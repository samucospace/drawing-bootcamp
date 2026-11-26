export type DayStatus = 'not_started' | 'in_progress' | 'completed';
export type SyncStatus = 'local_only' | 'pending' | 'synced';
export type ThemePref = 'system' | 'light' | 'dark';

export interface UserProfile {
  id: string;
  reminder_enabled: boolean;
  reminder_time: string; // HH:MM
  keep_awake_default: boolean;
  theme_preference: ThemePref;
  onboarding_dismissed: boolean;
  created_at: string;
  updated_at: string;
}

export interface DayProgress {
  id: string;
  user_id: string;
  day_number: number;
  theory_completed: boolean;
  exercise_completed: boolean;
  status: DayStatus;
  time_spent_seconds: number;
  user_notes: string;
  completed_at: string | null;
  updated_at: string;
  sync_status: SyncStatus;
}

export interface SketchUpload {
  id: string;
  day_progress_id: string;
  day_number: number;
  local_file_uri: string;
  remote_file_url: string | null;
  created_at: string;
  deleted_at: string | null;
  sync_status: SyncStatus;
}

export interface BackupPayloadV1 {
  schema_version: 1;
  exported_at: string;
  course_version: string;
  profile: UserProfile;
  day_progress: DayProgress[];
  sketch_uploads: SketchUpload[];
}

export interface IProfileRepository {
  getOrCreateProfile(): Promise<UserProfile>;
  updateSettings(
    partial: Partial<
      Pick<
        UserProfile,
        'reminder_enabled' | 'reminder_time' | 'keep_awake_default' | 'theme_preference' | 'onboarding_dismissed'
      >
    >
  ): Promise<UserProfile>;
}

export interface IProgressRepository {
  getAllProgress(userId: string): Promise<DayProgress[]>;
  getDayProgress(userId: string, dayNumber: number): Promise<DayProgress | null>;
  toggleTheory(userId: string, dayNumber: number, done: boolean): Promise<DayProgress>;
  toggleExercise(userId: string, dayNumber: number, done: boolean): Promise<DayProgress>;
  addPracticeSeconds(userId: string, dayNumber: number, seconds: number): Promise<DayProgress>;
  saveNotes(userId: string, dayNumber: number, notes: string): Promise<DayProgress>;
  getPendingSyncCount(userId: string): Promise<number>;
  exportBackupJson(userId: string): Promise<BackupPayloadV1>;
  importBackupJson(userId: string, payload: BackupPayloadV1): Promise<{ importedDays: number }>;
}

export interface ISketchRepository {
  getAllSketches(): Promise<SketchUpload[]>;
  getSketchesForDay(dayNumber: number): Promise<SketchUpload[]>;
  addSketch(userId: string, dayNumber: number, localFileUri: string): Promise<SketchUpload>;
  softDeleteSketch(id: string): Promise<void>;
}
