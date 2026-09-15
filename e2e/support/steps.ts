export const OPEN_STEPS = [
  { lat: 5, lng: -12 },
  { lat: 5, lng: -2 },
  { lat: -3, lng: 4 },
];

export const FOURTH_STEP = { lat: -6, lng: -10 };

export function closed<T>(steps: T[]): T[] {
  return [...steps, steps[0]!];
}
