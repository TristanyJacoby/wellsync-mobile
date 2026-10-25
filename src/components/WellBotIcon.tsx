/** Chat bubble with a spark inside: reads as "AI chat" at a glance and
 * matches the outlined Ionicons used elsewhere (stroke follows currentColor). */
export default function WellBotIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
      <path
        d="M6 3.5h12A3.5 3.5 0 0 1 21.5 7v7.5a3.5 3.5 0 0 1-3.5 3.5h-5.2L8.4 21.2a.6.6 0 0 1-1-.45V18H6a3.5 3.5 0 0 1-3.5-3.5V7A3.5 3.5 0 0 1 6 3.5Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path d="M12 6.6l1.15 3.05 3.05 1.15-3.05 1.15L12 15l-1.15-3.05L7.8 10.8l3.05-1.15L12 6.6Z" fill="currentColor" />
      <circle cx="17" cy="7.6" r="0.95" fill="currentColor" />
    </svg>
  );
}
