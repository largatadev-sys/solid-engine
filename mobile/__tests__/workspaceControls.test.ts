import {
  editItineraryAction,
  forwardConfirmWording,
  ladderCta,
  stateBadge,
  workspaceAffordances,
} from '../src/itineraries/workspaceControls';
import type { ItineraryResponse, ItineraryState, LeaseHolderResponse } from '../src/types/api';


const EVERY_STATE: ItineraryState[] = ['upcoming', 'ongoing', 'completed'];

const DEAD_LABELS = ['Draft', 'Ready', 'Active'];


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
    destination: 'El Nido, Palawan',
    days: [],
    state: 'upcoming',
    published: false,
    visibility: 'private',
    archived: false,
    createdAt: '2026-08-08T00:00:00Z',
    ...over,
  } as ItineraryResponse;
}


describe('stateBadge', () => {
  const cases: Array<[ItineraryState, string]> = [
    ['upcoming', 'Upcoming'],
    ['ongoing', 'Ongoing'],
    ['completed', 'Completed'],
  ];

  it.each(cases)('renders %s under its own name — S4.26', (state, label) => {
    expect(stateBadge(trip({ state })).label).toBe(label);
  });

  it('paints every state in the one terracotta pill the canvas draws (C5)', () => {
    EVERY_STATE.forEach((state) => {
      expect(stateBadge(trip({ state }))).toMatchObject({
        background: '#FBF0EB',
        foreground: '#B14E2E',
        border: '#EFC9BA',
      });
    });
  });

  it('says Trip Workspace on the editor in every state — the chip is where you are, not where the trip is (S4.24)', () => {
    EVERY_STATE.forEach((state) =>
      expect(stateBadge(trip({ state }), 'editor').label).toBe('Trip Workspace'),
    );
  });

  it('renders no dead label in any state, on either surface', () => {
    EVERY_STATE.forEach((state) => {
      DEAD_LABELS.forEach((dead) => {
        expect(stateBadge(trip({ state })).label).not.toBe(dead);
        expect(stateBadge(trip({ state }), 'editor').label).not.toBe(dead);
      });
    });
  });
});


describe('ladderCta', () => {
  it('offers Start Trip on an upcoming trip — the ladder now starts here', () => {
    expect(ladderCta(trip({ state: 'upcoming' }), true)).toEqual({ act: 'start', label: 'Start Trip' });
  });

  it('offers Complete Trip while ongoing', () => {
    expect(ladderCta(trip({ state: 'ongoing' }), true)).toEqual({ act: 'complete', label: 'Complete Trip' });
  });

  it('offers Publish Itinerary once completed', () => {
    expect(ladderCta(trip({ state: 'completed' }), true)).toEqual({
      act: 'publish',
      label: 'Publish Itinerary',
    });
  });

  it('offers no rung that would finish planning — the act retired with its state', () => {
    EVERY_STATE.forEach((state) =>
      expect(ladderCta(trip({ state }), true)?.act).not.toBe('finish-planning'),
    );
  });

  it('hides every ladder CTA from a member', () => {
    EVERY_STATE.forEach((state) => expect(ladderCta(trip({ state }), false)).toBeNull());
  });

  it('hides the ladder on an archived trip', () => {
    expect(ladderCta(trip({ state: 'upcoming', archived: true }), true)).toBeNull();
  });

  it('blocks every rung while another traveler holds the editing session, and names them (S4.19)', () => {
    EVERY_STATE.forEach((state) => {
      const held = trip({ state, editingSession: holder('t2') });
      expect(ladderCta(held, true, 't1')).toEqual({
        act: expect.any(String),
        label: expect.any(String),
        blockedBy: '@largata.dev+t2',
      });
    });
  });

  it('does not block the rung on the session holders own lease', () => {
    const mine = trip({ state: 'upcoming', editingSession: holder('t1') });

    expect(ladderCta(mine, true, 't1')).toEqual({ act: 'start', label: 'Start Trip' });
  });
});


describe('forwardConfirmWording', () => {
  it('confirms Start Trip in the exact words the canvas draws (C5)', () => {
    expect(forwardConfirmWording('start')).toEqual({
      title: 'Start this trip?',
      body: 'Postcards open for every member once the trip starts.',
      confirmLabel: 'Start Trip',
      cancelLabel: 'Not yet',
    });
  });

  it('confirms Complete Trip in the exact words the canvas draws (C5)', () => {
    expect(forwardConfirmWording('complete')).toEqual({
      title: 'Complete this trip?',
      body: 'Marks the trip as travelled — a completed trip can be published.',
      confirmLabel: 'Complete Trip',
      cancelLabel: 'Still travelling',
    });
  });

  it('gives publish no drawer — it keeps its own preview flow', () => {
    expect(forwardConfirmWording('publish')).toBeNull();
  });

  it('states what staying means rather than saying Cancel — the drawer is not destructive', () => {
    expect(forwardConfirmWording('start')?.cancelLabel).not.toBe('Cancel');
    expect(forwardConfirmWording('complete')?.cancelLabel).not.toBe('Cancel');
  });

  it('names no dead label in any wording a traveler reads', () => {
    const copy = JSON.stringify([forwardConfirmWording('start'), forwardConfirmWording('complete')]);
    DEAD_LABELS.forEach((dead) => expect(copy).not.toMatch(new RegExp(`\\b${dead}\\b`)));
  });

  it('confirms every forward transition the ladder can run — no rung acts unconfirmed', () => {
    const transitions = EVERY_STATE.map((state) => ladderCta(trip({ state }), true)).filter(
      (rung) => rung !== null && rung.act !== 'publish',
    );

    expect(transitions).toHaveLength(2);
    transitions.forEach((rung) => expect(forwardConfirmWording(rung!.act)).not.toBeNull());
  });

  it('labels the drawers primary exactly as the rung that opened it', () => {
    EVERY_STATE.forEach((state) => {
      const rung = ladderCta(trip({ state }), true);
      const wording = rung === null ? null : forwardConfirmWording(rung.act);
      if (wording !== null) {
        expect(wording.confirmLabel).toBe(rung!.label);
      }
    });
  });
});


describe('editItineraryAction', () => {
  it('opens the editor in place from every unpublished state — editing costs no state (S4.24)', () => {
    EVERY_STATE.forEach((state) =>
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

  it('is not blocked by the viewers own session', () => {
    const mine = trip({ editingSession: holder('t1') });
    expect(editItineraryAction(mine, true, 't1')).toEqual({ kind: 'edit' });
  });

  it('lets a MEMBER edit at every unpublished rung — mid-trip changes are usually theirs (S4.24)', () => {
    EVERY_STATE.forEach((state) =>
      expect(editItineraryAction(trip({ state }), true, 't2')).toEqual({ kind: 'edit' }),
    );
  });

  it('hides Edit Itinerary from anyone without edit permission, whatever the state', () => {
    EVERY_STATE.forEach((state) =>
      expect(editItineraryAction(trip({ state }), false)).toEqual({ kind: 'hidden' }),
    );
  });

  it('blocks every state while another traveler holds the session, and names them', () => {
    EVERY_STATE.forEach((state) =>
      expect(editItineraryAction(trip({ state, editingSession: holder('t2') }), true, 't1')).toEqual({
        kind: 'blocked',
        holder: '@largata.dev+t2',
      }),
    );
  });

  it('is hidden on archived and published trips', () => {
    expect(editItineraryAction(trip({ archived: true }), true)).toEqual({ kind: 'hidden' });
    expect(editItineraryAction(trip({ published: true, state: 'completed' }), true)).toEqual({
      kind: 'hidden',
    });
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
