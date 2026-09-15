import { IonContent, IonPage, IonIcon, IonModal, IonDatetime, useIonViewWillEnter } from '@ionic/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { addDays, format } from 'date-fns';
import {
  addOutline,
  arrowBackOutline,
  ellipsisHorizontalOutline,
  calendarOutline,
  briefcaseOutline,
  personOutline,
  sunnyOutline,
  partlySunnyOutline,
  moonOutline,
  timeOutline,
  trashOutline,
} from 'ionicons/icons';
import { getTasks, updateTask, deleteTask } from '../services/storage';
import { priorityPillStyle, statusPillStyle, nextStatus } from '../utils/board';
import AddTask from './AddTask';
import type { Task, Category } from '../types';

const FILTERS: { id: Category | 'All'; icon?: string }[] = [
  { id: 'All' },
  { id: 'Work', icon: briefcaseOutline },
  { id: 'Personal', icon: personOutline },
];

type Section = { id: string; label: string; icon: string };
const SECTIONS: Section[] = [
  { id: 'morning', label: 'Morning', icon: sunnyOutline },
  { id: 'afternoon', label: 'Afternoon', icon: partlySunnyOutline },
  { id: 'evening', label: 'Evening', icon: moonOutline },
  { id: 'anytime', label: 'Anytime', icon: timeOutline },
];

