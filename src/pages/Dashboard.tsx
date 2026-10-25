import { IonContent, IonPage, IonIcon, IonModal, useIonViewWillEnter } from '@ionic/react';
import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { useHistory } from 'react-router-dom';
import {
  notificationsOutline,
  flameOutline,
  checkmarkCircleOutline,
  chevronDownOutline,
  chevronUpOutline,
  checkmarkOutline,
  trashOutline,
  pencilOutline,
  timeOutline,
  clipboardOutline,
  timerOutline,
} from 'ionicons/icons';
import { getTasks, getProfile, addTask, updateTask, deleteTask, getSeenNotifications, saveSeenNotifications } from '../services/storage';
import { useTasksChanged } from '../contexts/TaskChangeContext';
import { getReminderPermission, requestReminderPermission, syncReminders, type ReminderPermission } from '../services/reminders';
import { buildNotifications, type AppNotification } from '../utils/notifications';
import { getScheduleRecommendations, isInReminderWindow, type ScoredTask } from '../utils/scheduler';
import { priorityPillStyle, statusPillStyle, toggleDone, cycleStatus, stopping } from '../utils/board';
import { useUndoToast } from '../hooks/useUndoToast';
import { useAuth } from '../contexts/AuthContext';
import { useAvatar } from '../contexts/AvatarContext';
import { greetingFor, homeMessage } from '../utils/home';
import TaskListPopup, { type TaskListView } from '../components/TaskListPopup';
import Avatar from '../components/Avatar';
import ProgressRing from '../components/ProgressRing';
import TaskProgressBar from '../components/TaskProgressBar';
import FocusPanel from '../components/FocusPanel';
import NotificationCenter from '../components/NotificationCenter';
import { usePomodoro, formatClock } from '../contexts/PomodoroContext';
import AddTask from './AddTask';
import type { Task, OnboardingProfile, TaskStatus } from '../types';

// Each chip filters Today's Tasks; `help` explains the less obvious ones
// while that chip is selected.
const STATUS_FILTERS: { id: TaskStatus; short: string; help?: string }[] = [
  { id: 'todo', short: 'To Do', help: 'Tap the circle on a task to start it. Tap again when it is finished.' },
  { id: 'in-progress', short: 'In Progress', help: 'Your focus view: run a Pomodoro, tick off phases, see time spent.' },
  { id: 'done', short: 'Done', help: 'What you finished today. Everything you have completed is in your Profile.' },
];

