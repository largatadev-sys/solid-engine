import type { Page } from '@playwright/test';
import { test, expect } from '../support/fixtures';
import { api, tokenFor } from '../support/pool';
import { requireStack } from '../support/gate';
import { IDENTITY_MAP, ownerTagFor, type PoolTag } from '../support/identities';
import { SeedFailure, seedTrip, stamp, type SeededTrip } from '../support/seed';
import {
  acceptOwnershipWording,
  offerOwnershipWording,
} from '../../src/components/confirmDestructiveMessage';

const HOLDER = ownerTagFor('web/ownership-transfer');
const OFFEREE: PoolTag = IDENTITY_MAP['web/ownership-transfer'].tags[1]!;

requireStack(HOLDER);

const MAKE_OWNER = 'Make owner';
const ACCEPT_OWNERSHIP = 'Accept ownership';

let holderToken: string;
let offereeToken: string;
let holderId: string;
let offereeId: string;

interface RosterEntry {
  travelerId: string;
  role: string;
  ownershipOffered?: boolean;
}

async function roster(tripId: string, token: string): Promise<RosterEntry[]> {
  const read = await api(`/v1/itineraries/${tripId}/members`, 'GET', token);
  return read.body.items ?? [];
}

async function ownerOf(tripId: string, token: string): Promise<string | undefined> {
  return (await roster(tripId, token)).find((member) => member.role === 'owner')?.travelerId;
}

async function offeredTo(tripId: string, token: string): Promise<string | undefined> {
  return (await roster(tripId, token)).find((member) => member.ownershipOffered === true)
    ?.travelerId;
}

async function tripHeldByHolder(what: string): Promise<SeededTrip> {
  return seedTrip({
    ownerTag: HOLDER,
    title: stamp(`transfer ${what}`),
    members: [OFFEREE],
    durationDays: 2,
  });
}

async function offerOwnership(trip: SeededTrip): Promise<void> {
  const offered = await api(
    `/v1/itineraries/${trip.id}/ownership-offer`,
    'POST',
    holderToken,
    { travelerId: offereeId },
  );
  if (offered.status !== 201) throw new SeedFailure('the ownership offer', offered.body);
}

const clickText = async (page: Page, text: string) => {
  await page.getByText(text, { exact: true }).last().click();
};

test.beforeAll(async () => {
  holderToken = await tokenFor(HOLDER);
  offereeToken = await tokenFor(OFFEREE);
  holderId = (await api('/v1/me', 'GET', holderToken)).body.id;
  offereeId = (await api('/v1/me', 'GET', offereeToken)).body.id;
});

test.describe('the offer, made from the roster the holder owns', () => {
  test.describe.configure({ mode: 'serial' });

  let trip: SeededTrip;

  test.beforeAll(async () => {
    trip = await tripHeldByHolder('offer');
  });

  test('the members screen renders, and the owner is offered Make owner', async ({
    page,
    signIn,
  }) => {
    await signIn(HOLDER);
    await page.goto(`/members/${trip.id}`);

    await expect(page.getByText('Members').first()).toBeVisible();
    await expect(page.getByText(MAKE_OWNER, { exact: true }).last()).toBeVisible();
  });

  test('it asks first, naming the consequence from the shared wording module', async ({
    page,
    signIn,
    signal,
  }) => {
    await signIn(HOLDER);
    await page.goto(`/members/${trip.id}`);
    await expect(page.getByText(MAKE_OWNER, { exact: true }).last()).toBeVisible();

    await clickText(page, MAKE_OWNER);

    await expect
      .poll(() => signal.dialogs.join(' '), { timeout: 15_000 })
      .toContain(offerOwnershipWording('x').body);

    await expect.poll(async () => offeredTo(trip.id, holderToken), { timeout: 30_000 }).toBe(
      offereeId,
    );
  });

  test('confirming records the offer against the offeree on the server', async () => {
    expect(await offeredTo(trip.id, holderToken)).toBe(offereeId);
  });

  test('…and the offer alone moves nothing — the holder is still the owner', async () => {
    expect(await ownerOf(trip.id, holderToken)).toBe(holderId);
  });
});

