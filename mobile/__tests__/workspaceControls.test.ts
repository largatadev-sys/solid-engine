import {
  editItineraryAction,
  ladderCta,
  showsStepBack,
  stateBadge,
  stepBackWording,
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
    ['ongoing', 'Active', '#E0F2FE', '#0369A1'],
    ['completed', 'Completed', '#F3F4F6', '#6B7280'],
  ];

  it.each(cases)('renders %s as the %s badge', (state, label, background, foreground) => {
    expect(stateBadge(trip({ state }))).toEqual({ label, background, foreground });
  });

  it('says Trip Workspace on the editor in every state — the chip is where you are, not where the trip is (S4.24)', () => {
    const states: ItineraryState[] = ['draft', 'upcoming', 'ongoing', 'completed'];
    states.forEach((state) => expect(stateBadge(trip({ state }), 'editor').label).toBe('Trip Workspace'));
  });

  it('never says Ongoing anywhere a traveler reads a state', () => {
    const states: ItineraryState[] = ['draft', 'upcoming', 'ongoing', 'completed'];
    states.forEach((state) => expect(stateBadge(trip({ state })).label).not.toBe('Ongoing'));
  });

  it.each(cases)('leaves the viewer chip on %s speaking lifecycle only', (state, label) => {
    expect(stateBadge(trip({ state }), 'viewer').label).toBe(label);
  });
});


describe('ladderCta', () => {
  it('offers Finalize Itinerary on a draft — every lifecycle step is one tap from the workspace (S4.19)', () => {
    expect(ladderCta(trip({ state: 'draft' }), true)).toEqual({
      act: 'finish-planning',
      label: 'Finalize Itinerary',
    });
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

  it('blocks every rung while another traveler holds the editing session, and names them (S4.19)', () => {
    const states: ItineraryState[] = ['draft', 'upcoming', 'ongoing', 'completed'];

    states.forEach((state) => {
      const held = trip({ state, editingSession: holder('t2') });
      expect(ladderCta(held, true, 't1')).toEqual({
        act: expect.any(String),
        label: expect.any(String),
        blockedBy: '@largata.dev+t2',
      });
    });
  });

  it('does not block the rung on the session holder-s own lease', () => {
    const mine = trip({ state: 'draft', editingSession: holder('t1') });

    expect(ladderCta(mine, true, 't1')).toEqual({
      act: 'finish-planning',
      label: 'Finalize Itinerary',
    });
  });
});


describe('showsStepBack', () => {
  it('walks down from every rung above draft — Ready included, since Edit no longer reopens (S4.24)', () => {
    expect(showsStepBack(trip({ state: 'upcoming' }), true)).toBe(true);
    expect(showsStepBack(trip({ state: 'ongoing' }), true)).toBe(true);
    expect(showsStepBack(trip({ state: 'completed' }), true)).toBe(true);
  });

  it('has nothing to step back to from draft', () => {
    expect(showsStepBack(trip({ state: 'draft' }), true)).toBe(false);
  });

  it('is owner-only and never on an archived trip', () => {
    expect(showsStepBack(trip({ state: 'ongoing' }), false)).toBe(false);
    expect(showsStepBack(trip({ state: 'upcoming' }), false)).toBe(false);
    expect(showsStepBack(trip({ state: 'ongoing', archived: true }), true)).toBe(false);
  });
});


describe('stepBackWording', () => {
  it('names the Ready rung for what it undoes — reopening planning, not editing (S4.24)', () => {
    const wording = stepBackWording(trip({ state: 'upcoming' }));

    expect(wording?.title).toBe('Reopen planning?');
    expect(wording?.body).toMatch(/Edit Itinerary/);
  });

  it('warns that stepping back from Active closes the diary, because it does', () => {
    expect(stepBackWording(trip({ state: 'ongoing' }))?.body).toMatch(/postcards/);
  });

  it('offers wording for every rung Step back renders on, and none for draft', () => {
    const states: ItineraryState[] = ['upcoming', 'ongoing', 'completed'];
    states.forEach((state) => {
      expect(showsStepBack(trip({ state }), true)).toBe(true);
      expect(stepBackWording(trip({ state }))).not.toBeNull();
    });
    expect(stepBackWording(trip({ state: 'draft' }))).toBeNull();
  });

  it('cannot render a Step back that has nothing to say — the button follows the wording', () => {
    const states: ItineraryState[] = ['draft', 'upcoming', 'ongoing', 'completed'];
    states.forEach((state) =>
      expect(showsStepBack(trip({ state }), true)).toBe(stepBackWording(trip({ state })) !== null),
    );
  });

  it('never says Ongoing in the copy a traveler reads', () => {
    const states: ItineraryState[] = ['upcoming', 'ongoing', 'completed'];
    states.forEach((state) =>
      expect(JSON.stringify(stepBackWording(trip({ state })))).not.toMatch(/Ongoing/),
    );
  });
});


describe('editItineraryAction', () => {
  it('enters the editor directly from draft', () => {
    expect(editItineraryAction(trip({ state: 'draft' }), true)).toEqual({ kind: 'edit' });
  });

  it('opens the editor in place from every unpublished state — editing costs no state (S4.24)', () => {
    const states: ItineraryState[] = ['draft', 'upcoming', 'ongoing', 'completed'];
    states.forEach((state) =>
      expect(editItineraryAction(trip({ state }), true)).toEqual({ kind: 'edit' }),
    );
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

  it('lets a MEMBER edit at every unpublished rung — mid-trip changes are usually theirs (S4.24)', () => {
    const states: ItineraryState[] = ['draft', 'upcoming', 'ongoing', 'completed'];
    states.forEach((state) =>
      expect(editItineraryAction(trip({ state }), true, 't2')).toEqual({ kind: 'edit' }),
    );
  });

  it('hides Edit Itinerary from anyone without edit permission, whatever the state', () => {
    const states: ItineraryState[] = ['draft', 'upcoming', 'ongoing', 'completed'];
    states.forEach((state) =>
      expect(editItineraryAction(trip({ state }), false)).toEqual({ kind: 'hidden' }),
    );
  });

  it('blocks every state while another traveler holds the session, and names them', () => {
    const states: ItineraryState[] = ['draft', 'upcoming', 'ongoing', 'completed'];
    states.forEach((state) =>
      expect(editItineraryAction(trip({ state, editingSession: holder('t2') }), true, 't1')).toEqual({
        kind: 'blocked',
        holder: '@largata.dev+t2',
      }),
    );
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
    expect(viewer.showsDayRename).toBe(false);
  });

  it('opens every editing affordance for the owner in the editor', () => {
    const editor = workspaceAffordances('editor', true);
    expect(editor.showsDragHandles).toBe(true);
    expect(editor.showsActivityEditing).toBe(true);
    expect(editor.showsAddDay).toBe(true);
    expect(editor.showsDayDelete).toBe(true);
    expect(editor.showsDayRename).toBe(true);
  });

  it('keeps activity editing member-wide but hides the owner-only acts', () => {
    const member = workspaceAffordances('editor', false);
    expect(member.showsActivityEditing).toBe(true);
    expect(member.showsDragHandles).toBe(true);
    expect(member.showsAddDay).toBe(false);
    expect(member.showsDayDelete).toBe(false);
  });

  it('lets a member rename a day while only the owner may delete it (S4.19 — renaming is plan editing)', () => {
    const member = workspaceAffordances('editor', false);
    expect(member.showsDayRename).toBe(true);
    expect(member.showsDayDelete).toBe(false);
  });
});
