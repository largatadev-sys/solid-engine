import type { MemberResponse, MeResponse } from '../types/api';

export type ProfileCard = {
  readonly avatarUrl: string | null;
  readonly displayName: string;
  readonly handle: string | null;
  readonly bio: string | null;
  readonly vanityNumber: string | null;
};


export function profileCardOf(me: MeResponse): ProfileCard {
  return {
    avatarUrl: me.avatarUrl,
    displayName: me.displayName,
    handle: me.handle,
    bio: me.bio,
    vanityNumber: me.vanityNumber,
  };
}


export function profileCardOfMember(member: MemberResponse): ProfileCard {
  return {
    avatarUrl: member.avatarUrl,
    displayName: member.displayName,
    handle: member.handle ?? null,
    bio: member.bio ?? null,
    vanityNumber: member.vanityNumber ?? null,
  };
}
