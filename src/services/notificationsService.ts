import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const CHANNEL_ID = 'daily-drawing-reminder';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export function parseReminderTime(timeStr: string): { hour: number; minute: number } {
  const [hRaw, mRaw] = timeStr.split(':');
  const hour = Math.min(23, Math.max(0, Number(hRaw) || 19));
  const minute = Math.min(59, Math.max(0, Number(mRaw) || 0));
  return { hour, minute };
}

export function formatReminderTime(hour: number, minute: number): string {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

async function ensureChannelAsync(): Promise<void> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Daily Drawing Reminders',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 200, 100, 200],
      lightColor: '#BA623E',
    });
  }
}

export async function configureDailyReminder(
  enabled: boolean,
  timeStr: string
): Promise<{ granted: boolean }> {
  await Notifications.cancelAllScheduledNotificationsAsync();

  if (!enabled) {
    return { granted: true };
  }

  const existing = await Notifications.getPermissionsAsync();
  let status = existing.status;
  if (status !== 'granted') {
    const requested = await Notifications.requestPermissionsAsync();
    status = requested.status;
  }
  if (status !== 'granted') {
    return { granted: false };
  }

  await ensureChannelAsync();
  const { hour, minute } = parseReminderTime(timeStr);

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Time for your 60-minute drawing session',
      body: '15m warm-up + 45m deliberate practice keeps your streak alive.',
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
      channelId: Platform.OS === 'android' ? CHANNEL_ID : undefined,
    },
  });

  return { granted: true };
}
