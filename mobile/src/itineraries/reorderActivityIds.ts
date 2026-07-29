
export function reorderActivityIds(ids: string[], index: number, direction: 'up' | 'down'): string[] {
  const target = direction === 'up' ? index - 1 : index + 1;
  if (index < 0 || index >= ids.length || target < 0 || target >= ids.length) {
    return [...ids];
  }
  const next = [...ids];
  const moved = next[index];
  const displaced = next[target];
  next[index] = displaced as string;
  next[target] = moved as string;
  return next;
}
