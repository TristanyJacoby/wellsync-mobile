import { IonIcon } from '@ionic/react';
import { chevronBackOutline, chevronForwardOutline, leafOutline } from 'ionicons/icons';
import { format, parseISO } from 'date-fns';
import { statusPillStyle, priorityPillStyle, STATUS_ORDER, withStatus } from '../utils/board';
import {
  eatTheFrog,
  oneThreeFive,
  ivyLee,
  moscow,
  PLAN_SLOTS,
  IVY_LEE_COUNT,
  type Moscow,
  type PlanSize,
} from '../utils/frameworks';
import type { PriorityLens, Task } from '../types';

interface ViewProps {
  tasks: Task[];
  lens?: PriorityLens;
  onOpen: (task: Task) => void;
}

function meta(task: Task): string {
  const effort = `${task.effortDays} day${task.effortDays === 1 ? '' : 's'}`;
  return `Due ${format(parseISO(task.dueDate), 'MMM d')} · ${effort}`;
}

function TaskRow({ task, onOpen, lead }: { task: Task; onOpen: (t: Task) => void; lead?: string }) {
  const p = priorityPillStyle(task.priority);
  return (
    <button type="button" className="ws-glass-card ws-fw-row" onClick={() => onOpen(task)}>
      {lead && <span className="ws-fw-row__lead">{lead}</span>}
      <span className="ws-fw-row__text">
        <strong>{task.title}</strong>
        <span>{meta(task)}</span>
      </span>
      <span className="ws-pill" style={{ background: p.bg, color: p.text }}>
        {p.label}
      </span>
    </button>
  );
}

function Empty({ children }: { children: string }) {
  return <p className="ws-fw-empty">{children}</p>;
}

// ---------- Kanban ----------

const DONE_PREVIEW = 5;

export function KanbanView({ tasks, onOpen, onMove }: Pick<ViewProps, 'tasks' | 'onOpen'> & { onMove: (task: Task) => void }) {
  function move(task: Task, dir: -1 | 1) {
    const next = STATUS_ORDER[STATUS_ORDER.indexOf(task.status) + dir];
    if (next) onMove(withStatus(task, next));
  }

  return (
    <div className="ws-kanban">
      {STATUS_ORDER.map((status) => {
        const pill = statusPillStyle(status);
        let column = tasks.filter((t) => t.status === status);
        if (status === 'done') {
          column = column
            .sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''))
            .slice(0, DONE_PREVIEW);
        } else {
          column = column.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
        }
        const count = tasks.filter((t) => t.status === status).length;
        return (
          <section key={status} className="ws-kanban__col" aria-label={pill.label}>
            <header className="ws-kanban__head" style={{ background: pill.bg, color: pill.text }}>
              <span>{pill.label}</span>
              <span className="ws-kanban__count">{count}</span>
            </header>
            {column.length === 0 && <Empty>Nothing here</Empty>}
            {column.map((task) => (
              <div key={task.id} className="ws-glass-card ws-kanban__card">
                <button type="button" className="ws-kanban__title" onClick={() => onOpen(task)}>
                  {task.title}
                </button>
                <span className="ws-kanban__meta">{meta(task)}</span>
                <div className="ws-kanban__moves">
                  <button
                    type="button"
                    className="ws-round-btn"
                    aria-label={`Move ${task.title} back`}
                    disabled={status === STATUS_ORDER[0]}
                    onClick={() => move(task, -1)}
                  >
                    <IonIcon icon={chevronBackOutline} style={{ fontSize: 14 }} />
                  </button>
                  <button
                    type="button"
                    className="ws-round-btn"
                    aria-label={`Move ${task.title} forward`}
                    disabled={status === STATUS_ORDER[STATUS_ORDER.length - 1]}
                    onClick={() => move(task, 1)}
                  >
                    <IonIcon icon={chevronForwardOutline} style={{ fontSize: 14 }} />
                  </button>
                </div>
              </div>
            ))}
            {status === 'done' && count > DONE_PREVIEW && (
              <p className="ws-fw-empty">+{count - DONE_PREVIEW} more in Done on Home</p>
            )}
          </section>
        );
      })}
    </div>
  );
}

// ---------- Eat the Frog ----------

