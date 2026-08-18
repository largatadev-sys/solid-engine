import { test, expect } from '../support/fixtures';
import { api, address, tokenFor, profileFor } from '../support/pool';
import { requireStack } from '../support/gate';
import { ownerTagFor, IDENTITY_MAP } from '../support/identities';
import { SeedFailure, stamp } from '../support/seed';

const HOLDER = ownerTagFor('api/buffered-plan');
const INTERVENER = IDENTITY_MAP['api/buffered-plan'].tags[1]!;

requireStack(HOLDER);

test.describe.configure({ mode: 'serial' });

const session = () => ({ subjectType: 'session' });

interface StagedActivity {
  id: string | null;
  fields: { title: string };
}

interface StagedDay {
  id: string | null;
  title: string;
  activities: StagedActivity[];
}

interface PlanShape {
  planVersion: number;
  days: Array<{ id: string; title: string; activities: Array<{ id: string; title: string }> }>;
}

const stagedFrom = (
  plan: PlanShape,
  mutate: (days: StagedDay[]) => void,
): { basePlanVersion: number; days: StagedDay[] } => {
  const days: StagedDay[] = plan.days.map((day) => ({
    id: day.id,
    title: day.title,
    activities: day.activities.map((activity) => ({
      id: activity.id,
      fields: { title: activity.title },
    })),
  }));
  mutate(days);
  return { basePlanVersion: plan.planVersion, days };
};

let holder: string;
let intervener: string;
let trip: string;

let freshVersion: number;
let staleBase: number;
let afterMixed: PlanShape;
let afterRebase: PlanShape;
let afterEmptied: PlanShape;

const planSeenBy = async (token: string): Promise<PlanShape> =>
  (await api(`/v1/itineraries/${trip}`, 'GET', token)).body;

test.beforeAll(async () => {
  holder = await tokenFor(HOLDER);
  intervener = await tokenFor(INTERVENER);

  const created = await api('/v1/itineraries', 'POST', holder, {
    title: stamp('buffered editing'),
    destination: 'Palawan',
    durationDays: 2,
  });
  if (created.status !== 201) throw new SeedFailure('the buffered-plan trip', created.body);
  trip = created.body.id;

  const invited = await api(`/v1/itineraries/${trip}/invitations/by-handle`, 'POST', holder, {
    handle: (await profileFor(INTERVENER)).handle,
  });
  if (invited.status !== 201) throw new SeedFailure(`an invitation for ${INTERVENER}`, invited.body);
  await api(`/v1/invitations/${invited.body.id}/accept`, 'POST', intervener);
});

test('a fresh trip reports a plan version', async () => {
  const fresh = await planSeenBy(holder);
  expect(typeof fresh.planVersion).toBe('number');
  freshVersion = fresh.planVersion;
});

test('a per-action write still answers and bumps the version — old clients coexist', async () => {
  const perAction = await api(`/v1/itineraries/${trip}/days`, 'POST', holder, {});
  expect(perAction.status).toBe(201);

  const afterPerAction = await planSeenBy(holder);
  expect(afterPerAction.planVersion).toBe(freshVersion + 1);
});

test('the bulk save is holder-only — no session held is refused EDIT_LOCKED', async () => {
  const current = await planSeenBy(holder);
  const noSession = await api(
    `/v1/itineraries/${trip}/plan`,
    'PUT',
    holder,
    stagedFrom(current, (days) => days.push({ id: null, title: 'No session', activities: [] })),
  );
  expect(noSession.status).toBe(409);
  expect(noSession.body.code).toBe('EDIT_LOCKED');
});

test('the holder opens the Editing Session', async () => {
  const held = await api(`/v1/itineraries/${trip}/edit-lock`, 'POST', holder, session());
  expect(held.status).toBe(200);
  staleBase = (await planSeenBy(holder)).planVersion;
});

