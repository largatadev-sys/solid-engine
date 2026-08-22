import type {
  InvitationResponse,
  JoinRequestSummaryResponse,
  MemberResponse,
} from '../types/api';


export type TripPosture = 'open' | 'published' | 'archived';

export const OWNER_SUB = 'Trip owner';

export const OFFERED_SUB = 'Ownership offered · waiting on them';

export const EMAIL_INVITATION_TITLE = 'Email invitation';

export const EMAIL_INVITED_SUB = 'Invited by email — waiting on them';

export const YOU_SUFFIX = ' · You';


export interface MemberRowModel {
  readonly kind: 'member';
  readonly travelerId: string;
  readonly title: string;
  readonly sub: string;
  readonly subIsAccent: boolean;
  readonly isYou: boolean;
  readonly avatarUrl: string | null;
  readonly displayName: string;
  readonly showMenu: boolean;
}


export interface InvitedRowModel {
  readonly kind: 'invited';
  readonly invitationId: string;
  readonly title: string;
  readonly sub: string;
  readonly emailLegacy: boolean;
  readonly avatarUrl: string | null;
  readonly tintKey: string;
  readonly canRevoke: boolean;
}


export interface RequestRowModel {
  readonly kind: 'request';
  readonly requestId: string;
  readonly travelerId: string;
  readonly title: string;
  readonly sub: string;
  readonly avatarUrl: string | null;
  readonly displayName: string;
}


export type TravelerRowModel = MemberRowModel | InvitedRowModel | RequestRowModel;


export interface TravelerSection {
  readonly key: 'travelers' | 'invited' | 'requests';
  readonly heading: string;
  readonly count: number;
  readonly rows: readonly TravelerRowModel[];
}


export interface SectionInput {
  readonly roster: readonly MemberResponse[];
  readonly invited: readonly InvitationResponse[];
  readonly requests: readonly JoinRequestSummaryResponse[];
  readonly myId: string | undefined;
  readonly posture: TripPosture;
  readonly now: number;
}


export function handleLabelOf(handle: string | null | undefined, fallback: string): string {
  if (handle !== null && handle !== undefined && handle !== '') return `@${handle}`;
  return fallback;
}


export function joinedSubOf(joinedAt: string): string {
  const at = new Date(joinedAt);
  if (Number.isNaN(at.getTime())) return 'Joined';
  return `Joined ${at.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
}


export function requestedSubOf(requestedAt: string, now: number): string {
  return `Via invite link · ${agoLabelOf(requestedAt, now)}`;
}


export function agoLabelOf(at: string, now: number): string {
  const then = new Date(at).getTime();
  if (Number.isNaN(then)) return 'just now';

  const minutes = Math.max(0, Math.floor((now - then) / 60_000));
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  return `${Math.floor(hours / 24)}d ago`;
}


export function memberSubOf(member: MemberResponse): { sub: string; accent: boolean } {
  if (member.ownershipOffered === true) return { sub: OFFERED_SUB, accent: true };
  if (member.role === 'owner') return { sub: OWNER_SUB, accent: false };
  return { sub: joinedSubOf(member.joinedAt), accent: false };
}


export function invitedSubOf(invitation: InvitationResponse): string {
  if (invitation.emailLegacy) return EMAIL_INVITED_SUB;
  const inviter = handleLabelOf(invitation.inviterHandle, 'a traveler');
  return `Invited by ${inviter} — waiting on them`;
}


function sortedRoster(roster: readonly MemberResponse[]): MemberResponse[] {
  return [...roster].sort((left, right) => {
    if (left.role === 'owner' && right.role !== 'owner') return -1;
    if (right.role === 'owner' && left.role !== 'owner') return 1;
    return left.joinedAt.localeCompare(right.joinedAt);
  });
}


export function travelerSections(input: SectionInput): TravelerSection[] {
  const { roster, invited, requests, myId, posture } = input;
  const viewerIsOwner = roster.some(
    (member) => member.travelerId === myId && member.role === 'owner',
  );
  const frozen = posture !== 'open';

  const members: MemberRowModel[] = sortedRoster(roster).map((member) => {
    const { sub, accent } = memberSubOf(member);
    const isYou = member.travelerId === myId;
    return {
      kind: 'member',
      travelerId: member.travelerId,
      title: handleLabelOf(member.handle, member.displayName),
      sub,
      subIsAccent: accent,
      isYou,
      avatarUrl: member.avatarUrl,
      displayName: member.displayName,
      showMenu: menuVisibleOn(member, { viewerIsOwner, isYou, posture }),
    };
  });

  const sections: TravelerSection[] = [
    { key: 'travelers', heading: 'Travelers', count: members.length, rows: members },
  ];

  if (!frozen && invited.length > 0) {
    const rows: InvitedRowModel[] = invited.map((invitation) => ({
      kind: 'invited',
      invitationId: invitation.id,
      title: invitation.emailLegacy
        ? EMAIL_INVITATION_TITLE
        : handleLabelOf(invitation.inviteeHandle, 'A traveler'),
      sub: invitedSubOf(invitation),
      emailLegacy: invitation.emailLegacy,
      avatarUrl: null,
      tintKey: invitation.inviteeTravelerId ?? invitation.id,
      canRevoke: true,
    }));
    sections.push({ key: 'invited', heading: 'Invited', count: rows.length, rows });
  }

  if (!frozen && viewerIsOwner && requests.length > 0) {
    const rows: RequestRowModel[] = requests.map((request) => ({
      kind: 'request',
      requestId: request.id,
      travelerId: request.travelerId,
      title: handleLabelOf(request.handle, request.displayName),
      sub: requestedSubOf(request.requestedAt, input.now),
      avatarUrl: request.avatarUrl,
      displayName: request.displayName,
    }));
    sections.push({ key: 'requests', heading: 'Requests', count: rows.length, rows });
  }

  return sections;
}


function menuVisibleOn(
  member: MemberResponse,
  view: { viewerIsOwner: boolean; isYou: boolean; posture: TripPosture },
): boolean {
  if (view.isYou) return member.role !== 'owner';
  if (view.posture !== 'open') return false;
  return view.viewerIsOwner;
}


export function addBarVisible(posture: TripPosture): boolean {
  return posture === 'open';
}
