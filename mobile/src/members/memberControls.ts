import type { MemberResponse } from '../types/api';


export type MemberControls = {

  isOwner: boolean;

  canInvite: boolean;

  canLeave: boolean;

  removableTravelerIds: string[];

  offeredTravelerId: string | undefined;

  offerableTravelerIds: string[];

  canRevokeOffer: boolean;

  isOfferedToMe: boolean;
};

export function memberControls(
  roster: MemberResponse[],
  myId: string | undefined,
  archived = false,
): MemberControls {
  const me = myId === undefined ? undefined : roster.find((member) => member.travelerId === myId);
  const isOwner = me?.role === 'owner';
  const offered = roster.find((member) => member.ownershipOffered === true);
  const offerPending = offered !== undefined;

  const governable = !archived;

  return {
    isOwner,
    canLeave: me !== undefined && !isOwner,
    canInvite: isOwner && governable,
    removableTravelerIds:
      isOwner && governable
        ? roster.filter((member) => member.travelerId !== myId).map((member) => member.travelerId)
        : [],
    offeredTravelerId: offered?.travelerId,
    offerableTravelerIds:
      isOwner && governable && !offerPending
        ? roster.filter((member) => member.travelerId !== myId).map((member) => member.travelerId)
        : [],
    canRevokeOffer: isOwner && governable && offerPending,
    isOfferedToMe: me !== undefined && offered?.travelerId === myId,
  };
}
