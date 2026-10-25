import { IonContent, IonPage, IonIcon, IonModal, IonDatetime, useIonViewWillEnter } from '@ionic/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { addDays, format } from 'date-fns';
import {
  arrowBackOutline,
  calendarOutline,
  optionsOutline,
  sunnyOutline,
  partlySunnyOutline,
  moonOutline,
  timeOutline,
  trashOutline,
  pencilOutline,
} from 'ionicons/icons';
import { getTasks, getCategories, addTask, updateTask, deleteTask } from '../services/storage';
import { useTasksChanged } from '../contexts/TaskChangeContext';
import { DEFAULT_CATEGORIES, findCategory } from '../utils/categories';
import { priorityPillStyle, statusPillStyle, cycleStatus, stopping } from '../utils/board';
import { useUndoToast } from '../hooks/useUndoToast';
import AddTask from './AddTask';
import TaskProgressBar from '../components/TaskProgressBar';
import ManageCategories from '../components/ManageCategories';
import type { Task, Category, CategoryDef } from '../types';

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
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [categories, setCategories] = useState<CategoryDef[]>(DEFAULT_CATEGORIES);
  const [showCategories, setShowCategories] = useState(false);
  const showUndo = useUndoToast();
  const history = useHistory();
  const stripRef = useRef<HTMLDivElement>(null);
  const selectedDayRef = useRef<HTMLButtonElement>(null);

  // See Dashboard.tsx for why this is useIonViewWillEnter and not useEffect.
  useIonViewWillEnter(() => {
    refresh();
  });

  // The global create button can add a task while this tab is showing.
  useTasksChanged(refresh);

  function refresh() {
    getTasks().then(setTasks);
    getCategories().then((list) => {
      setCategories(list);
      // A filter on a category deleted elsewhere would show nothing forever.
      setFilter((f) => (f === 'All' || list.some((c) => c.id === f) ? f : 'All'));
    });
  }

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const t of tasks) counts[t.category] = (counts[t.category] ?? 0) + 1;
    return counts;
  }, [tasks]);

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

  async function handleCycleStatus(task: Task) {
    const updated = cycleStatus(task);
    await saveTask(updated);
    if (updated.status === 'done') showUndo('Moved to Done', () => saveTask(task));
  }

  async function saveTask(updated: Task) {
    await updateTask(updated);
    setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
  }

  async function removeTask(task: Task) {
    await deleteTask(task.id);
    setTasks((prev) => prev.filter((t) => t.id !== task.id));
    showUndo('Task deleted', async () => {
      await addTask(task);
      setTasks((prev) => [...prev, task]);
    });
  }

  // Days with a task due get a tinted, outlined circle in the full calendar, not just a dot on the
  // strip. Same set as the dots, so the active category filter applies to both.
  const highlightedDates = (iso: string) => {
    if (!datesWithTasks.has(iso.slice(0, 10))) return undefined;
    const css = getComputedStyle(document.documentElement);
    const accent = css.getPropertyValue('--ws-amber-strong').trim() || '#d9a441';
    return {
      textColor: css.getPropertyValue('--ws-ink').trim() || undefined,
      backgroundColor: css.getPropertyValue('--ws-amber-dim').trim() || undefined,
      border: `1.5px solid ${accent}`,
    };
  };

  return (
    <IonPage>
      <IonContent fullscreen className="ion-padding ws-has-fab">
        <div className="ws-header">
          <button className="ws-icon-btn" aria-label="Back to home" onClick={() => history.push('/home')}>
            <IonIcon icon={arrowBackOutline} style={{ fontSize: 18 }} />
          </button>
          <h2 style={{ fontSize: 15, fontWeight: 700 }}>{format(selectedDate, 'EEE, MMM d')}</h2>
          {/* Same width as the back button, so the date stays centered. */}
          <span style={{ width: 44 }} aria-hidden="true" />
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
          <button onClick={() => setFilter('All')} className={`ws-filter-chip${filter === 'All' ? ' is-active' : ''}`}>
            All
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setFilter(c.id)}
              className={`ws-filter-chip${filter === c.id ? ' is-active' : ''}`}
            >
              <span className="ws-category-dot" style={{ background: c.color }} aria-hidden="true" />
              {c.name}
            </button>
          ))}
          <button className="ws-filter-chip" onClick={() => setShowCategories(true)} aria-label="Manage categories">
            <IonIcon icon={optionsOutline} />
            Edit
          </button>
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
                  <div
                    className="ws-glass-card ws-task-card ws-timeline-item__card ws-task-card--tappable"
                    onClick={() => setEditingTask(task)}
                  >
                    <div className="ws-task-card__top">
                      <span className="ws-pill ws-pill--dot" style={{ background: pPill.bg, color: pPill.text }}>
                        {pPill.label}
                      </span>
                      <div className="ws-task-card__actions">
                        <button
                          className="ws-round-btn"
                          aria-label={`Edit ${task.title}`}
                          onClick={stopping(() => setEditingTask(task))}
                        >
                          <IonIcon icon={pencilOutline} style={{ fontSize: 14 }} />
                        </button>
                        <button
                          className="ws-round-btn"
                          aria-label={`Delete ${task.title}`}
                          onClick={stopping(() => removeTask(task))}
                        >
                          <IonIcon icon={trashOutline} style={{ fontSize: 15 }} />
                        </button>
                      </div>
                    </div>
                    <p className="ws-task-card__title" style={{ margin: 0 }}>
                      {task.title}
                    </p>
                    {task.description && <p className="ws-task-card__desc">{task.description}</p>}
                    {task.status !== 'done' && <TaskProgressBar task={task} />}
                    <div className="ws-task-card__meta">
                      <span className="ws-category-label">
                        <span
                          className="ws-category-dot"
                          style={{ background: findCategory(categories, task.category).color }}
                          aria-hidden="true"
                        />
                        {findCategory(categories, task.category).name}
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
                </div>
              );
            })}
          </div>
        ))}
      </IonContent>

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

      <IonModal isOpen={showDatePicker} onDidDismiss={() => setShowDatePicker(false)} className="ws-date-modal">
        <IonDatetime
          presentation="date"
          highlightedDates={highlightedDates}
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

      <IonModal
        isOpen={showCategories}
        onDidDismiss={() => {
          setShowCategories(false);
          refresh();
        }}
      >
        <ManageCategories
          categories={categories}
          taskCounts={categoryCounts}
          onChange={setCategories}
          onClose={() => setShowCategories(false)}
        />
      </IonModal>
    </IonPage>
  );
}
