import type { Task } from '../types';
import { taskProgress } from '../utils/progress';

/** Thin bar + label: "2/3 phases · 67%", or just "40%" without phases. */
export default function TaskProgressBar({ task }: { task: Task }) {
  const percent = taskProgress(task);
  const phases = task.phases ?? [];
  const label = phases.length
    ? `${phases.filter((p) => p.done).length}/${phases.length} phases · ${percent}%`
    : `${percent}%`;

  return (
    <div className="ws-progress">
      <div
        className="ws-progress__track"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${task.title} progress`}
      >
        <div className="ws-progress__fill" style={{ width: `${percent}%` }} />
      </div>
      <span className="ws-progress__label">{label}</span>
    </div>
  );
}
