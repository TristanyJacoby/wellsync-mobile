import { IonContent, IonPage, IonIcon, IonModal, useIonViewWillEnter } from '@ionic/react';
import { useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import {
  addOutline,
  notificationsOutline,
  chevronDownOutline,
  chevronUpOutline,
  checkmarkOutline,
  trashOutline,
  pencilOutline,
  timeOutline,
  clipboardOutline,
} from 'ionicons/icons';
import { getTasks, getProfile, addTask, updateTask, deleteTask } from '../services/storage';
import { getScheduleRecommendations, isInReminderWindow, type ScoredTask } from '../utils/scheduler';
import { priorityPillStyle, statusPillStyle, toggleDone, cycleStatus, stopping } from '../utils/board';
import { useUndoToast } from '../hooks/useUndoToast';
import { useAuth } from '../contexts/AuthContext';
import Avatar from '../components/Avatar';
import ProgressRing from '../components/ProgressRing';
import AddTask from './AddTask';
import type { Task, OnboardingProfile, TaskStatus } from '../types';

// Each chip filters Today's Tasks; `help` explains the less obvious ones
// while that chip is selected.
const STATUS_FILTERS: { id: TaskStatus; short: string; help?: string }[] = [
  { id: 'todo', short: 'To Do' },
  { id: 'in-progress', short: 'In Progress' },
  {
    id: 'in-review',
    short: 'Waiting',
    help: "Handed in or handed off, waiting on someone else: a grade, feedback or a reply.",
  },
  { id: 'done', short: 'Done', help: 'Finished tasks, newest first. Uncheck one to restore it.' },
];

export default function Dashboard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [profile, setProfile] = useState<OnboardingProfile | null>(null);
  const [statusFilter, setStatusFilter] = useState<TaskStatus | null>(null);
  const [showAddTask, setShowAddTask] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  // Holds a task briefly after it's marked done so its row (and the
  // checkbox burst animation) stay visible for a beat before the normal
  // "done tasks are filtered out" behavior removes it - without this, the
  // celebration animation would have zero time to play at all.
  const [celebrating, setCelebrating] = useState<Task | null>(null);
  const [showLater, setShowLater] = useState(false);
  const showUndo = useUndoToast();
  const { user } = useAuth();
  const history = useHistory();

  // Ionic keeps each tab's page mounted in the background instead of
  // unmounting it, so a plain useEffect(() => ..., []) only ever runs once
  // and goes stale after you navigate away and back. useIonViewWillEnter
  // re-runs every time this tab becomes active again - which is what
  // actually makes a newly added task show up here.
  useIonViewWillEnter(() => {
    refresh();
  });

  function refresh() {
    getTasks().then(setTasks);
    getProfile().then(setProfile);
  }

  const total = tasks.length;
  const completed = tasks.filter((t) => t.status === 'done').length;
  const pending = total - completed;
  const percent = total ? (completed / total) * 100 : 0;

  const statusCounts = useMemo(() => {
    const counts: Record<TaskStatus, number> = { todo: 0, 'in-progress': 0, 'in-review': 0, done: 0 };
    tasks.forEach((t) => counts[t.status]++);
    return counts;
  }, [tasks]);

  const isDoneView = statusFilter === 'done';

  // Active work is ranked by the scheduler. The Done chip is the archive:
  // completed tasks, most recently finished first, outside the scheduler.
  const visibleTasks = useMemo((): ScoredTask[] => {
    if (statusFilter === 'done') {
      return tasks
        .filter((t) => t.status === 'done')
        .sort((x, y) => (y.completedAt ?? y.createdAt).localeCompare(x.completedAt ?? x.createdAt))
        .map((t) => ({ ...t, score: 0, suggestedStartDate: t.dueDate }));
    }
    const base = statusFilter ? tasks.filter((t) => t.status === statusFilter) : tasks.filter((t) => t.status !== 'done');
    return getScheduleRecommendations(base, profile?.priorityLens);
  }, [tasks, statusFilter, profile?.priorityLens]);

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

  async function handleToggleDone(task: Task) {
    const updated = toggleDone(task);
    await saveTask(updated);
    if (updated.status === 'done') {
      setCelebrating(updated);
      setTimeout(() => setCelebrating((current) => (current?.id === task.id ? null : current)), 650);
      showUndo('Moved to Done', () => saveTask(task));
    }
  }

  async function handleCycleStatus(task: Task) {
    const updated = cycleStatus(task);
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
            className={`ws-checkbox-btn${task.status === 'done' ? ' is-done' : ''}${isCelebrating ? ' is-celebrating' : ''}`}
            aria-pressed={task.status === 'done'}
            aria-label={task.status === 'done' ? `Mark ${task.title} as not done` : `Mark ${task.title} as done`}
            onClick={stopping(() => handleToggleDone(task))}
          >
            {task.status === 'done' && <IonIcon icon={checkmarkOutline} />}
          </button>
          <p className="ws-task-card__title" style={{ margin: 0 }}>
            {task.title}
          </p>
        </div>

        <div className="ws-task-card__meta">
          <span className="ws-task-card__time">
            <IonIcon icon={timeOutline} />
            {task.dueTime || task.dueDate}
          </span>
          <button
            className="ws-pill"
            style={{ background: sPill.bg, color: sPill.text, cursor: 'pointer' }}
            onClick={stopping(() => handleCycleStatus(task))}
            aria-label={`Cycle status for ${task.title}, currently ${sPill.label}`}
          >
            {sPill.label}
          </button>
        </div>
      </div>
    );
  }

  return (
    <IonPage>
      <IonContent fullscreen className="ion-padding">
        <div className="ws-header">
          <div className="ws-header__identity">
            <Avatar name={profile?.name ?? user?.email ?? ''} photoURL={user?.photoURL} />
            <div className="ws-header__greeting">
              <p>Good Morning</p>
              <h2>{profile?.name || 'there'}</h2>
            </div>
          </div>
          <div className="ws-header__actions">
            <button className="ws-icon-btn ws-icon-btn--dark" aria-label="Add task" onClick={() => setShowAddTask(true)}>
              <IonIcon icon={addOutline} style={{ fontSize: 20 }} />
            </button>
            <button className="ws-icon-btn" aria-label="Notifications">
              <IonIcon icon={notificationsOutline} style={{ fontSize: 18 }} />
            </button>
          </div>
        </div>

        <h1 className="ws-headline">Let&apos;s Make Today Productive</h1>

        <div className="ws-stat-card">
          <ProgressRing percent={percent} />
          <div className="ws-stat-card__body">
            <p className="ws-stat-card__title">Today&apos;s Progress</p>
            <div className="ws-stat-card__row">
              <div className="ws-stat-lines">
                <span className="ws-stat-line">
                  <IonIcon icon={clipboardOutline} />
                  <strong className="ws-num">{total}</strong> Total Task
                </span>
                <span className="ws-stat-line">
                  <IonIcon icon={clipboardOutline} />
                  <strong className="ws-num">{completed}</strong> Completed Task
                </span>
                <span className="ws-stat-line">
                  <IonIcon icon={clipboardOutline} />
                  <strong className="ws-num">{pending}</strong> Pending Task
                </span>
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

        {displayTasks.length === 0 && (
          <div className="ws-glass-card ws-empty" style={{ marginTop: 16 }}>
            <IonIcon icon={clipboardOutline} className="ws-empty__icon" />
            <p>
              {activeFilter
                ? `No ${activeFilter.short} tasks right now.`
                : completed > 0
                  ? 'All caught up! Finished tasks are under Done.'
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
      </IonContent>

      <IonModal
        isOpen={showAddTask || !!editingTask}
        onDidDismiss={() => {
          setShowAddTask(false);
          setEditingTask(null);
        }}
      >
        <AddTask
          editTask={editingTask ?? undefined}
          onClose={() => {
            setShowAddTask(false);
            setEditingTask(null);
            refresh();
          }}
        />
      </IonModal>
    </IonPage>
  );
}
