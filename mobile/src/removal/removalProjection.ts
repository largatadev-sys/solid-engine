export interface Removable {
  readonly id: string;
}


export function visibleAfterRemoval<T extends Removable>(
  rows: readonly T[],
  removedIds: readonly string[],
): T[] {
  if (removedIds.length === 0) {
    return [...rows];
  }
  const removed = new Set(removedIds);
  return rows.filter((row) => !removed.has(row.id));
}


export function diaryIsEmptied(
  entries: readonly Removable[] | undefined,
  removedIds: readonly string[],
): boolean {
  if (entries === undefined || entries.length === 0) {
    return false;
  }
  return visibleAfterRemoval(entries, removedIds).length === 0;
}