function sectionForTask(task: Task): string {
  if (!task.dueTime) return 'anytime';
  const hour = Number(task.dueTime.slice(0, 2));
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

// A wide rolling window anchored to today (not the selected date), so
// scrolling to a different day never shifts what's available to scroll to.
const DAYS_BEFORE_TODAY = 14;
const DAYS_AFTER_TODAY = 60;

export default function TaskSchedule() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [filter, setFilter] = useState<Category | 'All'>('All');
  const [showAddTask, setShowAddTask] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const history = useHistory();
  const stripRef = useRef<HTMLDivElement>(null);
  const selectedDayRef = useRef<HTMLButtonElement>(null);

  // See Dashboard.tsx for why this is useIonViewWillEnter and not useEffect.
  useIonViewWillEnter(() => {
    refresh();
  });

  function refresh() {
    getTasks().then(setTasks);
  }

  const visibleDays = useMemo(() => {
    const start = addDays(new Date(), -DAYS_BEFORE_TODAY);
    return Array.from({ length: DAYS_BEFORE_TODAY + DAYS_AFTER_TODAY }, (_, i) => addDays(start, i));
  }, []);

  // Dates with at least one task due, respecting the active category filter -
  // so the dot on a day always matches what selecting that day would show.
  const datesWithTasks = useMemo(() => {
    const set = new Set<string>();
    for (const t of tasks) {
      if (filter === 'All' || t.category === filter) set.add(t.dueDate);
    }
    return set;
  }, [tasks, filter]);

  // Center the selected day in the strip whenever it changes, including on
  // first mount (so "today" is visible without the user hunting for it).
  // Deferred a tick: calling this immediately races Ionic's page-enter
  // transition, which leaves the strip's scroll container unmeasured (or
  // mid-transform) and silently drops the scroll.
  useEffect(() => {
    const id = setTimeout(() => {
      selectedDayRef.current?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }, 350);
    return () => clearTimeout(id);
  }, [selectedDate]);

  const dayTasks = tasks
    .filter((t) => {
      const sameDay = t.dueDate === format(selectedDate, 'yyyy-MM-dd');
      const matchesFilter = filter === 'All' || t.category === filter;
      return sameDay && matchesFilter;
    })
    .sort((a, b) => (a.dueTime || '').localeCompare(b.dueTime || ''));

  const grouped = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const section of SECTIONS) map.set(section.id, []);
    for (const task of dayTasks) map.get(sectionForTask(task))!.push(task);
    return SECTIONS.map((s) => ({ ...s, tasks: map.get(s.id) ?? [] })).filter((s) => s.tasks.length > 0);
  }, [dayTasks]);

  const isToday = format(selectedDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');

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
          <button className="ws-icon-btn" aria-label="Back to home" onClick={() => history.push('/home')}>
            <IonIcon icon={arrowBackOutline} style={{ fontSize: 18 }} />
          </button>
          <h2 style={{ fontSize: 15, fontWeight: 700 }}>{format(selectedDate, 'EEE, MMM d')}</h2>
          <div className="ws-header__actions">
            <button className="ws-icon-btn ws-icon-btn--dark" aria-label="Add task" onClick={() => setShowAddTask(true)}>
              <IonIcon icon={addOutline} style={{ fontSize: 20 }} />
            </button>
            <button className="ws-icon-btn" aria-label="More options" onClick={() => history.push('/profile')}>
              <IonIcon icon={ellipsisHorizontalOutline} style={{ fontSize: 18 }} />
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginTop: 18 }}>
          <h1 className="ws-headline" style={{ margin: 0 }}>
            Task
            <br />
            Schedule
          </h1>
          <button className="ws-filter-chip" style={{ marginTop: 2 }} onClick={() => setShowDatePicker(true)}>
            <IonIcon icon={calendarOutline} />
            Calendar
          </button>
        </div>

        <div className="ws-daystrip" ref={stripRef} style={{ margin: '20px 0 16px' }}>
          {visibleDays.map((day) => {
            const dayKey = format(day, 'yyyy-MM-dd');
            const isSelected = dayKey === format(selectedDate, 'yyyy-MM-dd');
            const hasTasks = datesWithTasks.has(dayKey);
            return (
              <button
                key={dayKey}
                ref={isSelected ? selectedDayRef : undefined}
                onClick={() => setSelectedDate(day)}
                className={`ws-day${isSelected ? ' is-selected' : ''}`}
              >
                <span className="ws-day__dow">{format(day, 'EEE')}</span>
                <span className="ws-day__num">{format(day, 'd')}</span>
                <span className={`ws-day__dot${hasTasks ? ' is-visible' : ''}`} aria-hidden="true" />
              </button>
            );
          })}
        </div>

        <div className="ws-chip-row" style={{ marginBottom: 6 }}>
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`ws-filter-chip${filter === f.id ? ' is-active' : ''}`}
            >
              {f.icon && <IonIcon icon={f.icon} />}
              {f.id}
            </button>
          ))}
        </div>

        {dayTasks.length === 0 && (
          <div className="ws-glass-card ws-empty" style={{ marginTop: 16 }}>
            <IonIcon icon={calendarOutline} className="ws-empty__icon" />
            <p>Nothing due on this day.</p>
          </div>
        )}

        {grouped.map((section) => (
          <div key={section.id}>
            <div className="ws-time-section">
              <span className="ws-time-section__label">
                <IonIcon icon={section.icon} />
                {section.label}
              </span>
              {isToday && <span className="ws-time-section__today">Today</span>}
            </div>

            {section.tasks.map((task) => {
              const pPill = priorityPillStyle(task.priority);
              const sPill = statusPillStyle(task.status);
              return (
                <div key={task.id} className="ws-timeline-item">
                  <div className="ws-timeline-item__time">{task.dueTime || '—'}</div>
                  <div className="ws-timeline-item__rail" aria-hidden="true">
                    <span className="ws-timeline-item__dot" />
                    <span className="ws-timeline-item__line" />
                  </div>
                  <div className="ws-glass-card ws-task-card ws-timeline-item__card">
                    <div className="ws-task-card__top">
                      <span className="ws-pill ws-pill--dot" style={{ background: pPill.bg, color: pPill.text }}>
                        {pPill.label}
                      </span>
                      <button className="ws-round-btn" aria-label={`Delete ${task.title}`} onClick={() => removeTask(task)}>
                        <IonIcon icon={trashOutline} style={{ fontSize: 15 }} />
                      </button>
                    </div>
                    <button
                      type="button"
                      className="ws-task-card__title"
                      style={{ background: 'none', border: 'none', padding: 0, textAlign: 'left', font: 'inherit', color: 'inherit', cursor: 'pointer', display: 'block' }}
                      onClick={() => setEditingTask(task)}
                      aria-label={`Edit ${task.title}`}
                    >
                      {task.title}
                    </button>
                    {task.description && <p className="ws-task-card__desc">{task.description}</p>}
                    <div className="ws-task-card__meta">
                      <span>{task.category}</span>
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
                </div>
              );
            })}
          </div>
        ))}
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

      <IonModal isOpen={showDatePicker} onDidDismiss={() => setShowDatePicker(false)} className="ws-date-modal">
        <IonDatetime
          presentation="date"
          value={format(selectedDate, "yyyy-MM-dd'T'HH:mm:ss")}
          onIonChange={(e) => {
            const value = Array.isArray(e.detail.value) ? e.detail.value[0] : e.detail.value;
            if (value) {
              setSelectedDate(new Date(value));
              setShowDatePicker(false);
            }
          }}
        />
      </IonModal>
    </IonPage>
  );
}
