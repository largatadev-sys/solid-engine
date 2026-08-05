import { useRouter } from 'expo-router';
import { useCallback } from 'react';


export type BackTarget = Parameters<ReturnType<typeof useRouter>['replace']>[0];


export type BackAction = { kind: 'pop' } | { kind: 'replace'; to: BackTarget };


export function backAction(
  canGoBack: boolean,
  parent: BackTarget | undefined,
  always = false,
): BackAction {
  if (always && parent !== undefined) return { kind: 'replace', to: parent };
  if (canGoBack) return { kind: 'pop' };
  return { kind: 'replace', to: parent ?? '/' };
}


export function useSafeBack(parent?: BackTarget, always = false): () => void {
  const router = useRouter();
  const target = JSON.stringify(parent ?? null);

  return useCallback(() => {
    const action = backAction(router.canGoBack(), parent, always);
    if (action.kind === 'pop') {
      router.back();
      return;
    }
    router.replace(action.to);
  }, [router, target, always]);
}
