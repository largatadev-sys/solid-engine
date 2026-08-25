export type LiveValue = string | number | null;

export function changedSince(previous: LiveValue | undefined, next: LiveValue): boolean {
  if (previous === undefined) return false;
  if (next === null) return false;
  return previous !== next;
}
