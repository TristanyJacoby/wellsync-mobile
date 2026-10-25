import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { reminderTime } from '../utils/notifications';
import type { ReminderStyle, Task } from '../types';

// Native builds get real scheduled local notifications; the browser build
// can only notify while the app is open (true push needs a server sender).

const isNative = Capacitor.isNativePlatform();

/** Stable positive 31-bit int per task: the native API wants numeric ids. */
function notificationId(taskId: string): number {
  let h = 0;
  for (let i = 0; i < taskId.length; i++) h = (h * 31 + taskId.charCodeAt(i)) | 0;
  return Math.abs(h) || 1;
}

export type ReminderPermission = 'granted' | 'denied' | 'default' | 'unsupported';

export async function getReminderPermission(): Promise<ReminderPermission> {
  if (isNative) {
    const { display } = await LocalNotifications.checkPermissions();
    return display === 'granted' ? 'granted' : display === 'denied' ? 'denied' : 'default';
  }
  return 'Notification' in window ? Notification.permission : 'unsupported';
}

/** Call from a button tap, never on page load. */
export async function requestReminderPermission(): Promise<ReminderPermission> {
  if (isNative) {
    const { display } = await LocalNotifications.requestPermissions();
    if (display !== 'granted') return 'denied';
    // Android 12+: reminders fire on time only with "Alarms & reminders" allowed for the app, a
    // special setting the system keeps off by default. Open it once, from this button tap.
    try {
      const { exact_alarm } = await LocalNotifications.checkExactNotificationSetting();
      if (exact_alarm && exact_alarm !== 'granted') await LocalNotifications.changeExactNotificationSetting();
    } catch {
      // iOS and older Android have no such setting.
    }
    return 'granted';
  }
  if (!('Notification' in window)) return 'unsupported';
  return Notification.requestPermission();
}

/** Replaces every scheduled reminder with one per open task. Native only. */
export async function syncReminders(tasks: Task[], style?: ReminderStyle): Promise<void> {
  if (!isNative) return;
  if ((await LocalNotifications.checkPermissions()).display !== 'granted') return;

  const pending = await LocalNotifications.getPending();
  if (pending.notifications.length) await LocalNotifications.cancel({ notifications: pending.notifications });

  const notifications = tasks.flatMap((t) => {
    const at = reminderTime(t, style);
    if (!at) return [];
    return [
      {
        id: notificationId(t.id),
        title: t.title,
        body: t.dueTime ? `Due ${t.dueDate} at ${t.dueTime}` : `Due ${t.dueDate}`,
        // Fire even while the phone is dozing (idle), on time if exact alarms are allowed.
        schedule: { at, allowWhileIdle: true },
      },
    ];
  });
  if (notifications.length) await LocalNotifications.schedule({ notifications });
}

/** Immediate alert, e.g. a finished Pomodoro. Browser: only while permitted. */
export async function notifyNow(title: string, body: string): Promise<void> {
  try {
    if (isNative) {
      if ((await LocalNotifications.checkPermissions()).display !== 'granted') return;
      await LocalNotifications.schedule({
        notifications: [{ id: Date.now() % 2_000_000_000, title, body, schedule: { at: new Date(Date.now() + 250), allowWhileIdle: true } }],
      });
    } else if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body });
    }
  } catch (err) {
    console.error('Failed to show notification', err);
  }
}
