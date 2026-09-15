const PALETTE = ['#FF8A65', '#7C9EFF', '#4FD1C5', '#F6AD55', '#B794F4', '#68D391', '#FC8181'];

function colorForName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

function initialsForName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function Avatar({
  name,
  photoURL,
  size = 44,
}: {
  name: string;
  photoURL?: string | null;
  size?: number;
}) {
  const style = { width: size, height: size, fontSize: size * 0.36 };

  if (photoURL) {
    return (
      <span className="ws-avatar" style={style}>
        <img src={photoURL} alt="" referrerPolicy="no-referrer" />
      </span>
    );
  }

  return (
    <span className="ws-avatar" style={{ ...style, background: colorForName(name || '?') }}>
      {initialsForName(name || '?')}
    </span>
  );
}
