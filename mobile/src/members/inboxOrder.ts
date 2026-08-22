import { invitationHasExpired } from './invitationCard';


export type InboxCard =
  | { readonly kind: 'invitation'; readonly key: string; readonly id: string }
  | { readonly kind: 'request'; readonly key: string; readonly id: string };


export interface InboxInput {
  readonly invitations: readonly { id: string; expiresAt: string; itineraryId: string }[];
  readonly requests: readonly { id: string; itineraryId: string }[];
  readonly now: number;
}


export function inboxCards(input: InboxInput): InboxCard[] {
  const asking = new Set(input.requests.map((request) => request.itineraryId));

  const invitations: InboxCard[] = input.invitations
    .filter((invitation) => !invitationHasExpired(invitation.expiresAt, input.now))
    .filter((invitation) => !asking.has(invitation.itineraryId))
    .map((invitation) => ({
      kind: 'invitation',
      key: `invitation:${invitation.id}`,
      id: invitation.id,
    }));

  const requests: InboxCard[] = input.requests.map((request) => ({
    kind: 'request',
    key: `request:${request.id}`,
    id: request.id,
  }));

  return [...invitations, ...requests];
}
