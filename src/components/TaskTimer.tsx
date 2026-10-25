import { IonIcon, useIonAlert } from '@ionic/react';
import { pauseOutline, playOutline, playSkipForwardOutline, stopOutline, timerOutline } from 'ionicons/icons';
import { usePomodoro, formatClock, POMODORO_PRESETS } from '../contexts/PomodoroContext';
import TimerRing from './TimerRing';
import type { Task } from '../types';

/**
 * The Pomodoro timer for one task, shown inside that task's card. Only one
 * timer runs at a time: on every other task this offers "Switch here".
 */
export default function TaskTimer({ task }: { task: Task }) {
  const pomodoro = usePomodoro();
  const { timer } = pomodoro;
  const [presentAlert] = useIonAlert();
  const mine = timer?.taskId === task.id;
  const elsewhere = !!timer && !mine;

  const presetLabel = `${pomodoro.preset.focus}/${pomodoro.preset.break} min`;
  function nextPreset() {
    const i = POMODORO_PRESETS.findIndex((p) => p.focus === pomodoro.preset.focus);
    pomodoro.setPreset(POMODORO_PRESETS[(i + 1) % POMODORO_PRESETS.length]);
  }

  if (mine && timer) {
    const total = (timer.mode === 'focus' ? pomodoro.preset.focus : pomodoro.preset.break) * 60_000;
    const elapsed = total ? 1 - pomodoro.remainingMs / total : 0;
    const running = !!timer.endsAt;
    return (
      <div className="ws-timer">
        <TimerRing progress={elapsed} tone={timer.mode}>
          <span className="ws-timer__mode">{timer.mode === 'focus' ? (running ? 'Focus' : 'Ready') : 'Break'}</span>
          <span className="ws-timer__clock ws-num">{formatClock(pomodoro.remainingMs)}</span>
        </TimerRing>
        <div className="ws-timer__controls">
          {running ? (
            <button type="button" className="ws-focus-btn" onClick={pomodoro.pause}>
              <IonIcon icon={pauseOutline} /> Pause
            </button>
          ) : (
            <button type="button" className="ws-focus-btn ws-focus-btn--primary" onClick={pomodoro.resume}>
              <IonIcon icon={playOutline} /> {pomodoro.remainingMs < total ? 'Resume' : 'Start'}
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
      </div>
    );
  }

  if (elsewhere) {
    return (
      <div className="ws-timer-idle">
        <span className="ws-timer-idle__note">
          <IonIcon icon={timerOutline} /> Timer is running on “{timer!.taskTitle}”
        </span>
        <button
          type="button"
          className="ws-focus-btn"
          onClick={() =>
            presentAlert({
              header: 'Switch timer?',
              message: `Stop the timer on “${timer!.taskTitle}” and start a new session here?`,
              buttons: ['Cancel', { text: 'Switch', handler: () => pomodoro.start(task) }],
            })
          }
        >
          Switch here
        </button>
      </div>
    );
  }

  return (
    <div className="ws-timer-idle">
      <button type="button" className="ws-focus-length" onClick={nextPreset} aria-label={`Session length ${presetLabel}. Tap to change.`}>
        <IonIcon icon={timerOutline} /> {presetLabel}
      </button>
      <button type="button" className="ws-focus-btn ws-focus-btn--primary" onClick={() => pomodoro.start(task)}>
        <IonIcon icon={playOutline} /> Start focus
      </button>
    </div>
  );
}