test.describe('the offer, as the receiving traveler meets it', () => {
  test.describe.configure({ mode: 'serial' });

  let trip: SeededTrip;

  test.beforeAll(async () => {
    trip = await tripHeldByHolder('receiving');
    await offerOwnership(trip);
  });

  test('the trip screen carries the banner that justifies the whole reversal', async ({
    page,
    signIn,
  }) => {
    await signIn(OFFEREE);
    await page.goto(`/itineraries/${trip.id}`);

    await expect(page.getByText(/offered ownership/i).first()).toBeVisible();
  });

  test('the members screen offers the offeree the way to accept', async ({ page, signIn }) => {
    await signIn(OFFEREE);
    await page.goto(`/members/${trip.id}`);

    await expect(page.getByText(/offered ownership/i).first()).toBeVisible();
    await expect(page.getByText(ACCEPT_OWNERSHIP, { exact: true }).last()).toBeVisible();
  });

  test('accept asks before acting, naming what the traveler takes on', async ({
    page,
    signIn,
    signal,
  }) => {
    await signIn(OFFEREE);
    await page.goto(`/members/${trip.id}`);
    await expect(page.getByText(ACCEPT_OWNERSHIP, { exact: true }).last()).toBeVisible();

    await clickText(page, ACCEPT_OWNERSHIP);

    await expect
      .poll(() => signal.dialogs.join(' '), { timeout: 15_000 })
      .toContain(acceptOwnershipWording(trip.title).body);

    await expect.poll(async () => ownerOf(trip.id, offereeToken), { timeout: 30_000 }).toBe(
      offereeId,
    );
  });

  test('confirming swaps the roles — driven entirely through the browser', async () => {
    expect(await ownerOf(trip.id, offereeToken)).toBe(offereeId);
  });

  test('…and the former owner stays on the trip, now as a member', async () => {
    const held = (await roster(trip.id, offereeToken)).find(
      (member) => member.travelerId === holderId,
    );
    expect(held).toBeDefined();
    expect(held!.role).toBe('member');
  });

  test('…and the offer flag is spent, not left standing', async () => {
    expect(await offeredTo(trip.id, offereeToken)).toBeUndefined();
  });
});

test.describe('the transfer flips back, so repeated runs leave the pool where they found it', () => {
  test.describe.configure({ mode: 'serial' });

  let trip: SeededTrip;

  test.beforeAll(async () => {
    trip = await tripHeldByHolder('convergence');
    await offerOwnership(trip);
    const accepted = await api(
      `/v1/itineraries/${trip.id}/ownership-offer/accept`,
      'POST',
      offereeToken,
      {},
    );
    if (accepted.status !== 204) throw new SeedFailure('the acceptance', accepted.body);
  });

  test('the offeree holds the trip after accepting', async () => {
    expect(await ownerOf(trip.id, offereeToken)).toBe(offereeId);
  });

  test('the new owner can offer it straight back, from their own roster', async ({
    page,
    signIn,
    signal,
  }) => {
    await signIn(OFFEREE);
    await page.goto(`/members/${trip.id}`);
    await expect(page.getByText(MAKE_OWNER, { exact: true }).last()).toBeVisible();

    await clickText(page, MAKE_OWNER);

    await expect.poll(() => signal.dialogs.length, { timeout: 15_000 }).toBeGreaterThan(0);
    await expect.poll(async () => offeredTo(trip.id, offereeToken), { timeout: 15_000 }).toBe(
      holderId,
    );
  });

  test('the original holder accepts it back, and the roles are as they began', async ({
    page,
    signIn,
    signal,
  }) => {
    await signIn(HOLDER);
    await page.goto(`/members/${trip.id}`);
    await expect(page.getByText(/offered ownership/i).first()).toBeVisible();
    await expect(page.getByText(ACCEPT_OWNERSHIP, { exact: true }).last()).toBeVisible();

    await clickText(page, ACCEPT_OWNERSHIP);

    await expect
      .poll(() => signal.dialogs.join(' '), { timeout: 15_000 })
      .toContain(acceptOwnershipWording(trip.title).body);
    await expect.poll(async () => ownerOf(trip.id, holderToken), { timeout: 15_000 }).toBe(holderId);
  });

  test('…and nothing is left offered, so the next run starts from the same state', async () => {
    expect(await offeredTo(trip.id, holderToken)).toBeUndefined();
    const back = (await roster(trip.id, holderToken)).find(
      (member) => member.travelerId === offereeId,
    );
    expect(back!.role).toBe('member');
  });

  test('no page or console errors across the transfer', async ({ page, signIn, signal }) => {
    await signIn(HOLDER);
    await page.goto(`/members/${trip.id}`);
    await expect(page.getByText('Members').first()).toBeVisible();

    expect(signal.pageErrors).toEqual([]);
    expect(signal.consoleErrors).toEqual([]);
  });
});
