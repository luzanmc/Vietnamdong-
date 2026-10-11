export interface SpinSegment {
  label: string;
  reward: number;
  weight: number;
  color: string;
}

export const SPIN_SEGMENTS: SpinSegment[] = [
  { label: '0 VDX', reward: 0, weight: 30, color: '#242430' },
  { label: '1 VDX', reward: 1, weight: 28, color: '#6C63F5' },
  { label: '2 VDX', reward: 2, weight: 20, color: '#22D3EE' },
  { label: '5 VDX', reward: 5, weight: 12, color: '#F5A524' },
  { label: '10 VDX', reward: 10, weight: 7, color: '#FB6A8A' },
  { label: '50 VDX', reward: 50, weight: 3, color: '#F5A524' },
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
