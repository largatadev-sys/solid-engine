import { clearPendingJoin, loadPendingJoin, savePendingJoin } from './pendingJoinStorage';

let stashed: string | null = null;
let restored = false;


export function stashPendingJoin(token: string): void {
  stashed = token;
  void savePendingJoin(token);
}


export function pendingJoinToken(): string | null {
  return stashed;
}


export async function restorePendingJoin(): Promise<string | null> {
  if (restored) return stashed;

  restored = true;
  if (stashed === null) {
    stashed = await loadPendingJoin();
  }
  return stashed;
}


export function forgetPendingJoin(): void {
  stashed = null;
  void clearPendingJoin();
}


export function resetPendingJoinForTests(): void {
  stashed = null;
  restored = false;
}
