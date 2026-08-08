import {
  editItineraryAction,
  ladderCta,
  showsStepBack,
  stateBadge,
  workspaceAffordances,
} from '../src/itineraries/workspaceControls';
import type { ItineraryResponse, ItineraryState, LeaseHolderResponse } from '../src/types/api';


function holder(tag: string): LeaseHolderResponse {
  return {
    travelerId: tag,
    handle: `largata.dev+${tag}`,
    displayName: null,
    avatarUrl: null,
    expiresAt: '2026-08-08T00:03:00Z',
  };
}


function trip(over: Partial<ItineraryResponse> = {}): ItineraryResponse {
  return {
    id: 'trip-1',
    title: 'Island Hopping in El Nido',
    destinations: ['El Nido'],
    days: [],
    state: 'draft',
    published: false,
    visibility: 'private',
    archived: false,
    createdAt: '2026-08-08T00:00:00Z',
    ...over,
  } as ItineraryResponse;
}


describe('stateBadge', () => {
  const cases: Array<[ItineraryState, string, string, string]> = [
    ['draft', 'Draft', '#FEF3C7', '#D97706'],
    ['upcoming', 'Ready', '#DCFCE7', '#15803D'],
    ['ongoing', 'Ongoing', '#E0F2FE', '#0369A1'],
    ['completed', 'Completed', '#F3F4F6', '#6B7280'],
  ];

  it.each(cases)('renders %s as the %s badge', (state, label, background, foreground) => {
    expect(stateBadge(trip({ state }))).toEqual({ label, background, foreground });
  });

  it('says Draft TRIP Workspace on the editor, per the mock header', () => {
    expect(stateBadge(trip({ state: 'draft' }), 'editor').label).toBe('Draft TRIP Workspace');
  });
});


describe('ladderCta', () => {
  it('offers no ladder CTA on a draft — Edit Itinerary is the act', () => {
    expect(ladderCta(trip({ state: 'draft' }), true)).toBeNull();
  });

  it('offers Start Trip on Ready', () => {
    expect(ladderCta(trip({ state: 'upcoming' }), true)).toEqual({ act: 'start', label: 'Start Trip' });
  });

  it('offers Complete Trip while ongoing', () => {
    expect(ladderCta(trip({ state: 'ongoing' }), true)).toEqual({ act: 'complete', label: 'Complete Trip' });
  });

  it('offers Publish Itinerary once completed', () => {
    expect(ladderCta(trip({ state: 'completed' }), true)).toEqual({ act: 'publish', label: 'Publish Itinerary' });
  });

  it('hides every ladder CTA from a member', () => {
    const states: ItineraryState[] = ['draft', 'upcoming', 'ongoing', 'completed'];
    states.forEach((state) => expect(ladderCta(trip({ state }), false)).toBeNull());
  });

  it('hides the ladder on an archived trip', () => {
    expect(ladderCta(trip({ state: 'upcoming', archived: true }), true)).toBeNull();
  });
});


describe('showsStepBack', () => {
  it('walks down from ongoing and completed only', () => {
    expect(showsStepBack(trip({ state: 'ongoing' }), true)).toBe(true);
    expect(showsStepBack(trip({ state: 'completed' }), true)).toBe(true);
  });

  it('does not offer Step back on draft, and Ready steps back via Edit Itinerary', () => {
    expect(showsStepBack(trip({ state: 'draft' }), true)).toBe(false);
    expect(showsStepBack(trip({ state: 'upcoming' }), true)).toBe(false);
  });

  it('is owner-only and never on an archived trip', () => {
    expect(showsStepBack(trip({ state: 'ongoing' }), false)).toBe(false);
    expect(showsStepBack(trip({ state: 'ongoing', archived: true }), true)).toBe(false);
  });
});


describe('editItineraryAction', () => {
  it('enters the editor directly from draft', () => {
    expect(editItineraryAction(trip({ state: 'draft' }), true)).toEqual({ kind: 'edit' });
  });

  it('reopens a Ready trip and enters the editor in one tap', () => {
    expect(editItineraryAction(trip({ state: 'upcoming' }), true)).toEqual({ kind: 'reopen-then-edit' });
  });

  it('reopens one rung at a time from ongoing and completed too', () => {
    expect(editItineraryAction(trip({ state: 'ongoing' }), true)).toEqual({ kind: 'reopen-then-edit' });
    expect(editItineraryAction(trip({ state: 'completed' }), true)).toEqual({ kind: 'reopen-then-edit' });
  });

  it('is blocked while another traveler holds the Editing Session, and names them', () => {
    const held = trip({ editingSession: holder('t2') });
    expect(editItineraryAction(held, true, 't1')).toEqual({
      kind: 'blocked',
      holder: '@largata.dev+t2',
    });
  });

  it('is not blocked by the viewer\'s own session', () => {
    const mine = trip({ editingSession: holder('t1') });
    expect(editItineraryAction(mine, true, 't1')).toEqual({ kind: 'edit' });
  });

  it('is hidden on archived and published trips', () => {
    expect(editItineraryAction(trip({ archived: true }), true)).toEqual({ kind: 'hidden' });
    expect(editItineraryAction(trip({ published: true, state: 'completed' }), true)).toEqual({ kind: 'hidden' });
  });
});


describe('workspaceAffordances', () => {
  it('renders no edit affordance anywhere on the viewer', () => {
    const viewer = workspaceAffordances('viewer', true);
    expect(viewer.showsDragHandles).toBe(false);
    expect(viewer.showsActivityEditing).toBe(false);
    expect(viewer.showsAddDay).toBe(false);
    expect(viewer.showsDayDelete).toBe(false);
    expect(viewer.showsFinalize).toBe(false);
  });

  it('opens every editing affordance for the owner in the editor', () => {
    const editor = workspaceAffordances('editor', true);
    expect(editor.showsDragHandles).toBe(true);
    expect(editor.showsActivityEditing).toBe(true);
    expect(editor.showsAddDay).toBe(true);
    expect(editor.showsDayDelete).toBe(true);
    expect(editor.showsFinalize).toBe(true);
  });

  it('keeps activity editing member-wide but hides the owner-only acts', () => {
    const member = workspaceAffordances('editor', false);
    expect(member.showsActivityEditing).toBe(true);
    expect(member.showsDragHandles).toBe(true);
    expect(member.showsAddDay).toBe(false);
    expect(member.showsDayDelete).toBe(false);
    expect(member.showsFinalize).toBe(false);
  });
});
