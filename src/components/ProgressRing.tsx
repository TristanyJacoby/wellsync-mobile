export default function ProgressRing({
  percent,
  size = 110,
  stroke = 12,
  trackColor = 'rgba(255,255,255,0.14)',
  fillColor = 'var(--ws-amber)',
}: {
  percent: number;
  size?: number;
  stroke?: number;
  trackColor?: string;
  fillColor?: string;
}) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, percent));
  const offset = circumference * (1 - clamped / 100);
  const center = size / 2;
  // The reference hosts the ring's percentage on a bright white disc inside
  // the dark stat card, making it the card's focal point - without this the
  // numeral just floats dark-on-dark.
  const hostRadius = radius - stroke / 2 - 4;

  return (
    <svg className="ws-progress-ring" width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={center} cy={center} r={radius} fill="none" stroke={trackColor} strokeWidth={stroke} />
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke={fillColor}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${center} ${center})`}
      />
      <circle cx={center} cy={center} r={hostRadius} fill="#fff" className="ws-progress-ring__host" />
      <text
        x="50%"
        y="50%"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={size * 0.2}
        className="ws-progress-ring__label"
      >
        {Math.round(clamped)}%
      </text>
    </svg>
  );
}
