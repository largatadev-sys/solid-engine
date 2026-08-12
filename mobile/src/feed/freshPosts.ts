export const POLL_MS = 60_000;


export function freshCount(latest: readonly string[], shown: readonly string[]): number {
  if (shown.length === 0) {
    return 0;
  }
  const known = new Set(shown);
  return latest.filter((id) => !known.has(id)).length;
}


export function showsPill(fresh: number, scrolledDown: boolean): boolean {
  return fresh > 0 && scrolledDown;
}
