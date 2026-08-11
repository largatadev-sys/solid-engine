export function stillShowing<T>(current: T | null, last: T | null): T | null {
  return current ?? last;
}