export default function Dashboard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [profile, setProfile] = useState<OnboardingProfile | null>(null);
  const [statusFilter, setStatusFilter] = useState<TaskStatus | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  // Holds a task briefly after it's marked done so its row (and the
  // checkbox burst animation) stay visible for a beat before the normal
  // "done tasks are filtered out" behavior removes it - without this, the
  // celebration animation would have zero time to play at all.
  const [celebrating, setCelebrating] = useState<Task | null>(null);
  const [showLater, setShowLater] = useState(false);
  const [scope, setScope] = useState<'today' | 'overall'>('today');
  const [listView, setListView] = useState<TaskListView | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [seen, setSeen] = useState<string[]>([]);
  const [permission, setPermission] = useState<ReminderPermission>('unsupported');
  const showUndo = useUndoToast();
  const pomodoro = usePomodoro();

  // A finished Pomodoro writes focus totals straight to Firestore; refetch
  // so the time-spent line updates without leaving the page.
  useEffect(() => {
    if (pomodoro.sessionsSaved > 0) getTasks().then(setTasks);
  }, [pomodoro.sessionsSaved]);
  const { user } = useAuth();
  const { avatarUrl } = useAvatar();
  // Re-read the clock every minute so the greeting follows the time of day.
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);
  const greeting = greetingFor(now);
  const message = useMemo(() => homeMessage(tasks, now), [tasks, now]);
  const history = useHistory();

  // Ionic keeps each tab's page mounted in the background instead of
  // unmounting it, so a plain useEffect(() => ..., []) only ever runs once
  // and goes stale after you navigate away and back. useIonViewWillEnter
  // re-runs every time this tab becomes active again - which is what
  // actually makes a newly added task show up here.
  useIonViewWillEnter(() => {
    refresh();
  });

  // The global create button can add a task while this tab is showing.
  useTasksChanged(refresh);

  function refresh() {
    setNow(new Date());
    getTasks().then(setTasks);
    getProfile().then(setProfile);
    getSeenNotifications().then(setSeen);
    getReminderPermission().then(setPermission);
  }

  // Native builds keep one scheduled reminder per open task in step with the
  // task list (added, edited, finished or deleted all land here via `tasks`).
  useEffect(() => {
    syncReminders(tasks, profile?.reminderStyle).catch((err) => console.error('Failed to sync reminders', err));
  }, [tasks, profile?.reminderStyle]);

  const notifications = useMemo((): AppNotification[] => {
    const rounds: AppNotification[] = pomodoro.finished
      .filter((r) => r.mode === 'focus')
      .map((r) => ({
        id: r.id,
        kind: 'pomodoro',
        title: r.taskTitle,
        body: `Focus session finished at ${format(r.at, 'h:mm a')}`,
      }));
    return [...buildNotifications(tasks, profile?.reminderStyle), ...rounds.reverse()];
  }, [tasks, profile?.reminderStyle, pomodoro.finished]);

  const unread = useMemo(
    () => new Set(notifications.filter((n) => !seen.includes(n.id)).map((n) => n.id)),
    [notifications, seen]
  );

  function openNotifications() {
    setShowNotifications(true);
  }

  function closeNotifications() {
    setShowNotifications(false);
    const next = [...seen, ...unread];
    if (unread.size) {
      setSeen(next);
      saveSeenNotifications(next).catch((err) => console.error('Failed to save read state', err));
    }
  }

  async function enableReminders() {
    setPermission(await requestReminderPermission());
    syncReminders(tasks, profile?.reminderStyle).catch((err) => console.error('Failed to sync reminders', err));
  }

  // "Today" is what needs doing now (due today or overdue) plus what was finished today;
  // "Overall" is every task.
  const todayKey = format(now, 'yyyy-MM-dd');
  const doneToday = useMemo(
    () => tasks.filter((t) => t.status === 'done' && t.completedAt && format(new Date(t.completedAt), 'yyyy-MM-dd') === todayKey),
    [tasks, todayKey]
  );
  const stats = useMemo(() => {
    const open = tasks.filter((t) => t.status !== 'done');
    const completedAll = tasks.filter((t) => t.status === 'done');
    if (scope === 'overall') return { all: tasks, done: completedAll, pending: open };
    const dueNow = open.filter((t) => t.dueDate <= todayKey);
    return { all: [...doneToday, ...dueNow], done: doneToday, pending: dueNow };
  }, [tasks, scope, todayKey, doneToday]);
  const total = stats.all.length;
  const completed = stats.done.length;
  const pending = stats.pending.length;
  const percent = total ? (completed / total) * 100 : 0;
  const allCompletedCount = tasks.filter((t) => t.status === 'done').length;

  const statusCounts = useMemo(() => {
    const counts: Record<TaskStatus, number> = { todo: 0, 'in-progress': 0, done: doneToday.length };
    tasks.forEach((t) => {
      if (t.status !== 'done') counts[t.status]++;
    });
    return counts;
  }, [tasks, doneToday]);

  const isDoneView = statusFilter === 'done';
  const isFocusView = statusFilter === 'in-progress';

  // Active work is ranked by the scheduler. The Done chip is the archive:
  // completed tasks, most recently finished first, outside the scheduler.
  const visibleTasks = useMemo((): ScoredTask[] => {
    if (statusFilter === 'done') {
      return doneToday
        .slice()
        .sort((x, y) => (y.completedAt ?? y.createdAt).localeCompare(x.completedAt ?? x.createdAt))
        .map((t) => ({ ...t, score: 0, suggestedStartDate: t.dueDate }));
    }
    const base = statusFilter ? tasks.filter((t) => t.status === statusFilter) : tasks.filter((t) => t.status !== 'done');
    return getScheduleRecommendations(base, profile?.priorityLens);
  }, [tasks, doneToday, statusFilter, profile?.priorityLens]);

  // getScheduleRecommendations() correctly excludes done tasks (that's core
  // scheduler logic, not something to special-case) - so a just-completed
  // task is stitched back in for the celebration window only, never touching
  // the scheduler itself.
  const displayTasks = useMemo(() => {
    if (celebrating && !visibleTasks.some((t) => t.id === celebrating.id)) {
      return [{ ...celebrating, score: 0, suggestedStartDate: celebrating.dueDate }, ...visibleTasks];
    }
    return visibleTasks;
  }, [visibleTasks, celebrating]);

  // The reminder-style answer decides how far ahead a task joins Today's
  // Tasks; the rest wait in a collapsed "Later" group instead of vanishing.
  const [soonTasks, laterTasks] = useMemo(() => {
    if (isDoneView) return [displayTasks, []];
    const soon: ScoredTask[] = [];
    const later: ScoredTask[] = [];
    for (const t of displayTasks) {
      if (t.id === celebrating?.id || isInReminderWindow(t, profile?.reminderStyle)) soon.push(t);
      else later.push(t);
    }
    return [soon, later];
  }, [displayTasks, celebrating, isDoneView, profile?.reminderStyle]);

  const activeFilter = STATUS_FILTERS.find((f) => f.id === statusFilter);

  async function saveTask(updated: Task) {
    await updateTask(updated);
    setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
  }

  /** The task circle: To Do -> In Progress -> Done, and a done task goes back where it was. */
  async function handleAdvance(task: Task) {
    const updated = cycleStatus(task);
    await saveTask(updated);
    if (updated.status === 'done') {
      setCelebrating(updated);
      setTimeout(() => setCelebrating((current) => (current?.id === task.id ? null : current)), 650);
      showUndo('Moved to Done', () => saveTask(task));
    } else if (updated.status === 'in-progress') {
      showUndo('Started. It is now In Progress', () => saveTask(task));
    }
  }

  /** Marks a task done directly (the "all phases done" prompt). */
  async function handleToggleDone(task: Task) {
    const updated = toggleDone(task);
    await saveTask(updated);
    if (updated.status === 'done') showUndo('Moved to Done', () => saveTask(task));
  }

  async function removeTask(task: Task) {
    await deleteTask(task.id);
    setTasks((prev) => prev.filter((t) => t.id !== task.id));
    showUndo('Task deleted', async () => {
      await addTask(task);
      setTasks((prev) => [...prev, task]);
    });
  }

  function renderTaskCard(task: ScoredTask, i: number) {
    const pPill = priorityPillStyle(task.priority);
    const sPill = statusPillStyle(task.status);
    const isCelebrating = task.id === celebrating?.id;
    return (
      <div
        key={task.id}
        className="ws-glass-card ws-task-card ws-task-card--rise ws-task-card--tappable"
        style={{ animationDelay: `${Math.min(i, 6) * 60}ms` }}
        onClick={() => setEditingTask(task)}
      >
        <div className="ws-task-card__top">
          <span className="ws-pill ws-pill--dot" style={{ background: pPill.bg, color: pPill.text }}>
            {pPill.label} Priority
          </span>
          <div className="ws-task-card__actions">
            <button
              className="ws-round-btn"
              aria-label={`Edit ${task.title}`}
              onClick={stopping(() => setEditingTask(task))}
            >
              <IonIcon icon={pencilOutline} style={{ fontSize: 14 }} />
            </button>
            <button className="ws-round-btn" aria-label={`Delete ${task.title}`} onClick={stopping(() => removeTask(task))}>
              <IonIcon icon={trashOutline} style={{ fontSize: 15 }} />
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            type="button"
            className={`ws-checkbox-btn${task.status === 'done' ? ' is-done' : ''}${task.status === 'in-progress' ? ' is-progress' : ''}${isCelebrating ? ' is-celebrating' : ''}`}
            aria-label={
              task.status === 'todo'
                ? `Start ${task.title}`
                : task.status === 'in-progress'
                  ? `Mark ${task.title} as done`
                  : `Mark ${task.title} as not done`
            }
            onClick={stopping(() => handleAdvance(task))}
          >
            {task.status === 'done' && <IonIcon icon={checkmarkOutline} />}
            {task.status === 'in-progress' && <span className="ws-checkbox-btn__dot" aria-hidden="true" />}
          </button>
          <p className="ws-task-card__title" style={{ margin: 0 }}>
            {task.title}
          </p>
        </div>

        {task.status !== 'done' && <TaskProgressBar task={task} />}

        <div className="ws-task-card__meta">
          <span className="ws-task-card__time">
            <IonIcon icon={timeOutline} />
            {task.dueTime || task.dueDate}
          </span>
          <span className="ws-pill" style={{ background: sPill.bg, color: sPill.text }}>
            {sPill.label}
          </span>
        </div>
      </div>
    );
  }

  return (
    <IonPage>
      <IonContent fullscreen className="ion-padding ws-has-fab">
        <div className="ws-header">
          <div className="ws-header__identity">
            <Avatar name={profile?.name ?? user?.email ?? ''} photoURL={avatarUrl} />
            <div className="ws-header__greeting">
              <p>{greeting}</p>
              <h2>{profile?.name || 'there'}</h2>
            </div>
          </div>
          <div className="ws-header__actions">
            <button
              className="ws-icon-btn ws-icon-btn--bell"
              aria-label={unread.size ? `Notifications, ${unread.size} unread` : 'Notifications'}
              onClick={openNotifications}
            >
              <IonIcon icon={notificationsOutline} style={{ fontSize: 18 }} />
              {unread.size > 0 && <span className="ws-icon-btn__badge">{unread.size > 9 ? '9+' : unread.size}</span>}
            </button>
          </div>
        </div>

        {/* Re-keyed on the text, so each new message eases in slowly. */}
        <div className="ws-message" key={message.headline}>
          <h1 className="ws-headline ws-headline--message">{message.headline}</h1>
          {message.sub && <p className="ws-message__sub">{message.sub}</p>}
          {(message.streak >= 2 || message.doneToday > 0) && (
            <div className="ws-message__chips">
              {message.streak >= 2 && (
                <span className="ws-pill ws-pill--streak">
                  <IonIcon icon={flameOutline} /> {message.streak}-day streak
                </span>
              )}
              {message.doneToday > 0 && (
                <span className="ws-pill" style={{ background: 'var(--ws-done-bg)', color: 'var(--ws-done-text)' }}>
                  <IonIcon icon={checkmarkCircleOutline} /> {message.doneToday} done today
                </span>
              )}
            </div>
          )}
        </div>

        <div className="ws-stat-card">
          <ProgressRing percent={percent} />
          <div className="ws-stat-card__body">
            <div className="ws-stat-card__head">
              <p className="ws-stat-card__title">{scope === 'today' ? 'Today’s Progress' : 'Overall Progress'}</p>
              <div className="ws-scope-toggle" role="group" aria-label="Progress scope">
                <button type="button" aria-pressed={scope === 'today'} className={scope === 'today' ? 'is-active' : ''} onClick={() => setScope('today')}>
                  Today
                </button>
                <button type="button" aria-pressed={scope === 'overall'} className={scope === 'overall' ? 'is-active' : ''} onClick={() => setScope('overall')}>
                  Overall
                </button>
              </div>
            </div>
            <div className="ws-stat-card__row">
              <div className="ws-stat-lines">
                <button
                  type="button"
                  className="ws-stat-line"
                  onClick={() => setListView({ title: scope === 'today' ? 'Today’s tasks' : 'All tasks', hint: scope === 'today' ? 'Due today or overdue, plus what you finished today.' : undefined, tasks: stats.all })}
                >
                  <IonIcon icon={clipboardOutline} />
                  <strong className="ws-num">{total}</strong> Total Task
                </button>
                <button
                  type="button"
                  className="ws-stat-line"
                  onClick={() => setListView({ title: scope === 'today' ? 'Finished today' : 'Completed tasks', tasks: stats.done, byCompletedDay: scope === 'overall' })}
                >
                  <IonIcon icon={clipboardOutline} />
                  <strong className="ws-num">{completed}</strong> Completed Task
                </button>
                <button
                  type="button"
                  className="ws-stat-line"
                  onClick={() => setListView({ title: scope === 'today' ? 'To do today' : 'Pending tasks', hint: scope === 'today' ? 'Due today or overdue.' : undefined, tasks: stats.pending })}
                >
                  <IonIcon icon={clipboardOutline} />
                  <strong className="ws-num">{pending}</strong> Pending Task
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="ws-section-header">
          <h3>Today&apos;s Tasks</h3>
          <button className="ws-section-header__link" onClick={() => history.push('/calendar')}>
            View All
          </button>
        </div>

        <div className="ws-chip-row" role="tablist" aria-label="Filter by status">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.id}
              role="tab"
              aria-selected={statusFilter === f.id}
              className={`ws-count-chip${statusFilter === f.id ? ' is-active' : ''}`}
              onClick={() => setStatusFilter(statusFilter === f.id ? null : f.id)}
            >
              <span className="ws-count-chip__num">{statusCounts[f.id]}</span>
              {f.short}
            </button>
          ))}
        </div>

        {activeFilter?.help && <p className="ws-chip-help">{activeFilter.help}</p>}

        {pomodoro.timer && !isFocusView && (
          <button type="button" className="ws-focus-banner" onClick={() => setStatusFilter('in-progress')}>
            <IonIcon icon={timerOutline} />
            <span className="ws-focus-banner__task">
              {pomodoro.timer.mode === 'break' ? 'Break' : pomodoro.timer.taskTitle}
            </span>
            <span className="ws-num">{formatClock(pomodoro.remainingMs)}</span>
          </button>
        )}

        {isFocusView ? (
          <FocusPanel
            tasks={displayTasks}
            onSave={saveTask}
            onEdit={setEditingTask}
            onMarkDone={handleToggleDone}
          />
        ) : (
          <>
            {displayTasks.length === 0 && (
              <div className="ws-glass-card ws-empty" style={{ marginTop: 16 }}>
                <IonIcon icon={clipboardOutline} className="ws-empty__icon" />
                <p>
                  {activeFilter
                    ? `No ${activeFilter.short} tasks right now.`
                    : allCompletedCount > 0
                      ? 'All caught up! Finished tasks are in your Profile.'
                      : 'No tasks yet — tap the + button to add your first one.'}
                </p>
              </div>
            )}

            <div className="ws-task-list" style={{ marginTop: 16 }}>
              {soonTasks.map(renderTaskCard)}
            </div>

            {soonTasks.length === 0 && laterTasks.length > 0 && (
              <div className="ws-glass-card ws-empty" style={{ marginTop: 16 }}>
                <IonIcon icon={clipboardOutline} className="ws-empty__icon" />
                <p>Nothing due soon. Your other tasks are under Later.</p>
              </div>
            )}

            {laterTasks.length > 0 && (
              <>
                <button
                  type="button"
                  className="ws-later-toggle"
                  aria-expanded={showLater}
                  onClick={() => setShowLater((v) => !v)}
                >
                  <span>Later</span>
                  <span className="ws-later-toggle__count">{laterTasks.length}</span>
                  <IonIcon icon={showLater ? chevronUpOutline : chevronDownOutline} />
                </button>
                {showLater && <div className="ws-task-list">{laterTasks.map(renderTaskCard)}</div>}
              </>
            )}
          </>
        )}
      </IonContent>

      <TaskListPopup
        view={listView}
        onClose={() => setListView(null)}
        onOpenTask={(task) => {
          setListView(null);
          setEditingTask(task);
        }}
      />

      <IonModal isOpen={showNotifications} onDidDismiss={closeNotifications}>
        <NotificationCenter
          notifications={notifications}
          unread={unread}
          permission={permission}
          onEnable={enableReminders}
          onOpenTask={(id) => {
            const task = tasks.find((t) => t.id === id);
            closeNotifications();
            if (task) setEditingTask(task);
          }}
          onClose={closeNotifications}
        />
      </IonModal>

      <IonModal
        isOpen={!!editingTask}
        onDidDismiss={() => setEditingTask(null)}
      >
        <AddTask
          editTask={editingTask ?? undefined}
          onClose={() => {
            setEditingTask(null);
            refresh();
          }}
        />
      </IonModal>
    </IonPage>
  );
}
