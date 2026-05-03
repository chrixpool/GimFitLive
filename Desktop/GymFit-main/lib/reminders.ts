import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export type ReminderSettings = {
  workoutEnabled: boolean;
  calorieEnabled: boolean;
  workoutTime: string;
  calorieTime: string;
  workoutNotificationId?: string;
  calorieNotificationId?: string;
};

const REMINDER_KEY = 'gym_tunisia:reminders';

const DEFAULT_SETTINGS: ReminderSettings = {
  workoutEnabled: false,
  calorieEnabled: false,
  workoutTime: '18:00',
  calorieTime: '21:00',
};

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const parseTime = (time: string) => {
  const [hourRaw, minuteRaw] = time.split(':');
  const hour = Math.max(0, Math.min(23, Number.parseInt(hourRaw, 10) || 0));
  const minute = Math.max(0, Math.min(59, Number.parseInt(minuteRaw, 10) || 0));
  return { hour, minute };
};

const cancelNotification = async (id?: string) => {
  if (!id || Platform.OS === 'web') return;

  try {
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch {
    // The notification may already be gone.
  }
};

export const getReminderSettings = async (): Promise<ReminderSettings> => {
  try {
    const value = await AsyncStorage.getItem(REMINDER_KEY);
    return value ? { ...DEFAULT_SETTINGS, ...JSON.parse(value) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
};

export const requestReminderPermission = async () => {
  if (Platform.OS === 'web') {
    if (typeof Notification === 'undefined') return false;
    const result = await Notification.requestPermission();
    return result === 'granted';
  }

  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
};

const scheduleDailyReminder = async (title: string, body: string, time: string) => {
  if (Platform.OS === 'web') return undefined;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('daily-coach', {
      name: 'Daily coach reminders',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const { hour, minute } = parseTime(time);
  return Notifications.scheduleNotificationAsync({
    content: { title, body },
    trigger: {
      channelId: Platform.OS === 'android' ? 'daily-coach' : undefined,
      hour,
      minute,
      repeats: true,
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
    } as Notifications.NotificationTriggerInput,
  });
};

export const saveReminderSettings = async (settings: ReminderSettings) => {
  const current = await getReminderSettings();
  await cancelNotification(current.workoutNotificationId);
  await cancelNotification(current.calorieNotificationId);

  const next: ReminderSettings = {
    ...settings,
    workoutNotificationId: undefined,
    calorieNotificationId: undefined,
  };

  const granted = settings.workoutEnabled || settings.calorieEnabled ? await requestReminderPermission() : true;

  if (granted && settings.workoutEnabled) {
    next.workoutNotificationId = await scheduleDailyReminder('Time to train', 'Open your Gym Tunisia plan and keep the streak alive.', settings.workoutTime);
  }

  if (granted && settings.calorieEnabled) {
    next.calorieNotificationId = await scheduleDailyReminder('Check your calorie target', 'Log dinner or adjust your target before the day closes.', settings.calorieTime);
  }

  await AsyncStorage.setItem(REMINDER_KEY, JSON.stringify(next));
  return next;
};

export const sendTestReminder = async () => {
  const granted = await requestReminderPermission();
  if (!granted) throw new Error('Notification permission was not granted.');

  if (Platform.OS === 'web') {
    new Notification('Gym Tunisia coach', { body: 'Your reminders are ready.' });
    return;
  }

  await Notifications.scheduleNotificationAsync({
    content: { title: 'Gym Tunisia coach', body: 'Your reminders are ready.' },
    trigger: null,
  });
};
