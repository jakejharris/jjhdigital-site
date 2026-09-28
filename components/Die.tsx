// A die with one face per typeface. Seven pips is not a real die; it only
// shows up on the edition that is not on the list.
const spots = {
  tl: [8, 8], tr: [16, 8], ml: [8, 12], c: [12, 12], mr: [16, 12], bl: [8, 16], br: [16, 16],
} as const;
const faces: Record<number, (keyof typeof spots)[]> = {
  0: [],
  1: ['c'],
  2: ['tl', 'br'],
  3: ['tl', 'c', 'br'],
  4: ['tl', 'tr', 'bl', 'br'],
  5: ['tl', 'tr', 'c', 'bl', 'br'],
  6: ['tl', 'tr', 'ml', 'mr', 'bl', 'br'],
  7: ['tl', 'tr', 'ml', 'c', 'mr', 'bl', 'br'],
};

export default function Die({ pips }: { pips: number }) {
  return (
    <svg className="die" width="26" height="26" viewBox="0 0 24 24" aria-hidden="true" data-pips={pips}>
      <rect x="3.75" y="3.75" width="16.5" height="16.5" rx="4" fill="none" stroke="currentColor" strokeWidth="1.5" />
      {(faces[pips] ?? []).map((spot) => (
        <circle key={spot} cx={spots[spot][0]} cy={spots[spot][1]} r="1.4" fill="currentColor" />
      ))}
    </svg>
  );
}
