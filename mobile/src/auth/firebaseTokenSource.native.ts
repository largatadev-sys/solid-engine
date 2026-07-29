import auth from '@react-native-firebase/auth';
import { setTokenSource } from './tokenSource';


export function installFirebaseTokenSource(): void {
  setTokenSource(async () => {
    const user = auth().currentUser;
    if (user === null) return null;
    return user.getIdToken();
  });
}
