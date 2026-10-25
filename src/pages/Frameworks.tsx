import { IonContent, IonPage, IonIcon, IonModal, useIonViewWillEnter } from '@ionic/react';
import { useMemo, useState } from 'react';
import {
  flashOutline,
  calendarClearOutline,
  arrowRedoOutline,
  trashBinOutline,
  informationCircleOutline,
  closeOutline,
} from 'ionicons/icons';
import { getTasks, getProfile, updateTask } from '../services/storage';
import { useTasksChanged } from '../contexts/TaskChangeContext';
import { KanbanView, FrogView, OneThreeFiveView, IvyLeeView, MoscowView } from '../components/FrameworkViews';
import AddTask from './AddTask';
import type { PriorityLens, Quadrant, Task } from '../types';

interface FrameworkMeta {
  id: 'eisenhower' | 'kanban' | 'frog' | 'one-three-five' | 'ivy-lee' | 'moscow';
  label: string;
  /** Heading of the info modal. */
  title: string;
  description: string;
  howTo: string[];
  benefits: string[];
}

// Each framework is an entry here (the segment row and info modal read from
// this list) plus a view that sorts the user's existing tasks - see
// utils/frameworks.ts and components/FrameworkViews.tsx.
const FRAMEWORKS: FrameworkMeta[] = [
  {
    id: 'eisenhower',
    label: 'Eisenhower',
    title: 'Eisenhower Matrix',
    description:
      "The Eisenhower Matrix sorts your tasks into four quadrants by urgency and importance, so you always know what deserves your attention first instead of just working through a flat list top to bottom.",
    howTo: [
      'Add tasks as usual, with a priority and due date.',
      'WellSync automatically places each task into a quadrant based on how soon it’s due and how important it is.',
      'Check this tab when you’re not sure what to work on next.',
    ],
    benefits: [
      'Cuts decision fatigue — no more staring at a flat list wondering what’s next.',
      'Surfaces busywork you can delegate or drop instead of it quietly eating your day.',
      'Keeps important-but-not-urgent work visible before it turns into a crisis.',
    ],
  },
  {
    id: 'kanban',
    label: 'Kanban',
    title: 'Kanban Board',
    description:
      'Kanban shows all your work as columns by stage, so you can see at a glance what is waiting, what you are doing and what is finished. Seeing it all at once keeps you from starting too many things at the same time.',
    howTo: [
      'Every task sits in the column that matches its status.',
      'Tap the arrows on a card to move it back or forward.',
      'Tap a card to open and edit it.',
    ],
    benefits: [
      'Makes it obvious when too much is In Progress at once.',
      'Shows what you are waiting on, so nothing gets forgotten.',
      'Moving a card right feels like real progress.',
    ],
  },
  {
    id: 'frog',
    label: 'Eat the Frog',
    title: 'Eat the Frog',
    description:
      "Brian Tracy's idea: if you eat a live frog first thing, the rest of the day can only get better. WellSync picks your hardest important task and puts it at the top so you do it before anything else.",
    howTo: [
      'WellSync picks the highest-priority task with the most work, due soonest.',
      'Do that one first, before email, chats or easier tasks.',
      'The rest of your tasks follow below in ranked order.',
    ],
    benefits: [
      'Beats procrastination by removing the choice of what to start with.',
      'Gets the task you are most likely to avoid done while your energy is highest.',
      'Gives you a win early in the day.',
    ],
  },
  {
    id: 'one-three-five',
    label: '1-3-5',
    title: '1-3-5 Rule',
    description:
      'A realistic plan for one day: one big task, three medium ones and five small ones. Capping the day at nine tasks keeps your plan honest instead of a wish list.',
    howTo: [
      'Tasks are sized by their estimated effort: under a day is small, 1 to 2 days is medium, 2 or more is big.',
      'WellSync fills each group with your best-ranked tasks.',
      'If a group is full, extra tasks drop into the next smaller one. Open slots mean you have room.',
    ],
    benefits: [
      'Stops you from over-planning a day you cannot finish.',
      'Makes sure a big task is not buried under small ones.',
      'Small tasks give quick wins around the big one.',
    ],
  },
  {
    id: 'ivy-lee',
    label: 'Ivy Lee',
    title: 'Ivy Lee Method',
    description:
      'Over a century old and still simple: choose six tasks, rank them, and work through them in order, one at a time. Whatever you do not finish moves to tomorrow. It is best done as an evening plan for the next day.',
    howTo: [
      'WellSync lists your six highest-ranked open tasks in order.',
      'Start at number 1 and do not move on until it is done.',
      'Unfinished tasks stay in the list and roll into tomorrow automatically.',
    ],
    benefits: [
      'No deciding what to do next, just follow the list.',
      'Single-tasking beats jumping between things.',
      'A short list you can actually finish.',
    ],
  },
  {
    id: 'moscow',
    label: 'MoSCoW',
    title: 'MoSCoW Method',
    description:
      "MoSCoW sorts work into Must, Should, Could and Won't (this time). It is made for scoping a project or a crowded week by being clear about what really has to happen.",
    howTo: [
      'High-priority work due within a week, and overdue work, is a Must.',
      'Important work with more time, or medium work due soon, is a Should.',
      'Lower-priority work falls into Could and Won’t until its deadline gets closer.',
    ],
    benefits: [
      'Gives you permission to say not now.',
      'Protects the must-dos when time runs short.',
      'Easy to explain to a teammate or teacher.',
    ],
  },
];