export function FrogView({ tasks, lens, onOpen }: ViewProps) {
  const { frog, rest } = eatTheFrog(tasks, lens);
  if (!frog) return <Empty>No open tasks. Add one and your frog will appear here.</Empty>;
  return (
    <>
      <div className="ws-glass-card ws-frog">
        <span className="ws-frog__label">
          <IonIcon icon={leafOutline} /> Your frog today
        </span>
        <button type="button" className="ws-frog__title" onClick={() => onOpen(frog)}>
          {frog.title}
        </button>
        <span className="ws-frog__meta">
          {priorityPillStyle(frog.priority).label} priority · {meta(frog)}
        </span>
        <p className="ws-frog__hint">Do this first, before anything else. The rest of the day gets easier.</p>
      </div>
      {rest.length > 0 && (
        <>
          <p className="ws-field-label" style={{ marginTop: 22 }}>
            Then, in order
          </p>
          <div className="ws-fw-list">
            {rest.map((t) => (
              <TaskRow key={t.id} task={t} onOpen={onOpen} />
            ))}
          </div>
        </>
      )}
    </>
  );
}

// ---------- 1-3-5 ----------

const PLAN_LABELS: Record<PlanSize, { title: string; hint: string }> = {
  big: { title: '1 big', hint: '2+ days of work' },
  medium: { title: '3 medium', hint: '1 to 2 days' },
  small: { title: '5 small', hint: 'under a day' },
};

export function OneThreeFiveView({ tasks, lens, onOpen }: ViewProps) {
  const plan = oneThreeFive(tasks, lens);
  return (
    <div className="ws-fw-list">
      {(Object.keys(PLAN_LABELS) as PlanSize[]).map((size) => (
        <section key={size}>
          <p className="ws-field-label">
            {PLAN_LABELS[size].title} <span className="ws-fw-hint">· {PLAN_LABELS[size].hint}</span>
          </p>
          <div className="ws-fw-list">
            {plan[size].map((t) => (
              <TaskRow key={t.id} task={t} onOpen={onOpen} />
            ))}
            {Array.from({ length: PLAN_SLOTS[size] - plan[size].length }, (_, i) => (
              <div key={i} className="ws-fw-slot">
                Open slot
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

// ---------- Ivy Lee ----------

export function IvyLeeView({ tasks, lens, onOpen }: ViewProps) {
  const list = ivyLee(tasks, lens);
  if (list.length === 0) return <Empty>No open tasks to plan.</Empty>;
  return (
    <>
      <p className="ws-fw-hint" style={{ marginBottom: 12 }}>
        Work strictly top to bottom. Finish one before starting the next. Whatever is left rolls into tomorrow&apos;s
        list.
      </p>
      <div className="ws-fw-list">
        {list.map((t, i) => (
          <TaskRow key={t.id} task={t} onOpen={onOpen} lead={String(i + 1)} />
        ))}
      </div>
      {list.length < IVY_LEE_COUNT && <Empty>{`Room for ${IVY_LEE_COUNT - list.length} more.`}</Empty>}
    </>
  );
}

// ---------- MoSCoW ----------

const MOSCOW_COLUMNS: { id: Moscow; title: string; meaning: string; bg: string; text: string }[] = [
  { id: 'must', title: 'Must', meaning: 'Non-negotiable. Do these now.', bg: 'var(--ws-high-bg)', text: 'var(--ws-high-text)' },
  { id: 'should', title: 'Should', meaning: 'Important, but can wait a bit.', bg: 'var(--ws-medium-bg)', text: 'var(--ws-medium-text)' },
  { id: 'could', title: 'Could', meaning: 'Nice to have if time allows.', bg: 'var(--ws-inreview-bg)', text: 'var(--ws-inreview-text)' },
  { id: 'wont', title: "Won't (now)", meaning: 'Not this time.', bg: 'var(--ws-todo-bg)', text: 'var(--ws-todo-text)' },
];

const MOSCOW_PREVIEW = 4;

export function MoscowView({ tasks, onOpen }: Pick<ViewProps, 'tasks' | 'onOpen'>) {
  const groups = moscow(tasks);
  return (
    <div className="ws-matrix-grid">
      {MOSCOW_COLUMNS.map((c) => {
        const list = groups[c.id];
        return (
          <div key={c.id} className="ws-glass-card ws-matrix-quadrant">
            <div className="ws-matrix-quadrant__header" style={{ background: c.bg, color: c.text }}>
              <p className="ws-matrix-quadrant__title">{c.title}</p>
            </div>
            {list.length === 0 ? (
              <div className="ws-matrix-quadrant__empty">
                <p className="ws-matrix-quadrant__empty-guidance">{c.meaning}</p>
              </div>
            ) : (
              <div className="ws-matrix-quadrant__list">
                {list.slice(0, MOSCOW_PREVIEW).map((t) => (
                  <button key={t.id} type="button" className="ws-matrix-task" onClick={() => onOpen(t)}>
                    {t.title}
                  </button>
                ))}
                {list.length > MOSCOW_PREVIEW && <p className="ws-fw-hint">+{list.length - MOSCOW_PREVIEW} more</p>}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
