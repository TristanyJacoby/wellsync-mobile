import { IonIcon } from '@ionic/react';

export default function StatCard({
  icon,
  label,
  value,
  percent,
  bg,
  text,
  onClick,
}: {
  icon: string;
  label: string;
  value: string | number;
  /** Fill of the horizontal meter, 0-100. */
  percent: number;
  bg: string;
  text: string;
  /** Makes the card tappable (opens the tasks behind the number). */
  onClick?: () => void;
}) {
  const clamped = Math.max(0, Math.min(100, percent));

  const Root = onClick ? 'button' : 'div';
  return (
    <Root
      className={`ws-stat-tile${onClick ? ' ws-stat-tile--button' : ''}`}
      style={{ background: bg, color: text }}
      {...(onClick ? { type: 'button' as const, onClick, 'aria-label': `${label}: ${value}. Show tasks` } : {})}
    >
      <IonIcon icon={icon} className="ws-stat-tile__icon" />
      <p className="ws-stat-tile__value">{value}</p>
      <p className="ws-stat-tile__label">{label}</p>
      <div className="ws-stat-tile__meter">
        <div
          className="ws-stat-tile__meter-fill"
          style={{ transform: `scaleX(${clamped / 100})`, background: text }}
        />
      </div>
    </Root>
  );
}