const QUADRANTS: {
  id: Quadrant;
  title: string;
  meaning: string;
  guidance: string;
  icon: string;
  bg: string;
  text: string;
}[] = [
  {
    id: 'do',
    title: 'Do First',
    meaning: 'Urgent & important',
    guidance: 'Tackle these yourself, right now.',
    icon: flashOutline,
    bg: 'var(--ws-high-bg)',
    text: 'var(--ws-high-text)',
  },
  {
    id: 'schedule',
    title: 'Schedule',
    meaning: 'Important, not urgent',
    guidance: "Block time for these before they become urgent.",
    icon: calendarClearOutline,
    bg: 'var(--ws-inprogress-bg)',
    text: 'var(--ws-inprogress-text)',
  },
  {
    id: 'delegate',
    title: 'Delegate',
    meaning: 'Urgent, not important',
    guidance: 'Hand these off if you can.',
    icon: arrowRedoOutline,
    bg: 'var(--ws-medium-bg)',
    text: 'var(--ws-medium-text)',
  },
  {
    id: 'delete',
    title: 'Eliminate',
    meaning: 'Neither urgent nor important',
    guidance: 'Consider dropping these.',
    icon: trashBinOutline,
    bg: 'var(--ws-todo-bg)',
    text: 'var(--ws-todo-text)',
  },
];

// Tasks shown per quadrant before "+N more", so four quadrants fit a phone.
const QUADRANT_PREVIEW = 4;

