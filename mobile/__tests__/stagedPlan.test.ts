import {
  activityIn,
  appendDay,
  createActivity,
  deleteActivity,
  deleteDay,
  editActivity,
  isDirty,
  isStaged,
  planFrom,
  renameDay,
  reorderActivities,
  saveRequestFor,
  stagedId,
  type StagedPlan,
} from '../src/itineraries/stagedPlan';
import type { ActivityResponse, DayResponse, ItineraryResponse } from '../src/types/api';


describe('the staged plan, the value a whole editing session accumulates into', () => {
  it('reproduces the server plan exactly, and starts clean', () => {
    const plan = planFrom(serverPlan());

    expect(plan.basePlanVersion).toBe(7);
    expect(plan.days.map((d) => d.title)).toEqual(['Arrival', null]);
    expect(plan.days[0]?.activities.map((a) => a.fields.title)).toEqual(['Kayaking', 'Dinner']);
    expect(isDirty(plan, plan)).toBe(false);
  });

  it('round-trips an untouched plan into a request that changes nothing', () => {
    const base = planFrom(serverPlan());
    const request = saveRequestFor(base);

    expect(request.basePlanVersion).toBe(7);
    expect(request.days.map((d) => d.id)).toEqual(['day-1', 'day-2']);
    expect(request.days[0]?.activities.map((a) => a.id)).toEqual(['act-1', 'act-2']);
    expect(request.days[0]?.activities[0]?.fields.title).toBe('Kayaking');
  });

  it('carries a missing planVersion as zero, so an older response cannot stage a save against undefined', () => {
    const { planVersion: _dropped, ...withoutVersion } = serverPlan();

    expect(planFrom(withoutVersion as ItineraryResponse).basePlanVersion).toBe(0);
  });
});


describe('the seven ops, each mutating the draft and nothing else', () => {
  it('appends a day with no title, id-less on the wire', () => {
    const base = planFrom(serverPlan());
    const staged = appendDay(base);

    expect(staged.days).toHaveLength(3);
    expect(saveRequestFor(staged).days[2]).toEqual({ id: null, title: null, activities: [] });
    expect(isDirty(staged, base)).toBe(true);
  });

  it.each([
    ['a name', 'Departure', 'Departure'],
    ['a padded name, stripped', '  Departure  ', 'Departure'],
    ['empty, which clears the optional name', '', null],
    ['whitespace only, which also clears it', '   ', null],
    ['null, the pencil cancelled', null, null],
  ])('renames a day to %s', (_case, typed, stored) => {
    const staged = renameDay(planFrom(serverPlan()), 'day-1', typed);

    expect(staged.days[0]?.title).toBe(stored);
    expect(saveRequestFor(staged).days[0]?.title).toBe(stored);
  });

  it('deletes a day and the activities it carried, in one op', () => {
    const base = planFrom(serverPlan());
    const staged = deleteDay(base, 'day-1');

    expect(staged.days.map((d) => d.serverId)).toEqual(['day-2']);
    expect(saveRequestFor(staged).days).toHaveLength(1);
    expect(isDirty(staged, base)).toBe(true);
  });

  it('creates an activity that serializes id-less, so the server never sees a staged id', () => {
    const staged = createActivity(planFrom(serverPlan()), 'day-2', { title: 'Sunset drinks' });
    const request = saveRequestFor(staged);

    expect(request.days[1]?.activities).toEqual([{ id: null, fields: { title: 'Sunset drinks' } }]);
    expect(staged.days[1]?.activities[0]?.id).toMatch(/^staged:/);
  });

  it('edits an existing activity in place, keeping its server id', () => {
    const staged = editActivity(planFrom(serverPlan()), 'act-1', { title: 'Kayaking, longer' });
    const request = saveRequestFor(staged);

    expect(request.days[0]?.activities[0]).toEqual({
      id: 'act-1',
      fields: { title: 'Kayaking, longer' },
    });
  });

  it('deletes an activity by dropping it from its day', () => {
    const staged = deleteActivity(planFrom(serverPlan()), 'act-1');

    expect(saveRequestFor(staged).days[0]?.activities.map((a) => a.id)).toEqual(['act-2']);
  });

  it('reorders within a day, because array order is the order', () => {
    const staged = reorderActivities(planFrom(serverPlan()), 'day-1', ['act-2', 'act-1']);

    expect(saveRequestFor(staged).days[0]?.activities.map((a) => a.id)).toEqual(['act-2', 'act-1']);
  });

  it.each([
    ['an id the day does not hold', ['act-1', 'act-9']],
    ['too few ids', ['act-1']],
    ['too many ids', ['act-1', 'act-2', 'act-1']],
  ])('refuses a reorder naming %s, leaving the day as it was', (_case, ids) => {
    const base = planFrom(serverPlan());
    const staged = reorderActivities(base, 'day-1', ids);

    expect(staged.days[0]?.activities.map((a) => a.id)).toEqual(['act-1', 'act-2']);
    expect(isDirty(staged, base)).toBe(false);
  });
});


