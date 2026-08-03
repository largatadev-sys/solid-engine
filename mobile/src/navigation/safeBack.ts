import { useRouter } from 'expo-router';


export type BackTarget = Parameters<ReturnType<typeof useRouter>['replace']>[0];


export type BackAction = { kind: 'pop' } | { kind: 'replace'; to: BackTarget };


export function backAction(canGoBack: boolean, parent: BackTarget | undefined): BackAction {
  if (canGoBack) return { kind: 'pop' };
  return { kind: 'replace', to: parent ?? '/' };
}


export function useSafeBack(parent?: BackTarget): () => void {
  const router = useRouter();

  return () => {
    const action = backAction(router.canGoBack(), parent);
    if (action.kind === 'pop') {
      router.back();
      return;
    }
    router.replace(action.to);
  };
}
