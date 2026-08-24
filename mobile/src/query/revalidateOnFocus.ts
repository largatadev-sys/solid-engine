export interface RevalidationSubject {
  readonly enabled: boolean;
  readonly isPending: boolean;
  readonly isFetching: boolean;
}


export function shouldRevalidate(subject: RevalidationSubject): boolean {
  if (!subject.enabled) return false;
  if (subject.isPending) return false;
  return !subject.isFetching;
}