test('a member who does not hold the session cannot save into it, and the refusal names the holder', async () => {
  const beforeStaging = await planSeenBy(holder);
  const intruder = await api(
    `/v1/itineraries/${trip}/plan`,
    'PUT',
    intervener,
    stagedFrom(beforeStaging, (days) => days.push({ id: null, title: 'From t2', activities: [] })),
  );
  expect(intruder.status).toBe(409);
  expect(intruder.body.code).toBe('EDIT_LOCKED');
  expect(String(intruder.body?.message ?? '')).toContain('@');
});

test('one bulk save lands a mixed session of edits', async () => {
  const beforeStaging = await planSeenBy(holder);
  const mixed = await api(
    `/v1/itineraries/${trip}/plan`,
    'PUT',
    holder,
    stagedFrom(beforeStaging, (days) => {
      days[0]!.title = 'Renamed in the buffer';
      days[0]!.activities.push({ id: null, fields: { title: 'Staged activity A' } });
      days[0]!.activities.push({ id: null, fields: { title: 'Staged activity B' } });
      days.push({ id: null, title: 'Appended in the buffer', activities: [] });
    }),
  );
  expect(mixed.status).toBe(200);
  afterMixed = await planSeenBy(holder);
});

test('a fresh read shows exactly the staged plan', async () => {
  const titles = afterMixed.days.flatMap((day) => day.activities.map((activity) => activity.title));
  expect(afterMixed.days[0]!.title).toBe('Renamed in the buffer');
  expect(titles).toContain('Staged activity A');
  expect(titles).toContain('Staged activity B');
  expect(afterMixed.days.some((day) => day.title === 'Appended in the buffer')).toBe(true);
});

test('the staged plan lands for exactly one version bump, however many ops the buffer held', async () => {
  expect(afterMixed.planVersion).toBe(staleBase + 1);
});

test('a stale base is refused by name rather than overwriting, and carries the version to re-base on', async () => {
  const stale = await api(
    `/v1/itineraries/${trip}/plan`,
    'PUT',
    holder,
    stagedFrom({ ...afterMixed, planVersion: staleBase }, (days) =>
      days.push({ id: null, title: 'Saved from a stale buffer', activities: [] }),
    ),
  );
  expect(stale.status).toBe(409);
  expect(stale.body.code).toBe('STALE_PLAN');
  expect(stale.body?.details?.currentPlanVersion).toBe(afterMixed.planVersion);
});

test('re-submitting against that version is the whole Save-anyway path', async () => {
  const rebased = await api(
    `/v1/itineraries/${trip}/plan`,
    'PUT',
    holder,
    stagedFrom(afterMixed, (days) => days.push({ id: null, title: 'Saved anyway', activities: [] })),
  );
  expect(rebased.status).toBe(200);

  afterRebase = await planSeenBy(holder);
  expect(afterRebase.days.some((day) => day.title === 'Saved anyway')).toBe(true);
});

test('an activity absent from the submitted plan is deleted, days and all', async () => {
  const emptied = await api(`/v1/itineraries/${trip}/plan`, 'PUT', holder, {
    basePlanVersion: afterRebase.planVersion,
    days: afterRebase.days.map((day) => ({ id: day.id, title: day.title, activities: [] })),
  });
  expect(emptied.status).toBe(200);

  afterEmptied = await planSeenBy(holder);
  expect(afterEmptied.days.every((day) => day.activities.length === 0)).toBe(true);
});

test('a save is still one write even when the plan did not change', async () => {
  const noOp = await api(
    `/v1/itineraries/${trip}/plan`,
    'PUT',
    holder,
    stagedFrom(afterEmptied, () => {}),
  );
  expect(noOp.status).toBe(200);

  const afterNoOp = await planSeenBy(holder);
  expect(afterNoOp.planVersion).toBe(afterEmptied.planVersion + 1);
});

test('Save Changes ends by releasing the session', async () => {
  await api(`/v1/itineraries/${trip}/edit-lock`, 'DELETE', holder, session());
  const released = await api(`/v1/itineraries/${trip}`, 'GET', holder);
  expect(released.body.editingSession ?? null).toBeNull();
});
