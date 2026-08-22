import { clearPendingJoin, loadPendingJoin, savePendingJoin } from './pendingJoinStorage';

let stashed: string | null = null;
let settled = false;
let loading: Promise<string | null> | null = null;

const listeners = new Set<() => void>();


function announce(): void {
  for (const listener of listeners) listener();
}


export function subscribeToPendingJoin(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}


export function stashPendingJoin(token: string): void {
  if (stashed === token) return;
  stashed = token;
  settled = true;
  void savePendingJoin(token);
  announce();
}


export function pendingJoinToken(): string | null {
  return stashed;
}


export function pendingJoinSettled(): boolean {
  return settled;
}


export async function restorePendingJoin(): Promise<string | null> {
  if (settled) return stashed;
  if (loading !== null) return loading;

  loading = loadPendingJoin().then((stored) => {
    loading = null;
    if (!settled) {
      stashed = stored;
      settled = true;
    }
    announce();
    return stashed;
  });

  return loading;
}


export function forgetPendingJoin(): void {
  if (stashed === null) return;
  stashed = null;
  settled = true;
  void clearPendingJoin();
  announce();
}


export function resetPendingJoinForTests(): void {
  stashed = null;
  settled = false;
  loading = null;
  listeners.clear();
}
