import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { useAppData } from '@/src/context/AppDataContext';
import { ThemePref } from '@/src/repositories/types';
import {
  pickAndParseBackupJsonFile,
  shareBackupJsonFile,
} from '@/src/services/backupService';
import {
  configureDailyReminder,
  formatReminderTime,
  parseReminderTime,
} from '@/src/services/notificationsService';
import { useAppTheme } from '@/src/theme/ThemeContext';

export default function SettingsScreen() {
  const { colors } = useAppTheme();
  const {
    profile,
    pendingSyncCount,
    updateProfileSettings,
    exportBackup,
    importBackup,
  } = useAppData();

  const [busyBackup, setBusyBackup] = useState(false);

  if (!profile) {
    return null;
  }

  const { hour, minute } = parseReminderTime(profile.reminder_time);

  const handleToggleReminder = async (nextVal: boolean) => {
    try {
      const { granted } = await configureDailyReminder(nextVal, profile.reminder_time);
      if (nextVal && !granted) {
        Alert.alert(
          'Permission Denied',
          'Please allow notifications for 30-Day Drawing Course in Android Settings.'
        );
        return;
      }
      await updateProfileSettings({ reminder_enabled: nextVal });
    } catch (err) {
      Alert.alert('Reminder Error', String(err));
    }
  };

  const adjustReminderTime = async (deltaMinutes: number) => {
    let total = hour * 60 + minute + deltaMinutes;
    total = ((total % 1440) + 1440) % 1440;
    const nextHour = Math.floor(total / 60);
    const nextMin = total % 60;
    const nextStr = formatReminderTime(nextHour, nextMin);

    await updateProfileSettings({ reminder_time: nextStr });
    if (profile.reminder_enabled) {
      await configureDailyReminder(true, nextStr);
    }
  };

  const handleExportBackup = async () => {
    setBusyBackup(true);
    try {
      const payload = await exportBackup();
      await shareBackupJsonFile(payload);
    } catch (err) {
      Alert.alert('Export Failed', err instanceof Error ? err.message : String(err));
    } finally {
      setBusyBackup(false);
    }
  };

  const handleImportBackup = async () => {
    setBusyBackup(true);
    try {
      const payload = await pickAndParseBackupJsonFile();
      if (!payload) {
        setBusyBackup(false);
        return;
      }
      const importedCount = await importBackup(payload);
      Alert.alert(
        'Backup Imported',
        `Merged ${importedCount} day record(s) from your backup file.`
      );
    } catch (err) {
      Alert.alert('Import Failed', err instanceof Error ? err.message : String(err));
    } finally {
      setBusyBackup(false);
    }
  };

  const themeOptions: { value: ThemePref; label: string }[] = [
    { value: 'system', label: 'System' },
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
  ];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.bg }]}
      contentContainerStyle={styles.content}>
      {/* Practice Habit & Reminders */}
      <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>DAILY HABIT</Text>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.rowBetween}>
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Text style={[styles.rowTitle, { color: colors.text }]}>Daily Drawing Reminder</Text>
            <Text style={[styles.rowSub, { color: colors.textMuted }]}>
              Local notification for your 60-minute session
            </Text>
          </View>
          <Switch
            value={profile.reminder_enabled}
            onValueChange={handleToggleReminder}
            trackColor={{ false: colors.border, true: colors.accent }}
          />
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <View style={styles.rowBetween}>
          <View>
            <Text style={[styles.rowTitle, { color: colors.text }]}>Reminder Time</Text>
            <Text style={[styles.rowSub, { color: colors.textMuted }]}>Local device time</Text>
          </View>
          <View style={styles.timeStepper}>
            <Pressable
              onPress={() => adjustReminderTime(-30)}
              style={[styles.stepBtn, { backgroundColor: colors.surfaceAlt }]}>
              <Ionicons name="remove" size={18} color={colors.text} />
            </Pressable>
            <Text style={[styles.timeText, { color: colors.text }]}>{profile.reminder_time}</Text>
            <Pressable
              onPress={() => adjustReminderTime(30)}
              style={[styles.stepBtn, { backgroundColor: colors.surfaceAlt }]}>
              <Ionicons name="add" size={18} color={colors.text} />
            </Pressable>
          </View>
        </View>
      </View>

      {/* Studio Preferences */}
      <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>STUDIO PREFERENCES</Text>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.rowBetween}>
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Text style={[styles.rowTitle, { color: colors.text }]}>Keep Screen Awake</Text>
            <Text style={[styles.rowSub, { color: colors.textMuted }]}>
              Prevent sleep while viewing references or running timers
            </Text>
          </View>
          <Switch
            value={profile.keep_awake_default}
            onValueChange={(val) => updateProfileSettings({ keep_awake_default: val })}
            trackColor={{ false: colors.border, true: colors.accent }}
          />
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <View style={{ gap: 10 }}>
          <Text style={[styles.rowTitle, { color: colors.text }]}>Canvas Theme</Text>
          <View style={styles.segmentedRow}>
            {themeOptions.map((opt) => {
              const active = profile.theme_preference === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  onPress={() => updateProfileSettings({ theme_preference: opt.value })}
                  style={[
                    styles.segBtn,
                    {
                      backgroundColor: active ? colors.accent : colors.surfaceAlt,
                    },
                  ]}>
                  <Text
                    style={[
                      styles.segText,
                      { color: active ? colors.accentText : colors.text },
                    ]}>
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>

      {/* Local Backup */}
      <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>LOCAL BACKUP</Text>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.rowSub, { color: colors.textMuted }]}>
          Export your 30-day progress, timers, and reflection notes as a portable JSON file, or import a backup onto a new phone.
        </Text>
        <View style={styles.backupActions}>
          <Pressable
            disabled={busyBackup}
            onPress={handleExportBackup}
            style={[styles.backupBtn, { backgroundColor: colors.accent }]}>
            <Ionicons name="share-outline" size={18} color={colors.accentText} />
            <Text style={[styles.backupBtnText, { color: colors.accentText }]}>
              Export Backup (.json)
            </Text>
          </Pressable>

          <Pressable
            disabled={busyBackup}
            onPress={handleImportBackup}
            style={[
              styles.backupBtn,
              {
                backgroundColor: colors.surfaceAlt,
                borderWidth: 1,
                borderColor: colors.border,
              },
            ]}>
            <Ionicons name="download-outline" size={18} color={colors.text} />
            <Text style={[styles.backupBtnText, { color: colors.text }]}>
              Import Backup (.json)
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Cloud Sync Placeholder (Cloud-Ready Architecture) */}
      <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>CLOUD SYNC (V2 READY)</Text>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.cloudHeader}>
          <Ionicons name="cloud-offline-outline" size={22} color={colors.accent} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.rowTitle, { color: colors.text }]}>
              Offline-First Local Mode Active
            </Text>
            <Text style={[styles.rowSub, { color: colors.textMuted }]}>
              Cloud sync is coming in a future update. Your local records already carry UUIDs and sync timestamps.
            </Text>
          </View>
        </View>
        <View style={[styles.metaBox, { backgroundColor: colors.surfaceAlt }]}>
          <Text style={[styles.metaText, { color: colors.textMuted }]}>
            Device ID: {profile.id}
          </Text>
          <Text style={[styles.metaText, { color: colors.textMuted }]}>
            Local records ready for sync: {pendingSyncCount}
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 36, gap: 12 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.7,
    marginTop: 6,
    marginLeft: 4,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 14,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowTitle: { fontSize: 15, fontWeight: '600' },
  rowSub: { fontSize: 13, lineHeight: 18, marginTop: 2 },
  divider: { height: StyleSheet.hairlineWidth, width: '100%' },
  timeStepper: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeText: {
    fontSize: 16,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    minWidth: 50,
    textAlign: 'center',
  },
  segmentedRow: { flexDirection: 'row', gap: 8 },
  segBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    alignItems: 'center',
  },
  segText: { fontSize: 13, fontWeight: '600' },
  backupActions: { gap: 10 },
  backupBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
  },
  backupBtnText: { fontSize: 14, fontWeight: '700' },
  cloudHeader: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  metaBox: { borderRadius: 10, padding: 10, gap: 4 },
  metaText: {
    fontSize: 11,
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
  },
});
