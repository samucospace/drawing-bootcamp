import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { computeCourseStats, CourseStats } from '../domain/progressStats';
import { SQLiteProfileRepository } from '../repositories/sqlite/SQLiteProfileRepository';
import { SQLiteProgressRepository } from '../repositories/sqlite/SQLiteProgressRepository';
import { SQLiteSketchRepository } from '../repositories/sqlite/SQLiteSketchRepository';
import { BackupPayloadV1, DayProgress, SketchUpload, UserProfile } from '../repositories/types';
import { AppThemeProvider } from '../theme/ThemeContext';

interface AppDataContextValue {
  ready: boolean;
  profile: UserProfile | null;
  progressMap: Record<number, DayProgress>;
  progressList: DayProgress[];
  sketches: SketchUpload[];
  stats: CourseStats;
  pendingSyncCount: number;
  refreshAll: () => Promise<void>;
  updateProfileSettings: (
    partial: Partial<
      Pick<
        UserProfile,
        'reminder_enabled' | 'reminder_time' | 'keep_awake_default' | 'theme_preference' | 'onboarding_dismissed'
      >
    >
  ) => Promise<void>;
  toggleTheory: (dayNumber: number, done: boolean) => Promise<void>;
  toggleExercise: (dayNumber: number, done: boolean) => Promise<void>;
  addPracticeSeconds: (dayNumber: number, seconds: number) => Promise<void>;
  saveNotes: (dayNumber: number, notes: string) => Promise<void>;
  addSketch: (dayNumber: number, localFileUri: string) => Promise<SketchUpload>;
  deleteSketch: (id: string) => Promise<void>;
  exportBackup: () => Promise<BackupPayloadV1>;
  importBackup: (payload: BackupPayloadV1) => Promise<number>;
}

const AppDataContext = createContext<AppDataContextValue | null>(null);

const profileRepo = new SQLiteProfileRepository();
const progressRepo = new SQLiteProgressRepository();
const sketchRepo = new SQLiteSketchRepository();

export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [progressList, setProgressList] = useState<DayProgress[]>([]);
  const [sketches, setSketches] = useState<SketchUpload[]>([]);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);

  const refreshAll = useCallback(async () => {
    const p = await profileRepo.getOrCreateProfile();
    const [prog, sk, pending] = await Promise.all([
      progressRepo.getAllProgress(p.id),
      sketchRepo.getAllSketches(),
      progressRepo.getPendingSyncCount(p.id),
    ]);
    setProfile(p);
    setProgressList(prog);
    setSketches(sk);
    setPendingSyncCount(pending);
    setReady(true);
  }, []);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  const progressMap = useMemo(() => {
    const map: Record<number, DayProgress> = {};
    for (const item of progressList) {
      map[item.day_number] = item;
    }
    return map;
  }, [progressList]);

  const stats = useMemo(() => computeCourseStats(progressList), [progressList]);

  const updateProfileSettings = useCallback(
    async (
      partial: Partial<
        Pick<
          UserProfile,
          'reminder_enabled' | 'reminder_time' | 'keep_awake_default' | 'theme_preference' | 'onboarding_dismissed'
        >
      >
    ) => {
      const updated = await profileRepo.updateSettings(partial);
      setProfile(updated);
    },
    []
  );

  const upsertLocalProgress = useCallback((updated: DayProgress) => {
    setProgressList((prev) => {
      const idx = prev.findIndex((x) => x.day_number === updated.day_number);
      if (idx === -1) return [...prev, updated].sort((a, b) => a.day_number - b.day_number);
      const copy = [...prev];
      copy[idx] = updated;
      return copy;
    });
    setPendingSyncCount((c) => c + 1);
  }, []);

  const toggleTheory = useCallback(
    async (dayNumber: number, done: boolean) => {
      if (!profile) return;
      const updated = await progressRepo.toggleTheory(profile.id, dayNumber, done);
      upsertLocalProgress(updated);
    },
    [profile, upsertLocalProgress]
  );

  const toggleExercise = useCallback(
    async (dayNumber: number, done: boolean) => {
      if (!profile) return;
      const updated = await progressRepo.toggleExercise(profile.id, dayNumber, done);
      upsertLocalProgress(updated);
    },
    [profile, upsertLocalProgress]
  );

  const addPracticeSeconds = useCallback(
    async (dayNumber: number, seconds: number) => {
      if (!profile || seconds <= 0) return;
      const updated = await progressRepo.addPracticeSeconds(profile.id, dayNumber, seconds);
      upsertLocalProgress(updated);
    },
    [profile, upsertLocalProgress]
  );

  const saveNotes = useCallback(
    async (dayNumber: number, notes: string) => {
      if (!profile) return;
      const updated = await progressRepo.saveNotes(profile.id, dayNumber, notes);
      upsertLocalProgress(updated);
    },
    [profile, upsertLocalProgress]
  );

  const addSketch = useCallback(
    async (dayNumber: number, localFileUri: string) => {
      if (!profile) {
        throw new Error('Profile not ready');
      }
      const created = await sketchRepo.addSketch(profile.id, dayNumber, localFileUri);
      setSketches((prev) => [created, ...prev]);
      return created;
    },
    [profile]
  );

  const deleteSketch = useCallback(async (id: string) => {
    await sketchRepo.softDeleteSketch(id);
    setSketches((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const exportBackup = useCallback(async () => {
    const p = profile ?? (await profileRepo.getOrCreateProfile());
    return progressRepo.exportBackupJson(p.id);
  }, [profile]);

  const importBackup = useCallback(
    async (payload: BackupPayloadV1) => {
      const p = profile ?? (await profileRepo.getOrCreateProfile());
      const { importedDays } = await progressRepo.importBackupJson(p.id, payload);
      await refreshAll();
      return importedDays;
    },
    [profile, refreshAll]
  );

  const value: AppDataContextValue = {
    ready,
    profile,
    progressMap,
    progressList,
    sketches,
    stats,
    pendingSyncCount,
    refreshAll,
    updateProfileSettings,
    toggleTheory,
    toggleExercise,
    addPracticeSeconds,
    saveNotes,
    addSketch,
    deleteSketch,
    exportBackup,
    importBackup,
  };

  return (
    <AppThemeProvider preference={profile?.theme_preference ?? 'system'}>
      <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>
    </AppThemeProvider>
  );
}

export function useAppData(): AppDataContextValue {
  const ctx = useContext(AppDataContext);
  if (!ctx) {
    throw new Error('useAppData must be used inside AppDataProvider');
  }
  return ctx;
}
