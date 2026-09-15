import { IonIcon } from '@ionic/react';

export default function StatCard({
  icon,
  label,
  value,
  percent,
  bg,
  text,
}: {
  icon: string;
  label: string;
  value: string | number;
  /** Fill of the horizontal meter, 0-100. */
  percent: number;
  bg: string;
  text: string;
}) {
  const clamped = Math.max(0, Math.min(100, percent));

  return (
    <div className="ws-stat-tile" style={{ background: bg, color: text }}>
      <IonIcon icon={icon} className="ws-stat-tile__icon" />
      <p className="ws-stat-tile__value">{value}</p>
      <p className="ws-stat-tile__label">{label}</p>
      <div className="ws-stat-tile__meter">
        <div
          className="ws-stat-tile__meter-fill"
          style={{ transform: `scaleX(${clamped / 100})`, background: text }}
        />
      </div>
    </div>
  );
}
