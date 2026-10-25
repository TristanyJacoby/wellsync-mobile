import type { Task } from '../types';
import { taskProgress } from '../utils/progress';

/** Thin bar + label: "2/3 phases · 67%". Tasks without phases have no bar. */
export default function TaskProgressBar({ task }: { task: Task }) {
  const phases = task.phases ?? [];
  if (phases.length === 0) return null;
  const percent = taskProgress(task);
  const label = `${phases.filter((p) => p.done).length}/${phases.length} phases · ${percent}%`;

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
