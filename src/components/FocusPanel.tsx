import { IonIcon, IonRange, useIonToast } from '@ionic/react';
import {
  checkmarkOutline,
  pauseOutline,
  playOutline,
  stopOutline,
  playSkipForwardOutline,
  timerOutline,
  pencilOutline,
  hourglassOutline,
} from 'ionicons/icons';
import { usePomodoro, formatClock, POMODORO_PRESETS } from '../contexts/PomodoroContext';
import { formatFocusTime } from '../utils/progress';
import TaskProgressBar from './TaskProgressBar';
import type { Task } from '../types';

/**
 * Home's In Progress view: a Pomodoro timer attached to one task, plus each
 * in-progress task's phase checklist (or progress slider) and focus time.
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
  const pomodoro = usePomodoro();
  const { timer } = pomodoro;
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

  const activeLength = timer
    ? (timer.mode === 'focus' ? pomodoro.preset.focus : pomodoro.preset.break) * 60_000
    : 0;
  const elapsedPercent = timer ? 100 - (pomodoro.remainingMs / activeLength) * 100 : 0;

  return (
    <div className="ws-focus">
      <div className={`ws-glass-card ws-focus-timer${timer?.mode === 'break' ? ' is-break' : ''}`}>
        {timer ? (
          <>
            <p className="ws-focus-timer__mode">
              <IonIcon icon={timer.mode === 'focus' ? timerOutline : hourglassOutline} />
              {timer.mode === 'focus' ? (timer.endsAt ? 'Focusing on' : 'Ready to focus on') : 'Break time'}
            </p>
            <p className="ws-focus-timer__task">{timer.taskTitle}</p>
            <p className="ws-focus-timer__clock ws-num" aria-live="off">
              {formatClock(pomodoro.remainingMs)}
            </p>
            <div className="ws-progress__track">
              <div className="ws-progress__fill" style={{ width: `${elapsedPercent}%` }} />
            </div>
            <div className="ws-focus-timer__controls">
              {timer.endsAt ? (
                <button type="button" className="ws-focus-btn" onClick={pomodoro.pause}>
                  <IonIcon icon={pauseOutline} /> Pause
                </button>
              ) : (
                <button type="button" className="ws-focus-btn ws-focus-btn--primary" onClick={pomodoro.resume}>
                  <IonIcon icon={playOutline} /> {timer.remainingMs < activeLength ? 'Resume' : 'Start'}
                </button>
              )}
              {timer.mode === 'break' && (
                <button type="button" className="ws-focus-btn" onClick={pomodoro.skipBreak}>
                  <IonIcon icon={playSkipForwardOutline} /> Skip break
                </button>
              )}
              <button type="button" className="ws-focus-btn" onClick={pomodoro.stop}>
                <IonIcon icon={stopOutline} /> Stop
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="ws-focus-timer__mode">
              <IonIcon icon={timerOutline} /> Pomodoro
            </p>
            <p className="ws-focus-timer__hint">
              Tap <strong>Focus</strong> on a task below to start a {pomodoro.preset.focus}-minute session, then take
              a {pomodoro.preset.break}-minute break.
            </p>
          </>
        )}
        {(!timer || (!timer.endsAt && timer.mode === 'focus')) && (
          <div className="ws-focus-presets" role="radiogroup" aria-label="Session length">
            {POMODORO_PRESETS.map((p) => {
              const selected = p.focus === pomodoro.preset.focus;
              return (
                <button
                  key={p.focus}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  className={`ws-focus-preset${selected ? ' is-selected' : ''}`}
                  onClick={() => pomodoro.setPreset(p)}
                >
                  {p.focus}/{p.break} min
                </button>
              );
            })}
          </div>
        )}
      </div>

      {tasks.length === 0 && (
        <div className="ws-glass-card ws-empty">
          <IonIcon icon={timerOutline} className="ws-empty__icon" />
          <p>Nothing in progress. Tap a task&apos;s status pill to move it here.</p>
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

            {phases.length > 0 ? (
              <div className="ws-phase-list">
                {phases.map((phase) => (
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
                    {phase.title}
                  </button>
                ))}
              </div>
            ) : (
              <IonRange
                min={0}
                max={100}
                step={5}
                value={task.manualProgress ?? 0}
                aria-label={`${task.title} progress`}
                // ionChange fires on release, so dragging writes once, not per step.
                onIonChange={(e) => onSave({ ...task, manualProgress: e.detail.value as number })}
              />
            )}

            <div className="ws-task-card__meta">
              <span className="ws-task-card__time">
                <IonIcon icon={timerOutline} />
                {task.focusMinutes
                  ? `${formatFocusTime(task.focusMinutes)} focused · ${task.pomodoros ?? 0} session${task.pomodoros === 1 ? '' : 's'}`
                  : 'No focus time yet'}
              </span>
              <button
                type="button"
                className={`ws-focus-btn${isActive ? '' : ' ws-focus-btn--primary'}`}
                disabled={isActive}
                onClick={() => pomodoro.start(task)}
              >
                <IonIcon icon={isActive ? timerOutline : playOutline} />
                {isActive ? 'In session' : 'Focus'}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
