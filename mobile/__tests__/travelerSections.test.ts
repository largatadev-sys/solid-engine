import {
  canAddTravelers,
  agoLabelOf,
  EMAIL_INVITATION_TITLE,
  EMAIL_INVITED_SUB,
  invitedSubOf,
  memberSubOf,
  OFFERED_SUB,
  OWNER_SUB,
  travelerSections,
  type SectionInput,
} from '../src/members/travelerSections';
import type { MemberRowModel, TravelerSection } from '../src/members/travelerSections';
import type {
  InvitationResponse,
  JoinRequestSummaryResponse,
  MemberResponse,
} from '../src/types/api';

const NOW = Date.parse('2026-02-20T12:00:00Z');

function memberRows(sections: TravelerSection[]): MemberRowModel[] {
  return sections[0]!.rows.filter((row): row is MemberRowModel => row.kind === 'member');
}

function member(over: Partial<MemberResponse> & { travelerId: string }): MemberResponse {
  return {
    displayName: 'A Traveler',
    avatarUrl: null,
    role: 'member',
    joinedAt: '2026-02-12T00:00:00Z',
    ...over,
  };
}

function invitation(over: Partial<InvitationResponse> & { id: string }): InvitationResponse {
  return {
    email: null,
    inviteeTravelerId: 't-invitee',
    inviteeHandle: 'kaitanaka',
    inviterHandle: 'mayasantos',
    emailLegacy: false,
    createdAt: '2026-02-18T00:00:00Z',
    expiresAt: '2026-03-04T00:00:00Z',
    ...over,
  };
}

function request(
  over: Partial<JoinRequestSummaryResponse> & { id: string },
): JoinRequestSummaryResponse {
  return {
    travelerId: 't-asker',
    displayName: 'Sofia Bianchi',
    handle: 'sofiabianchi',
    avatarUrl: null,
    requestedAt: '2026-02-20T10:00:00Z',
    ...over,
  };
}

function input(over: Partial<SectionInput> = {}): SectionInput {
  return {
    roster: [],
    invited: [],
    requests: [],
    myId: 'owner-1',
    posture: 'open',
    now: NOW,
    ...over,
  };
}

describe('section assembly', () => {
  it('puts the owner first, then orders the rest by join date', () => {
    const sections = travelerSections(
      input({
        roster: [
          member({ travelerId: 'late', joinedAt: '2026-02-20T00:00:00Z' }),
          member({ travelerId: 'owner-1', role: 'owner', joinedAt: '2026-02-25T00:00:00Z' }),
          member({ travelerId: 'early', joinedAt: '2026-02-12T00:00:00Z' }),
        ],
      }),
    );

    expect(memberRows(sections).map((row) => row.travelerId)).toEqual([
      'owner-1',
      'early',
      'late',
    ]);
  });

  it('keeps the sections in their fixed order with live counts', () => {
    const sections = travelerSections(
      input({
        roster: [member({ travelerId: 'owner-1', role: 'owner' })],
        invited: [invitation({ id: 'i1' })],
        requests: [request({ id: 'r1' })],
      }),
    );

    expect(sections.map((section) => section.key)).toEqual(['travelers', 'invited', 'requests']);
    expect(sections.map((section) => section.count)).toEqual([1, 1, 1]);
  });

  it('renders no Invited section when nothing is pending', () => {
    const sections = travelerSections(
      input({ roster: [member({ travelerId: 'owner-1', role: 'owner' })] }),
    );

    expect(sections.map((section) => section.key)).toEqual(['travelers']);
  });

  it('never renders Requests to a member — not even empty', () => {
    const sections = travelerSections(
      input({
        myId: 'member-1',
        roster: [
          member({ travelerId: 'owner-1', role: 'owner' }),
          member({ travelerId: 'member-1' }),
        ],
        requests: [request({ id: 'r1' })],
      }),
    );

    expect(sections.map((section) => section.key)).not.toContain('requests');
  });

  it('shows the Invited section to a plain member, who may revoke', () => {
    const sections = travelerSections(
      input({
        myId: 'member-1',
        roster: [
          member({ travelerId: 'owner-1', role: 'owner' }),
          member({ travelerId: 'member-1' }),
        ],
        invited: [invitation({ id: 'i1' })],
      }),
    );

    const invited = sections.find((section) => section.key === 'invited');
    expect(invited?.rows[0]).toMatchObject({ canRevoke: true });
  });
});

