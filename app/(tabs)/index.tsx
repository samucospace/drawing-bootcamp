import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useAppData } from '@/src/context/AppDataContext';
import { getDayByNumber, getWeeksGrouped } from '@/src/curriculum/curriculumService';
import { DayStatus } from '@/src/repositories/types';
import { configureDailyReminder } from '@/src/services/notificationsService';
import { useAppTheme } from '@/src/theme/ThemeContext';

export default function DashboardScreen() {
  const { colors } = useAppTheme();
  const { ready, profile, progressMap, stats, updateProfileSettings } = useAppData();
  const weeks = useMemo(() => getWeeksGrouped(), []);
  const [collapsedWeeks, setCollapsedWeeks] = useState<Record<number, boolean>>({});

  const nextDay = getDayByNumber(stats.nextDayNumber);
  const progressPct = Math.round((stats.completedDays / 30) * 100);

  const toggleWeek = (weekNum: number) => {
    setCollapsedWeeks((prev) => ({ ...prev, [weekNum]: !prev[weekNum] }));
  };

  const handleQuickEnableReminder = async () => {
    try {
      const { granted } = await configureDailyReminder(true, '19:00');
      if (!granted) {
        Alert.alert(
          'Notification Permission Needed',
          'Enable notifications in your phone settings to receive daily 7:00 PM reminders.'
        );
        return;
      }
      await updateProfileSettings({
        reminder_enabled: true,
        reminder_time: '19:00',
        onboarding_dismissed: true,
      });
      Alert.alert('Daily Habit Set', 'You will get a gentle reminder every day at 19:00.');
    } catch {
      Alert.alert('Could Not Schedule', 'You can configure reminders anytime in Settings.');
    }
  };

  const handleDismissOnboarding = async () => {
    await updateProfileSettings({ onboarding_dismissed: true });
  };

  const renderStatusPill = (status: DayStatus) => {
    if (status === 'completed') {
      return (
        <View style={[styles.statusBadge, { backgroundColor: colors.successSoft }]}>
          <Ionicons name="checkmark-circle" size={14} color={colors.success} />
          <Text style={[styles.statusBadgeText, { color: colors.success }]}>Done</Text>
        </View>
      );
    }
    if (status === 'in_progress') {
      return (
        <View style={[styles.statusBadge, { backgroundColor: colors.warningSoft }]}>
          <Ionicons name="time-outline" size={14} color={colors.warning} />
          <Text style={[styles.statusBadgeText, { color: colors.warning }]}>In Progress</Text>
        </View>
      );
    }
    return <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />;
  };

  if (!ready) {
    return (
      <View style={[styles.loadingWrap, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.bg }]}
      contentContainerStyle={styles.content}>
      {profile && !profile.onboarding_dismissed && !profile.reminder_enabled && (
        <View
          style={[
            styles.bannerCard,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}>
          <View style={styles.bannerHeader}>
            <Ionicons name="notifications-outline" size={20} color={colors.accent} />
            <Text style={[styles.bannerTitle, { color: colors.text }]}>
              Build a daily 60-minute habit
            </Text>
          </View>
          <Text style={[styles.bannerBody, { color: colors.textMuted }]}>
            Set a gentle 7:00 PM practice reminder? No account needed — all progress stays on your phone.
          </Text>
          <View style={styles.bannerActions}>
            <Pressable
              onPress={handleQuickEnableReminder}
              style={[styles.bannerPrimaryBtn, { backgroundColor: colors.accent }]}>
              <Text style={[styles.bannerPrimaryText, { color: colors.accentText }]}>
                Set 7:00 PM Reminder
              </Text>
            </Pressable>
            <Pressable onPress={handleDismissOnboarding} style={styles.bannerSkipBtn}>
              <Text style={[styles.bannerSkipText, { color: colors.textMuted }]}>Not now</Text>
            </Pressable>
          </View>
        </View>
      )}

      <View
        style={[
          styles.card,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}>
        <View style={styles.progressTopRow}>
          <View>
            <Text style={[styles.cardEyebrow, { color: colors.textMuted }]}>COURSE PROGRESS</Text>
            <Text style={[styles.progressHeadline, { color: colors.text }]}>
              {stats.completedDays} / 30 Days Completed
            </Text>
          </View>
          <View style={[styles.pctPill, { backgroundColor: colors.surfaceAlt }]}>
            <Text style={[styles.pctText, { color: colors.accent }]}>{progressPct}%</Text>
          </View>
        </View>

        <View style={[styles.track, { backgroundColor: colors.surfaceAlt }]}>
          <View
            style={[
              styles.fill,
              { backgroundColor: colors.accent, width: `${Math.max(progressPct, 2)}%` },
            ]}
          />
        </View>

        <View style={styles.metricsRow}>
          <View style={[styles.metricBox, { backgroundColor: colors.surfaceAlt }]}>
            <Ionicons name="flame-outline" size={18} color={colors.accent} />
            <View>
              <Text style={[styles.metricVal, { color: colors.text }]}>
                {stats.currentStreak} {stats.currentStreak === 1 ? 'Day' : 'Days'}
              </Text>
              <Text style={[styles.metricLabel, { color: colors.textMuted }]}>Current Streak</Text>
            </View>
          </View>

          <View style={[styles.metricBox, { backgroundColor: colors.surfaceAlt }]}>
            <Ionicons name="hourglass-outline" size={18} color={colors.accent} />
            <View>
              <Text style={[styles.metricVal, { color: colors.text }]}>
                {stats.totalHoursFormatted}
              </Text>
              <Text style={[styles.metricLabel, { color: colors.textMuted }]}>Practice Logged</Text>
            </View>
          </View>
        </View>
      </View>

      {nextDay && (
        <Pressable
          onPress={() => router.push(`/lesson/${nextDay.day_number}`)}
          style={({ pressed }) => [
            styles.ctaCard,
            {
              backgroundColor: colors.accent,
              opacity: pressed ? 0.92 : 1,
            },
          ]}>
          <View style={styles.ctaTextCol}>
            <Text style={[styles.ctaEyebrow, { color: colors.accentText }]}>
              {stats.completedDays >= 30 ? 'COURSE COMPLETE' : `UP NEXT • WEEK ${nextDay.week}`}
            </Text>
            <Text style={[styles.ctaTitle, { color: colors.accentText }]}>
              Day {nextDay.day_number}: {nextDay.title}
            </Text>
            <Text style={[styles.ctaSub, { color: colors.accentText }]}>
              15m Theory & Warm-Up • 45m Exercise
            </Text>
          </View>
          <View style={[styles.ctaCircle, { backgroundColor: 'rgba(255,255,255,0.22)' }]}>
            <Ionicons name="arrow-forward" size={22} color={colors.accentText} />
          </View>
        </Pressable>
      )}

      <Text style={[styles.sectionHeader, { color: colors.text }]}>Curriculum</Text>

      {weeks.map((weekGroup) => {
        const isCollapsed = !!collapsedWeeks[weekGroup.week];
        const doneInWeek = weekGroup.days.filter(
          (d) => progressMap[d.day_number]?.status === 'completed'
        ).length;

        return (
          <View
            key={weekGroup.week}
            style={[
              styles.weekCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}>
            <Pressable onPress={() => toggleWeek(weekGroup.week)} style={styles.weekHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.weekEyebrow, { color: colors.textMuted }]}>
                  {weekGroup.week === 5 ? 'DAYS 29–30' : `WEEK ${weekGroup.week}`} • {doneInWeek}/{weekGroup.days.length} DONE
                </Text>
                <Text style={[styles.weekTitle, { color: colors.text }]}>
                  {weekGroup.week_title}
                </Text>
              </View>
              <Ionicons
                name={isCollapsed ? 'chevron-down' : 'chevron-up'}
                size={20}
                color={colors.textMuted}
              />
            </Pressable>

            {!isCollapsed && (
              <View style={[styles.dayList, { borderTopColor: colors.border }]}>
                {weekGroup.days.map((day, idx) => {
                  const prog = progressMap[day.day_number];
                  const status: DayStatus = prog?.status ?? 'not_started';
                  const isNext = day.day_number === stats.nextDayNumber && stats.completedDays < 30;

                  return (
                    <Pressable
                      key={day.day_number}
                      onPress={() => router.push(`/lesson/${day.day_number}`)}
                      style={({ pressed }) => [
                        styles.dayRow,
                        idx > 0 && {
                          borderTopWidth: StyleSheet.hairlineWidth,
                          borderTopColor: colors.border,
                        },
                        pressed && { backgroundColor: colors.surfaceAlt },
                      ]}>
                      <View
                        style={[
                          styles.dayNumCircle,
                          {
                            backgroundColor:
                              status === 'completed'
                                ? colors.successSoft
                                : isNext
                                  ? colors.accent
                                  : colors.surfaceAlt,
                          },
                        ]}>
                        <Text
                          style={[
                            styles.dayNumText,
                            {
                              color:
                                status === 'completed'
                                  ? colors.success
                                  : isNext
                                    ? colors.accentText
                                    : colors.text,
                            },
                          ]}>
                          {day.day_number}
                        </Text>
                      </View>

                      <View style={{ flex: 1 }}>
                        <Text style={[styles.dayTitle, { color: colors.text }]} numberOfLines={1}>
                          {day.title}
                        </Text>
                        <Text style={[styles.dayMeta, { color: colors.textMuted }]}>
                          {day.exercise.timer_mode === 'interval'
                            ? `15m Theory • ${day.exercise.interval_seconds}s Gesture Intervals`
                            : '15m Theory • 45m Exercise'}
                        </Text>
                      </View>

                      {renderStatusPill(status)}
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 32, gap: 14 },
  bannerCard: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 8 },
  bannerHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bannerTitle: { fontSize: 15, fontWeight: '700' },
  bannerBody: { fontSize: 13, lineHeight: 19 },
  bannerActions: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4 },
  bannerPrimaryBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  bannerPrimaryText: { fontSize: 13, fontWeight: '700' },
  bannerSkipBtn: { paddingHorizontal: 10, paddingVertical: 8 },
  bannerSkipText: { fontSize: 13, fontWeight: '600' },
  card: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 12 },
  progressTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardEyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 0.7 },
  progressHeadline: { fontSize: 20, fontWeight: '700', marginTop: 2 },
  pctPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  pctText: { fontSize: 14, fontWeight: '700' },
  track: { height: 8, borderRadius: 999, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 999 },
  metricsRow: { flexDirection: 'row', gap: 10 },
  metricBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: 12,
  },
  metricVal: { fontSize: 15, fontWeight: '700' },
  metricLabel: { fontSize: 11 },
  ctaCard: {
    borderRadius: 16,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  ctaTextCol: { flex: 1, gap: 4 },
  ctaEyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, opacity: 0.9 },
  ctaTitle: { fontSize: 18, fontWeight: '700' },
  ctaSub: { fontSize: 13, opacity: 0.9 },
  ctaCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeader: { fontSize: 18, fontWeight: '700', marginTop: 4 },
  weekCard: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  weekHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
  },
  weekEyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 0.6 },
  weekTitle: { fontSize: 16, fontWeight: '700', marginTop: 2 },
  dayList: { borderTopWidth: 1 },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  dayNumCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayNumText: { fontSize: 14, fontWeight: '700' },
  dayTitle: { fontSize: 15, fontWeight: '600' },
  dayMeta: { fontSize: 12, marginTop: 2 },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusBadgeText: { fontSize: 11, fontWeight: '700' },
});
