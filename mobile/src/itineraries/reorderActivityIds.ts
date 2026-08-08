
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


export type ReorderDrop = { activityId: string; toIndex: number };


export function applyDrop(currentIds: string[], drop: ReorderDrop): string[] | null {
  const from = currentIds.indexOf(drop.activityId);
  if (from === -1) return null;

  const to = Math.max(0, Math.min(drop.toIndex, currentIds.length - 1));
  if (to === from) return null;

  const next = [...currentIds];
  next.splice(from, 1);
  next.splice(to, 0, drop.activityId);
  return next;
}


export type ReorderMove = { activityId: string; direction: 'up' | 'down' };


export function applyMove(currentIds: string[], move: ReorderMove): string[] | null {
  const index = currentIds.indexOf(move.activityId);
  if (index === -1) return null;

  const target = move.direction === 'up' ? index - 1 : index + 1;
  if (target < 0 || target >= currentIds.length) return null;

  return reorderActivityIds(currentIds, index, move.direction);
}
