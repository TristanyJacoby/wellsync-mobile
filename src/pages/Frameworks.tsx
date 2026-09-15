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
import { getTasks } from '../services/storage';
import AddTask from './AddTask';
import type { Quadrant, Task } from '../types';

interface FrameworkMeta {
  id: 'eisenhower';
  label: string;
  description: string;
  howTo: string[];
  benefits: string[];
}

// Only Eisenhower exists today, but this shape (id, label, description,
// howTo, benefits) is what future frameworks (MoSCoW, Pareto, ...) will
// slot into as additional entries - the segment row and info modal both
// already read from this list rather than anything Eisenhower-specific.
const FRAMEWORKS: FrameworkMeta[] = [
  {
    id: 'eisenhower',
    label: 'Eisenhower',
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

export default function Frameworks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [framework, setFramework] = useState<FrameworkMeta['id']>('eisenhower');
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [showInfo, setShowInfo] = useState(false);

  useIonViewWillEnter(() => {
    refresh();
  });

  function refresh() {
    getTasks()
      .then(setTasks)
      .catch((err) => console.error('Failed to load tasks', err));
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

  const activeFramework = FRAMEWORKS.find((f) => f.id === framework)!;

  return (
    <IonPage>
      <IonContent fullscreen className="ion-padding">
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
            aria-label={`About the ${activeFramework.label} framework`}
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
                      {quadrantTasks.map((task) => (
                        <button
                          key={task.id}
                          type="button"
                          className="ws-matrix-task"
                          onClick={() => setEditingTask(task)}
                        >
                          {task.title}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
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
            <h2 style={{ fontSize: 17, fontWeight: 800 }}>{activeFramework.label} Matrix</h2>
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
