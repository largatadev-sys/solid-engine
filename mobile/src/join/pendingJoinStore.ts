import { clearPendingJoin, loadPendingJoin, savePendingJoin } from './pendingJoinStorage';

let stashed: string | null = null;
let restored = false;

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
  restored = true;
  void savePendingJoin(token);
  announce();
}


export function pendingJoinToken(): string | null {
  return stashed;
}


export async function restorePendingJoin(): Promise<string | null> {
  if (restored) return stashed;

  restored = true;
  if (stashed === null) {
    stashed = await loadPendingJoin();
    if (stashed !== null) announce();
  }
  return stashed;
}


export function forgetPendingJoin(): void {
  if (stashed === null) return;
  stashed = null;
  restored = true;
  void clearPendingJoin();
  announce();
}


export function resetPendingJoinForTests(): void {
  stashed = null;
  restored = false;
  listeners.clear();
}
