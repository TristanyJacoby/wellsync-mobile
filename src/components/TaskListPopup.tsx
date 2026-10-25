import { IonIcon } from '@ionic/react';
import { closeOutline } from 'ionicons/icons';
import { format, parseISO } from 'date-fns';
import { priorityPillStyle } from '../utils/board';
import PopupCard from './PopupCard';
import type { Task } from '../types';

export interface TaskListView {
  title: string;
  hint?: string;
  tasks: Task[];
  /** Group by the day each task was finished (the completed archive). */
  byCompletedDay?: boolean;
}

/** A blurred pop-up card listing tasks. Tapping one hands it to onOpenTask. */
export default function TaskListPopup({
  view,
  onClose,
  onOpenTask,
}: {
  view: TaskListView | null;
  onClose: () => void;
  onOpenTask: (task: Task) => void;
}) {
  // Keep the last content while the card fades out.
  const shown = view ?? { title: '', tasks: [] };

  const groups = shown.byCompletedDay ? groupByDay(shown.tasks) : [{ label: '', tasks: shown.tasks }];

  return (
    <PopupCard open={!!view} onClose={onClose} label={shown.title}>
      <div className="ws-tasklist__head">
        <div>
          <h3>{shown.title}</h3>
          {shown.hint && <p className="ws-premium__reason">{shown.hint}</p>}
        </div>
        <button className="ws-round-btn" aria-label="Close" onClick={onClose}>
          <IonIcon icon={closeOutline} style={{ fontSize: 18 }} />
        </button>
      </div>

      {shown.tasks.length === 0 ? (
        <p className="ws-fw-empty">Nothing here yet.</p>
      ) : (
        <div className="ws-tasklist">
          {groups.map((g) => (
            <section key={g.label || 'all'}>
              {g.label && <p className="ws-tasklist__day">{g.label}</p>}
              {g.tasks.map((t) => {
                const p = priorityPillStyle(t.priority);
                return (
                  <button key={t.id} type="button" className="ws-tasklist__row" onClick={() => onOpenTask(t)}>
                    <span className="ws-tasklist__dot" style={{ background: p.text }} aria-hidden="true" />
                    <span className="ws-tasklist__text">
                      <strong>{t.title}</strong>
                      <span>Due {format(parseISO(t.dueDate), 'MMM d')}</span>
                    </span>
                  </button>
                );
              })}
            </section>
          ))}
        </div>
      )}
    </PopupCard>
  );
}

function groupByDay(tasks: Task[]): { label: string; tasks: Task[] }[] {
  const sorted = [...tasks].sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''));
  const out: { label: string; tasks: Task[] }[] = [];
  for (const t of sorted) {
    const label = t.completedAt ? format(new Date(t.completedAt), 'EEEE, MMM d') : 'Earlier';
    const last = out[out.length - 1];
    if (last?.label === label) last.tasks.push(t);
    else out.push({ label, tasks: [t] });
  }
  return out;
}
