import type { ReactNode } from 'react';

/** A circular countdown: the arc fills as the session elapses; the time sits in the middle. */
export default function TimerRing({
  progress,
  size = 168,
  tone = 'focus',
  children,
}: {
  /** 0 (just started) to 1 (finished). */
  progress: number;
  size?: number;
  tone?: 'focus' | 'break';
  children: ReactNode;
}) {
  const stroke = 10;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, progress));
  return (
    <div className={`ws-timer-ring ws-timer-ring--${tone}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle className="ws-timer-ring__track" cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} />
        <circle
          className="ws-timer-ring__arc"
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - clamped)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="ws-timer-ring__center">{children}</div>
    </div>
  );
}
