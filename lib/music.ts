export function keyToPitch(key: number | null, mode: number | null) {
  if (key === null || key === undefined) return 'Unknown';
  const names = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
  const k = names[key % 12];
  if (mode === 1) return `${k} major`;
  if (mode === 0) return `${k} minor`;
  return `${k}`;
}
