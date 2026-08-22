import type { MemberResponse } from '../types/api';


export type MemberControls = {

  isOwner: boolean;
};

export const OWNER_TAG = 'Owner';


export function roleTagFor(member: MemberResponse): string | null {
  return member.role === 'owner' ? OWNER_TAG : null;
}


export function memberControls(
  roster: MemberResponse[],
  myId: string | undefined,
): MemberControls {
  const me = myId === undefined ? undefined : roster.find((member) => member.travelerId === myId);

  return { isOwner: me?.role === 'owner' };
}