describe('cycles that begin and end inside the buffer', () => {
  it('create-then-edit edits the staged entry rather than adding a second one', () => {
    const created = createActivity(planFrom(serverPlan()), 'day-2', { title: 'Typed in a hurry' });
    const stagedActivityId = created.days[1]?.activities[0]?.id as string;
    const corrected = editActivity(created, stagedActivityId, { title: 'Typed properly' });
    const request = saveRequestFor(corrected);

    expect(request.days[1]?.activities).toEqual([{ id: null, fields: { title: 'Typed properly' } }]);
    expect(activityIn(corrected, stagedActivityId)?.fields.title).toBe('Typed properly');
  });

  it('create-then-delete leaves no trace at all — the server is never told it happened', () => {
    const base = planFrom(serverPlan());
    const created = createActivity(base, 'day-2', { title: 'A mistake' });
    const undone = deleteActivity(created, created.days[1]?.activities[0]?.id as string);

    expect(saveRequestFor(undone)).toEqual(saveRequestFor(base));
    expect(isDirty(undone, base)).toBe(false);
  });

  it('a day appended and then deleted returns the buffer to clean', () => {
    const base = planFrom(serverPlan());
    const appended = appendDay(base);
    const undone = deleteDay(appended, appended.days[2]?.id as string);

    expect(isDirty(undone, base)).toBe(false);
  });
});


describe('dirty, the derivation Save Changes and the discard confirm both read', () => {
  it.each([
    ['a rename', (plan: StagedPlan) => renameDay(plan, 'day-1', 'Arrival day')],
    ['an appended day', (plan: StagedPlan) => appendDay(plan)],
    ['a deleted day', (plan: StagedPlan) => deleteDay(plan, 'day-2')],
    ['a created activity', (plan: StagedPlan) => createActivity(plan, 'day-1', { title: 'New' })],
    ['an edited activity', (plan: StagedPlan) => editActivity(plan, 'act-1', { title: 'Changed' })],
    ['a deleted activity', (plan: StagedPlan) => deleteActivity(plan, 'act-1')],
    ['a reorder', (plan: StagedPlan) => reorderActivities(plan, 'day-1', ['act-2', 'act-1'])],
  ])('flips true on %s', (_case, op) => {
    const base = planFrom(serverPlan());

    expect(isDirty(op(base), base)).toBe(true);
  });

  it('stays false when an op restores the base shape', () => {
    const base = planFrom(serverPlan());
    const there = renameDay(base, 'day-1', 'Something else');
    const back = renameDay(there, 'day-1', 'Arrival');

    expect(isDirty(there, base)).toBe(true);
    expect(isDirty(back, base)).toBe(false);
  });

  it('stays false for a reorder that puts the day back the way it was', () => {
    const base = planFrom(serverPlan());
    const swapped = reorderActivities(base, 'day-1', ['act-2', 'act-1']);
    const restored = reorderActivities(swapped, 'day-1', ['act-1', 'act-2']);

    expect(isDirty(restored, base)).toBe(false);
  });
});


describe('staged ids, which exist only inside the buffer', () => {
  it('mints a fresh one every time, so two staged activities never collide', () => {
    expect(stagedId()).not.toBe(stagedId());
  });

  it('tells a staged id from a server one', () => {
    expect(isStaged(stagedId())).toBe(true);
    expect(isStaged('019fec6d-38f7-7fed-9f7e-4ca5b00a5481')).toBe(false);
  });

  it('never lets one reach the wire, however deep in the buffer it was minted', () => {
    const withCreations = createActivity(
      appendDay(createActivity(planFrom(serverPlan()), 'day-1', { title: 'One' })),
      'day-1',
      { title: 'Two' },
    );
    const request = saveRequestFor(withCreations);
    const everyId = [
      ...request.days.map((d) => d.id),
      ...request.days.flatMap((d) => d.activities.map((a) => a.id)),
    ];

    expect(everyId.filter((id) => id !== null).every((id) => !isStaged(id as string))).toBe(true);
  });
});


function serverPlan(): ItineraryResponse {
  return {
    id: 'trip-1',
    title: 'Palawan',
    destination: 'Palawan',
    currency: 'PHP',
    description: null,
    standouts: [],
    bestTimeOfYear: null,
    coverImageUrl: null,
    startDate: null,
    endDate: null,
    state: 'upcoming',
    published: false,
    visibility: 'public',
    archived: false,
    lastEditedBy: null,
    lastEditedAt: null,
    days: [day('day-1', 1, 'Arrival', [activity('act-1', 'Kayaking'), activity('act-2', 'Dinner')]),
      day('day-2', 2, null, [])],
    createdAt: '2026-08-10T00:00:00Z',
    planVersion: 7,
  };
}

function day(id: string, ordinal: number, title: string | null, activities: ActivityResponse[]): DayResponse {
  return { id, ordinal, title, activities };
}

function activity(id: string, title: string): ActivityResponse {
  return {
    id,
    sortOrder: 0,
    title,
    timeOfDay: null,
    costAmount: null,
    costCurrency: null,
    place: null,
    description: null,
    notes: null,
    externalUrl: null,
    bookingPurpose: null,
    bookingProvider: null,
    bookingPriceAmount: null,
    bookingPriceCurrency: null,
    lastEditedBy: 'traveler-1',
    lastEditedAt: '2026-08-10T00:00:00Z',
    photos: [],
  };
}
