import { setTokenSource } from './tokenSource';
import { getValidIdToken } from './firebaseWebRest';


export function installFirebaseTokenSource(): void {
  setTokenSource(() => getValidIdToken());
}
