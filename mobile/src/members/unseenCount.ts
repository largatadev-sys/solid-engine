export interface SeenMark {
  readonly seenAt: string | null;
}


export function unseenCount(invitations: readonly SeenMark[]): number {
  return invitations.filter((invitation) => invitation.seenAt === null).length;
}


export function showsCount(unseen: number): boolean {
  return unseen > 0;
}
