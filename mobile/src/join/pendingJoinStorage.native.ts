import { File, Paths } from 'expo-file-system';
import { pendingJoinFromStorage, pendingJoinToStorage } from './pendingJoin';


const PENDING_JOIN_FILE = 'pending-join.txt';


export async function loadPendingJoin(): Promise<string | null> {
  try {
    const file = new File(Paths.document, PENDING_JOIN_FILE);
    if (!file.exists) {
      return null;
    }
    return pendingJoinFromStorage(file.textSync());
  } catch {
    return null;
  }
}


export async function savePendingJoin(token: string): Promise<void> {
  try {
    new File(Paths.document, PENDING_JOIN_FILE).write(pendingJoinToStorage(token));
  } catch {
    return;
  }
}


export async function clearPendingJoin(): Promise<void> {
  try {
    const file = new File(Paths.document, PENDING_JOIN_FILE);
    if (file.exists) {
      file.delete();
    }
  } catch {
    return;
  }
}
