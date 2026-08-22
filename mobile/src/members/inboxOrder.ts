import { invitationHasExpired } from './invitationCard';


export type InboxCard =
  | { readonly kind: 'invitation'; readonly key: string; readonly id: string }
  | { readonly kind: 'request'; readonly key: string; readonly id: string };


export interface InboxInput {
  readonly invitations: readonly { id: string; expiresAt: string }[];
  readonly requests: readonly { id: string }[];
  readonly now: number;
}


export function inboxCards(input: InboxInput): InboxCard[] {
  const invitations: InboxCard[] = input.invitations
    .filter((invitation) => !invitationHasExpired(invitation.expiresAt, input.now))
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
