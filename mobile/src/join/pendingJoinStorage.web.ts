import {
  PENDING_JOIN_STORAGE_KEY,
  pendingJoinFromStorage,
  pendingJoinToStorage,
} from './pendingJoin';


function storage(): Storage | null {
  try {
    if (typeof window === 'undefined' || window.localStorage === undefined) return null;
    return window.localStorage;
  } catch {
    return null;
  }
}


export async function loadPendingJoin(): Promise<string | null> {
  const store = storage();
  if (store === null) return null;

  try {
    return pendingJoinFromStorage(store.getItem(PENDING_JOIN_STORAGE_KEY));
  } catch {
    return null;
  }
}


export async function savePendingJoin(token: string): Promise<void> {
  const store = storage();
  if (store === null) return;

  try {
    store.setItem(PENDING_JOIN_STORAGE_KEY, pendingJoinToStorage(token));
  } catch {
    return;
  }
}


export async function clearPendingJoin(): Promise<void> {
  const store = storage();
  if (store === null) return;

  try {
    store.removeItem(PENDING_JOIN_STORAGE_KEY);
  } catch {
    return;
  }
}
