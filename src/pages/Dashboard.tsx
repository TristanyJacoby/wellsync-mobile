import { IonContent, IonPage, IonIcon, IonModal, useIonViewWillEnter } from '@ionic/react';
import { useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import {
  addOutline,
  notificationsOutline,
  checkmarkOutline,
  trashOutline,
  timeOutline,
  clipboardOutline,
} from 'ionicons/icons';
import { getTasks, getProfile, updateTask, deleteTask } from '../services/storage';
import { getScheduleRecommendations } from '../utils/scheduler';
import { priorityPillStyle, statusPillStyle, nextStatus } from '../utils/board';
import { useAuth } from '../contexts/AuthContext';
import Avatar from '../components/Avatar';
import ProgressRing from '../components/ProgressRing';
import AddTask from './AddTask';
import type { Task, OnboardingProfile, TaskStatus } from '../types';

const STATUS_FILTERS: { id: TaskStatus; short: string }[] = [
  { id: 'todo', short: 'To Do' },
  { id: 'in-progress', short: 'In Progress' },
  { id: 'in-review', short: 'In Review' },
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

  // "Today's Tasks" only ever shows active work - there's no Done filter
  // chip, matching the reference's To Do / In Progress / In Review set.
  const visibleTasks = useMemo(() => {
    const base = statusFilter ? tasks.filter((t) => t.status === statusFilter) : tasks.filter((t) => t.status !== 'done');
    return getScheduleRecommendations(base);
  }, [tasks, statusFilter]);

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

  async function toggleDone(task: Task) {
    const becomingDone = task.status !== 'done';
    const updated: Task = { ...task, status: becomingDone ? 'done' : 'todo' };
    await updateTask(updated);
    setTasks((prev) => prev.map((t) => (t.id === task.id ? updated : t)));
    if (becomingDone) {
      setCelebrating(updated);
      setTimeout(() => setCelebrating((current) => (current?.id === task.id ? null : current)), 650);
    }
  }

  async function cycleStatus(task: Task) {
    const updated: Task = { ...task, status: nextStatus(task.status) };
    await updateTask(updated);
    setTasks((prev) => prev.map((t) => (t.id === task.id ? updated : t)));
  }

  async function removeTask(task: Task) {
    await deleteTask(task.id);
    setTasks((prev) => prev.filter((t) => t.id !== task.id));
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

        {displayTasks.length === 0 && (
          <div className="ws-glass-card ws-empty" style={{ marginTop: 16 }}>
            <IonIcon icon={clipboardOutline} className="ws-empty__icon" />
            <p>No tasks yet — tap the + button to add your first one.</p>
          </div>
        )}

        <div className="ws-task-list" style={{ marginTop: 16 }}>
          {displayTasks.map((task, i) => {
            const pPill = priorityPillStyle(task.priority);
            const sPill = statusPillStyle(task.status);
            const isCelebrating = task.id === celebrating?.id;
            return (
              <div
                key={task.id}
                className="ws-glass-card ws-task-card ws-task-card--rise"
                style={{ animationDelay: `${Math.min(i, 6) * 60}ms` }}
              >
                <div className="ws-task-card__top">
                  <span className="ws-pill ws-pill--dot" style={{ background: pPill.bg, color: pPill.text }}>
                    {pPill.label} Priority
                  </span>
                  <button className="ws-round-btn" aria-label={`Delete ${task.title}`} onClick={() => removeTask(task)}>
                    <IonIcon icon={trashOutline} style={{ fontSize: 15 }} />
                  </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <button
                    type="button"
                    className={`ws-checkbox-btn${task.status === 'done' ? ' is-done' : ''}${isCelebrating ? ' is-celebrating' : ''}`}
                    aria-pressed={task.status === 'done'}
                    aria-label={task.status === 'done' ? `Mark ${task.title} as not done` : `Mark ${task.title} as done`}
                    onClick={() => toggleDone(task)}
                  >
                    {task.status === 'done' && <IonIcon icon={checkmarkOutline} />}
                  </button>
                  <button
                    type="button"
                    className="ws-task-card__title"
                    style={{ margin: 0, background: 'none', border: 'none', padding: 0, textAlign: 'left', font: 'inherit', color: 'inherit', cursor: 'pointer' }}
                    onClick={() => setEditingTask(task)}
                    aria-label={`Edit ${task.title}`}
                  >
                    {task.title}
                  </button>
                </div>

                <div className="ws-task-card__meta">
                  <span className="ws-task-card__time">
                    <IonIcon icon={timeOutline} />
                    {task.dueTime || task.dueDate}
                  </span>
                  <button
                    className="ws-pill"
                    style={{ background: sPill.bg, color: sPill.text, cursor: 'pointer' }}
                    onClick={() => cycleStatus(task)}
                    aria-label={`Cycle status for ${task.title}, currently ${sPill.label}`}
                  >
                    {sPill.label}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
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
