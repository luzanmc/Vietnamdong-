export interface SpinSegment {
  label: string;
  reward: number;
  weight: number;
  color: string;
}

export const SPIN_SEGMENTS: SpinSegment[] = [
  { label: '50 VNC', reward: 50, weight: 15, color: '#5ab8ff' },
  { label: '100 VNC', reward: 100, weight: 15, color: '#2f7bff' },
  { label: '0 VNC', reward: 0, weight: 25, color: '#7dd3fc' },
  { label: '200 VNC', reward: 200, weight: 15, color: '#4b6bff' },
  { label: '500 VNC', reward: 500, weight: 10, color: '#5ab8ff' },
  { label: '100 VNC', reward: 100, weight: 10, color: '#2f7bff' },
  { label: '20 VNC', reward: 20, weight: 8, color: '#7dd3fc' },
  { label: '1000 VNC', reward: 1000, weight: 2, color: '#4b6bff' },
];

export function pickWeightedSegment(): { index: number; segment: SpinSegment } {
  const total = SPIN_SEGMENTS.reduce((sum, s) => sum + s.weight, 0);
  let roll = Math.random() * total;
  for (let i = 0; i < SPIN_SEGMENTS.length; i++) {
    roll -= SPIN_SEGMENTS[i].weight;
    if (roll <= 0) return { index: i, segment: SPIN_SEGMENTS[i] };
  }
  return { index: 0, segment: SPIN_SEGMENTS[0] };
}