export default function Frameworks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [framework, setFramework] = useState<FrameworkMeta['id']>('eisenhower');
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  const [lens, setLens] = useState<PriorityLens | undefined>();
  const [expandedQuadrants, setExpandedQuadrants] = useState<Set<Quadrant>>(new Set());

  useIonViewWillEnter(() => {
    refresh();
  });

  // The global create button can add a task while this tab is showing.
  useTasksChanged(refresh);

  function refresh() {
    getTasks()
      .then(setTasks)
      .catch((err) => console.error('Failed to load tasks', err));
    getProfile()
      .then((p) => setLens(p?.priorityLens))
      .catch((err) => console.error('Failed to load profile', err));
  }

  async function moveTask(updated: Task) {
    setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    try {
      await updateTask(updated);
    } catch (err) {
      console.error('Failed to move task', err);
      refresh();
    }
  }

  // Active (non-done) tasks only - a finished task no longer needs a
  // "what should I focus on" placement.
  const byQuadrant = useMemo(() => {
    const map = new Map<Quadrant, Task[]>();
    for (const task of tasks) {
      if (task.status === 'done') continue;
      if (!map.has(task.quadrant)) map.set(task.quadrant, []);
      map.get(task.quadrant)!.push(task);
    }
    return map;
  }, [tasks]);

  function toggleQuadrant(id: Quadrant) {
    setExpandedQuadrants((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const activeFramework = FRAMEWORKS.find((f) => f.id === framework)!;

  return (
    <IonPage>
      <IonContent fullscreen className="ion-padding ws-has-fab">
        <h1 className="ws-headline" style={{ marginTop: 6 }}>
          Frameworks
        </h1>
        <p className="ws-page-description">
          Prioritization frameworks that sort your tasks for you, so you always know what to focus on next.
        </p>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <div className="ws-chip-row" role="tablist" aria-label="Prioritization framework" style={{ flex: 1 }}>
            {FRAMEWORKS.map((f) => (
              <button
                key={f.id}
                role="tab"
                aria-selected={framework === f.id}
                className={`ws-filter-chip${framework === f.id ? ' is-active' : ''}`}
                onClick={() => setFramework(f.id)}
              >
                {f.label}
              </button>
            ))}
          </div>
          <button
            className="ws-round-btn"
            aria-label={`About ${activeFramework.title}`}
            onClick={() => setShowInfo(true)}
          >
            <IonIcon icon={informationCircleOutline} style={{ fontSize: 20 }} />
          </button>
        </div>

        {framework === 'eisenhower' && (
          <div className="ws-matrix-grid">
            {QUADRANTS.map((q) => {
              const quadrantTasks = byQuadrant.get(q.id) ?? [];
              return (
                <div key={q.id} className="ws-glass-card ws-matrix-quadrant">
                  <div className="ws-matrix-quadrant__header" style={{ background: q.bg, color: q.text }}>
                    <IonIcon icon={q.icon} style={{ fontSize: 16 }} />
                    <p className="ws-matrix-quadrant__title">{q.title}</p>
                  </div>

                  {quadrantTasks.length === 0 ? (
                    <div className="ws-matrix-quadrant__empty">
                      <IonIcon icon={q.icon} className="ws-matrix-quadrant__empty-icon" style={{ color: q.text }} />
                      <p className="ws-matrix-quadrant__empty-meaning">{q.meaning}</p>
                      <p className="ws-matrix-quadrant__empty-guidance">{q.guidance}</p>
                    </div>
                  ) : (
                    <div className="ws-matrix-quadrant__list">
                      {(expandedQuadrants.has(q.id) ? quadrantTasks : quadrantTasks.slice(0, QUADRANT_PREVIEW)).map((task) => (
                        <button
                          key={task.id}
                          type="button"
                          className="ws-matrix-task"
                          onClick={() => setEditingTask(task)}
                        >
                          {task.title}
                        </button>
                      ))}
                      {quadrantTasks.length > QUADRANT_PREVIEW && (
                        <button type="button" className="ws-matrix-more" onClick={() => toggleQuadrant(q.id)}>
                          {expandedQuadrants.has(q.id) ? 'Show less' : `+${quadrantTasks.length - QUADRANT_PREVIEW} more`}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {framework === 'kanban' && <KanbanView tasks={tasks} onOpen={setEditingTask} onMove={moveTask} />}
        {framework === 'frog' && <FrogView tasks={tasks} lens={lens} onOpen={setEditingTask} />}
        {framework === 'one-three-five' && <OneThreeFiveView tasks={tasks} lens={lens} onOpen={setEditingTask} />}
        {framework === 'ivy-lee' && <IvyLeeView tasks={tasks} lens={lens} onOpen={setEditingTask} />}
        {framework === 'moscow' && <MoscowView tasks={tasks} onOpen={setEditingTask} />}
      </IonContent>

      <IonModal isOpen={!!editingTask} onDidDismiss={() => setEditingTask(null)}>
        {editingTask && (
          <AddTask
            editTask={editingTask}
            onClose={() => {
              setEditingTask(null);
              refresh();
            }}
          />
        )}
      </IonModal>

      <IonModal isOpen={showInfo} onDidDismiss={() => setShowInfo(false)} initialBreakpoint={0.75} breakpoints={[0, 0.75, 1]}>
        <IonContent className="ion-padding">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 6 }}>
            <h2 style={{ fontSize: 17, fontWeight: 800 }}>{activeFramework.title}</h2>
            <button className="ws-icon-btn" aria-label="Close" onClick={() => setShowInfo(false)}>
              <IonIcon icon={closeOutline} style={{ fontSize: 20 }} />
            </button>
          </div>

          <p style={{ marginTop: 18, lineHeight: 1.55, color: 'var(--ws-ink-muted)' }}>{activeFramework.description}</p>

          <p className="ws-field-label" style={{ marginTop: 22 }}>
            How to use it
          </p>
          <ol className="ws-info-list">
            {activeFramework.howTo.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>

          <p className="ws-field-label" style={{ marginTop: 22 }}>
            Why it helps
          </p>
          <ul className="ws-info-list">
            {activeFramework.benefits.map((benefit, i) => (
              <li key={i}>{benefit}</li>
            ))}
          </ul>
        </IonContent>
      </IonModal>
    </IonPage>
  );
}