describe('row subs', () => {
  it('names the owner', () => {
    expect(memberSubOf(member({ travelerId: 'x', role: 'owner' })).sub).toBe(OWNER_SUB);
  });

  it('accents a pending ownership offer over the join date', () => {
    const offered = memberSubOf(member({ travelerId: 'x', ownershipOffered: true }));

    expect(offered.sub).toBe(OFFERED_SUB);
    expect(offered.accent).toBe(true);
  });

  it('falls back to the join date', () => {
    expect(memberSubOf(member({ travelerId: 'x', joinedAt: '2026-02-12T00:00:00Z' })).sub)
      .toContain('Joined');
  });

  it('names the inviter on a handle invitation', () => {
    expect(invitedSubOf(invitation({ id: 'i1' }))).toBe(
      'Invited by @mayasantos — waiting on them',
    );
  });

  it('never names an address on an email-legacy invitation', () => {
    const row = invitation({
      id: 'i1',
      emailLegacy: true,
      inviteeTravelerId: null,
      inviteeHandle: null,
      email: 'someone@example.com',
    });

    expect(invitedSubOf(row)).toBe(EMAIL_INVITED_SUB);
    expect(invitedSubOf(row)).not.toContain('@example.com');
  });

  it('titles an email-legacy row without its address', () => {
    const sections = travelerSections(
      input({
        roster: [member({ travelerId: 'owner-1', role: 'owner' })],
        invited: [
          invitation({
            id: 'i1',
            emailLegacy: true,
            inviteeTravelerId: null,
            inviteeHandle: null,
            email: 'someone@example.com',
          }),
        ],
      }),
    );

    const row = sections.find((section) => section.key === 'invited')?.rows[0];
    expect(row).toMatchObject({ title: EMAIL_INVITATION_TITLE });
    expect(JSON.stringify(row)).not.toContain('@example.com');
  });
});

describe('the viewer', () => {
  it('marks their own row', () => {
    const sections = travelerSections(
      input({
        myId: 'member-1',
        roster: [
          member({ travelerId: 'owner-1', role: 'owner' }),
          member({ travelerId: 'member-1' }),
        ],
      }),
    );

    const rows = memberRows(sections);
    expect(rows.find((row) => row.travelerId === 'member-1')?.isYou).toBe(true);
    expect(rows.find((row) => row.travelerId === 'owner-1')?.isYou).toBe(false);
  });
});

describe('the overflow control', () => {
  it('shows on every non-owner row in the owner view', () => {
    const sections = travelerSections(
      input({
        myId: 'owner-1',
        roster: [
          member({ travelerId: 'owner-1', role: 'owner' }),
          member({ travelerId: 'member-1' }),
          member({ travelerId: 'member-2' }),
        ],
      }),
    );

    const rows = memberRows(sections);
    expect(rows.find((row) => row.travelerId === 'owner-1')?.showMenu).toBe(false);
    expect(rows.filter((row) => row.showMenu).map((row) => row.travelerId)).toEqual([
      'member-1',
      'member-2',
    ]);
  });

  it('shows only on your own row in the member view', () => {
    const sections = travelerSections(
      input({
        myId: 'member-1',
        roster: [
          member({ travelerId: 'owner-1', role: 'owner' }),
          member({ travelerId: 'member-1' }),
          member({ travelerId: 'member-2' }),
        ],
      }),
    );

    const rows = memberRows(sections);
    expect(rows.filter((row) => row.showMenu).map((row) => row.travelerId)).toEqual(['member-1']);
  });

  it('survives on your own row when the trip is published — leave is the one door left', () => {
    const sections = travelerSections(
      input({
        myId: 'member-1',
        posture: 'published',
        roster: [
          member({ travelerId: 'owner-1', role: 'owner' }),
          member({ travelerId: 'member-1' }),
        ],
      }),
    );

    const rows = memberRows(sections);
    expect(rows.filter((row) => row.showMenu).map((row) => row.travelerId)).toEqual(['member-1']);
  });

  it('survives on your own row when the trip is archived — S1.9 canon, the server allows it', () => {
    const sections = travelerSections(
      input({
        myId: 'member-1',
        posture: 'archived',
        roster: [
          member({ travelerId: 'owner-1', role: 'owner' }),
          member({ travelerId: 'member-1' }),
        ],
      }),
    );

    const rows = memberRows(sections);
    expect(rows.filter((row) => row.showMenu).map((row) => row.travelerId)).toEqual(['member-1']);
  });

  it('never offers the owner a way out of their own trip', () => {
    const sections = travelerSections(
      input({ myId: 'owner-1', roster: [member({ travelerId: 'owner-1', role: 'owner' })] }),
    );

    expect(memberRows(sections)[0]!.showMenu).toBe(false);
  });
});

describe('the published freeze on the surface', () => {
  it('hides Invited and Requests', () => {
    const sections = travelerSections(
      input({
        posture: 'published',
        roster: [member({ travelerId: 'owner-1', role: 'owner' })],
        invited: [invitation({ id: 'i1' })],
        requests: [request({ id: 'r1' })],
      }),
    );

    expect(sections.map((section) => section.key)).toEqual(['travelers']);
  });

  it('takes the add bar away, and archive keeps it away', () => {
    expect(canAddTravelers('open')).toBe(true);
    expect(canAddTravelers('published')).toBe(false);
    expect(canAddTravelers('archived')).toBe(false);
  });
});

describe('the ago label', () => {
  it('reads in minutes, hours then days', () => {
    expect(agoLabelOf('2026-02-20T11:58:00Z', NOW)).toBe('2m ago');
    expect(agoLabelOf('2026-02-20T10:00:00Z', NOW)).toBe('2h ago');
    expect(agoLabelOf('2026-02-18T12:00:00Z', NOW)).toBe('2d ago');
  });

  it('never reads in the future when a clock skews', () => {
    expect(agoLabelOf('2026-02-20T12:05:00Z', NOW)).toBe('just now');
  });
});
