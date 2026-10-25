import { IonIcon, useIonToast } from '@ionic/react';
import { checkmarkOutline, timerOutline, pencilOutline } from 'ionicons/icons';
import { usePomodoro } from '../contexts/PomodoroContext';
import { formatFocusTime } from '../utils/progress';
import TaskProgressBar from './TaskProgressBar';
import TaskTimer from './TaskTimer';
import type { Task } from '../types';

/**
 * Home's In Progress view: each in-progress task with its phase checklist,
 * its own Pomodoro timer and its focus time.
 */
export default function FocusPanel({
  tasks,
  onSave,
  onEdit,
  onMarkDone,
}: {
  tasks: Task[];
  onSave: (task: Task) => Promise<void>;
  onEdit: (task: Task) => void;
  onMarkDone: (task: Task) => void;
}) {
  const { timer } = usePomodoro();
  const [presentToast] = useIonToast();

  async function togglePhase(task: Task, phaseId: string) {
    const phases = (task.phases ?? []).map((p) => (p.id === phaseId ? { ...p, done: !p.done } : p));
    const updated = { ...task, phases };
    await onSave(updated);
    const justFinished = phases.every((p) => p.done) && (task.phases ?? []).some((p) => !p.done);
    if (justFinished) {
      presentToast({
        message: 'All phases done!',
        duration: 6000,
        position: 'bottom',
        positionAnchor: 'ws-tab-bar',
        cssClass: 'ws-undo-toast',
        buttons: [{ text: 'Mark task done', role: 'cancel', handler: () => onMarkDone(updated) }],
      });
    }
  }

  return (
    <div className="ws-focus">
      {tasks.length === 0 && (
        <div className="ws-glass-card ws-empty">
          <IonIcon icon={timerOutline} className="ws-empty__icon" />
          <p>Nothing in progress. Tap the circle on a To Do task to start it.</p>
        </div>
      )}

      {tasks.map((task) => {
        const isActive = timer?.taskId === task.id;
        const phases = task.phases ?? [];
        return (
          <div key={task.id} className={`ws-glass-card ws-task-card ws-focus-task${isActive ? ' is-active' : ''}`}>
            <div className="ws-task-card__top">
              <p className="ws-task-card__title" style={{ margin: 0 }}>
                {task.title}
              </p>
              <button className="ws-round-btn" aria-label={`Edit ${task.title}`} onClick={() => onEdit(task)}>
                <IonIcon icon={pencilOutline} style={{ fontSize: 14 }} />
              </button>
            </div>

            <TaskProgressBar task={task} />

            {phases.length > 0 && (
              <div className="ws-phase-list">
                {phases.map((phase, i) => (
                  <button
                    key={phase.id}
                    type="button"
                    className={`ws-phase-check${phase.done ? ' is-done' : ''}`}
                    aria-pressed={phase.done}
                    onClick={() => togglePhase(task, phase.id)}
                  >
                    <span className={`ws-checkbox-btn ws-checkbox-btn--sm${phase.done ? ' is-done' : ''}`} aria-hidden="true">
                      {phase.done && <IonIcon icon={checkmarkOutline} />}
                    </span>
                    <span className="ws-phase-check__num">{i + 1}.</span> {phase.title}
                  </button>
                ))}
              </div>
            )}

            <TaskTimer task={task} />

            <div className="ws-task-card__meta">
              <span className="ws-task-card__time">
                <IonIcon icon={timerOutline} />
                {task.focusMinutes
                  ? `${formatFocusTime(task.focusMinutes)} focused · ${task.pomodoros ?? 0} session${task.pomodoros === 1 ? '' : 's'}`
                  : 'No focus time yet'}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
