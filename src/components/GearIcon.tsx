/** A simple gear: a hub, a ring, and eight teeth. */
export function GearIcon() {
  const teeth = [0, 45, 90, 135, 180, 225, 270, 315];
  return (
    <svg
      viewBox="0 0 24 24"
      width="26"
      height="26"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="3.5" />
      <circle cx="12" cy="12" r="7.5" />
      {teeth.map((angle) => (
        <line key={angle} x1="12" y1="2" x2="12" y2="4.5" transform={`rotate(${angle} 12 12)`} />
      ))}
    </svg>
  );
}