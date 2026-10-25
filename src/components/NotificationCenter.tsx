import { IonContent, IonIcon } from '@ionic/react';
import { alarmOutline, closeOutline, flameOutline, hourglassOutline, notificationsOutline, timerOutline } from 'ionicons/icons';
import type { AppNotification, NotificationKind } from '../utils/notifications';
import type { ReminderPermission } from '../services/reminders';

const KIND_ICON: Record<NotificationKind, string> = {
  overdue: flameOutline,
  'due-today': alarmOutline,
  'starting-soon': hourglassOutline,
  pomodoro: timerOutline,
};

const KIND_TONE: Record<NotificationKind, string> = {
  overdue: 'var(--ws-high-text)',
  'due-today': 'var(--ws-medium-text)',
  'starting-soon': 'var(--ws-inreview-text)',
  pomodoro: 'var(--ws-inprogress-text)',
};

/**
 * The bell's list: everything derived from task data plus finished Pomodoro
 * rounds. Unread items are marked until the sheet has been opened.
 */
export default function NotificationCenter({
  notifications,
  unread,
  permission,
  onEnable,
  onOpenTask,
  onClose,
}: {
  notifications: AppNotification[];
  unread: Set<string>;
  permission: ReminderPermission;
  onEnable: () => void;
  onOpenTask: (taskId: string) => void;
  onClose: () => void;
}) {
  return (
    <IonContent className="ion-padding">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 6 }}>
        <button className="ws-icon-btn" aria-label="Close" onClick={onClose}>
          <IonIcon icon={closeOutline} style={{ fontSize: 20 }} />
        </button>
        <h2 style={{ fontSize: 17, fontWeight: 800 }}>Notifications</h2>
        <span style={{ width: 44 }} />
      </div>

      {permission === 'default' && (
        <div className="ws-glass-card ws-notif-enable">
          <p>Get a reminder when a task is about to start, even when WellSync is in the background.</p>
          <button type="button" className="ws-button-block" onClick={onEnable}>
            Turn on reminders
          </button>
        </div>
      )}
      {permission === 'denied' && (
        <p className="ws-field-hint" style={{ marginTop: 16 }}>
          Reminders are blocked. Allow notifications for WellSync in your device or browser settings to turn them on.
        </p>
      )}

      {notifications.length === 0 ? (
        <div className="ws-notif-empty">
          <IonIcon icon={notificationsOutline} />
          <p>You&apos;re all caught up.</p>
        </div>
      ) : (
        <div className="ws-notif-list">
          {notifications.map((n) => (
            <button
              key={n.id}
              type="button"
              className={`ws-glass-card ws-notif${unread.has(n.id) ? ' ws-notif--unread' : ''}`}
              disabled={!n.taskId}
              onClick={() => n.taskId && onOpenTask(n.taskId)}
            >
              <span className="ws-notif__icon" style={{ color: KIND_TONE[n.kind] }}>
                <IonIcon icon={KIND_ICON[n.kind]} />
              </span>
              <span className="ws-notif__text">
                <strong>{n.title}</strong>
                <span>{n.body}</span>
              </span>
              {unread.has(n.id) && <span className="ws-notif__dot" aria-label="Unread" />}
            </button>
          ))}
        </div>
      )}
    </IonContent>
  );
}
