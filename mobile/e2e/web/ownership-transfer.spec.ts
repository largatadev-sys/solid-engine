import type { Page } from '@playwright/test';
import { test, expect } from '../support/fixtures';
import { api, tokenFor } from '../support/pool';
import { requireStack } from '../support/gate';
import { IDENTITY_MAP, ownerTagFor, type PoolTag } from '../support/identities';
import { SeedFailure, seedTrip, stamp, type SeededTrip } from '../support/seed';
import { labelled, labelStarting } from '../support/screen';
import { offerOwnershipWording } from '../../src/components/confirmDestructiveMessage';
import {
  REMOVE_FROM_TRIP_LABEL,
  TRANSFER_OWNERSHIP_LABEL,
} from '../../src/members/rowMenu';
import { OFFER_ACCEPT_LABEL } from '../../src/members/OwnershipOfferCard';
import { OFFERED_SUB, OWNER_SUB } from '../../src/members/travelerSections';

const HOLDER = ownerTagFor('web/ownership-transfer');
const OFFEREE: PoolTag = IDENTITY_MAP['web/ownership-transfer'].tags[1]!;

requireStack(HOLDER);

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

async function offerOwnership(trip: SeededTrip, from = holderToken, to = offereeId): Promise<void> {
  const offered = await api(`/v1/itineraries/${trip.id}/ownership-offer`, 'POST', from, {
    travelerId: to,
  });
  if (offered.status !== 201) throw new SeedFailure('the ownership offer', offered.body);
}

const travelersTab = (tripId: string) => `/itineraries/${tripId}?tab=travelers`;

const clickText = async (page: Page, text: string) => {
  await page.getByText(text, { exact: true }).last().click();
};

async function openRowMenuFor(page: Page, handleLabel: string): Promise<void> {
  await labelStarting(page, `More options for ${handleLabel}`).click();
}

async function handleOf(token: string): Promise<string> {
  const me = await api('/v1/me', 'GET', token);
  return `@${me.body.handle}`;
}

test.beforeAll(async () => {
  holderToken = await tokenFor(HOLDER);
  offereeToken = await tokenFor(OFFEREE);
  holderId = (await api('/v1/me', 'GET', holderToken)).body.id;
  offereeId = (await api('/v1/me', 'GET', offereeToken)).body.id;
});

test.describe('the offer, made from the row menu the owner sees', () => {
  test.describe.configure({ mode: 'serial' });

  let trip: SeededTrip;
  let offereeHandle: string;

  test.beforeAll(async () => {
    trip = await tripHeldByHolder('offer');
    offereeHandle = await handleOf(offereeToken);
  });

  test('the tab renders the roster, owner first', async ({ page, signIn }) => {
    await signIn(HOLDER);
    await page.goto(travelersTab(trip.id));

    await expect(page.getByText(/^Travelers · \d+$/).first()).toBeVisible();
    await expect(page.getByText(OWNER_SUB).first()).toBeVisible();
  });

  test('the overflow control opens a menu offering transfer above remove', async ({
    page,
    signIn,
  }) => {
    await signIn(HOLDER);
    await page.goto(travelersTab(trip.id));
    await expect(page.getByText(OWNER_SUB).first()).toBeVisible();

    await openRowMenuFor(page, offereeHandle);

    await expect(page.getByText(TRANSFER_OWNERSHIP_LABEL, { exact: true })).toBeVisible();
    await expect(page.getByText(REMOVE_FROM_TRIP_LABEL, { exact: true })).toBeVisible();
  });

  test('it asks first, naming the consequence from the shared wording module', async ({
    page,
    signIn,
    signal,
  }) => {
    await signIn(HOLDER);
    await page.goto(travelersTab(trip.id));
    await expect(page.getByText(OWNER_SUB).first()).toBeVisible();

    await openRowMenuFor(page, offereeHandle);
    await clickText(page, TRANSFER_OWNERSHIP_LABEL);

    await expect
      .poll(() => signal.dialogs.join(' '), { timeout: 15_000 })
      .toContain(offerOwnershipWording('x').body);

    await expect.poll(async () => offeredTo(trip.id, holderToken), { timeout: 30_000 }).toBe(
      offereeId,
    );
  });

  test('the offered row wears its waiting sub, and the holder is still the owner', async ({
    page,
    signIn,
  }) => {
    await signIn(HOLDER);
    await page.goto(travelersTab(trip.id));

    await expect(page.getByText(OFFERED_SUB).first()).toBeVisible();
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

  test('the tab carries the card that justifies the whole reversal', async ({ page, signIn }) => {
    await signIn(OFFEREE);
    await page.goto(travelersTab(trip.id));

    await expect(page.getByText(/offered you ownership/i).first()).toBeVisible();
    await expect(labelled(page, `${OFFER_ACCEPT_LABEL} ownership`)).toBeVisible();
  });

  test('the trip screen carries no banner — the tab is the only door now', async ({
    page,
    signIn,
  }) => {
    await signIn(OFFEREE);
    await page.goto(`/itineraries/${trip.id}`);
    await expect(page.getByText(trip.title).first()).toBeVisible();

    await expect(page.getByText(/offered you ownership/i)).toHaveCount(0);
  });

  test('accept asks before acting, and the roles swap on confirm', async ({
    page,
    signIn,
    signal,
  }) => {
    await signIn(OFFEREE);
    await page.goto(travelersTab(trip.id));
    await expect(labelled(page, `${OFFER_ACCEPT_LABEL} ownership`)).toBeVisible();

    await labelled(page, `${OFFER_ACCEPT_LABEL} ownership`).click();

    await expect.poll(() => signal.dialogs.length, { timeout: 15_000 }).toBeGreaterThan(0);
    await expect.poll(async () => ownerOf(trip.id, offereeToken), { timeout: 30_000 }).toBe(
      offereeId,
    );
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

  test('the card is gone once it has been answered', async ({ page, signIn }) => {
    await signIn(OFFEREE);
    await page.goto(travelersTab(trip.id));
    await expect(page.getByText(/^Travelers · \d+$/).first()).toBeVisible();

    await expect(page.getByText(/offered you ownership/i)).toHaveCount(0);
  });
});

test.describe('the offer, revoked before anyone accepts', () => {
  test.describe.configure({ mode: 'serial' });

  let trip: SeededTrip;
  let offereeHandle: string;

  test.beforeAll(async () => {
    trip = await tripHeldByHolder('revoke');
    offereeHandle = await handleOf(offereeToken);
    await offerOwnership(trip);
  });

  test('the menu swaps transfer for revoke once an offer stands', async ({ page, signIn }) => {
    await signIn(HOLDER);
    await page.goto(travelersTab(trip.id));
    await expect(page.getByText(OFFERED_SUB).first()).toBeVisible();

    await openRowMenuFor(page, offereeHandle);

    await expect(page.getByText('Revoke ownership offer', { exact: true })).toBeVisible();
    await expect(page.getByText(TRANSFER_OWNERSHIP_LABEL, { exact: true })).toHaveCount(0);
  });

  test('revoking clears the flag and leaves the crown where it was', async ({
    page,
    signIn,
    signal,
  }) => {
    await signIn(HOLDER);
    await page.goto(travelersTab(trip.id));
    await expect(page.getByText(OFFERED_SUB).first()).toBeVisible();

    await openRowMenuFor(page, offereeHandle);
    await clickText(page, 'Revoke ownership offer');

    await expect.poll(() => signal.dialogs.length, { timeout: 15_000 }).toBeGreaterThan(0);
    await expect
      .poll(async () => offeredTo(trip.id, holderToken), { timeout: 30_000 })
      .toBeUndefined();
    expect(await ownerOf(trip.id, holderToken)).toBe(holderId);
  });
});

test.describe('the transfer flips back, so repeated runs leave the pool where they found it', () => {
  test.describe.configure({ mode: 'serial' });

  let trip: SeededTrip;
  let holderHandle: string;

  test.beforeAll(async () => {
    trip = await tripHeldByHolder('convergence');
    holderHandle = await handleOf(holderToken);
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

  test('the new owner can offer it straight back, from their own tab', async ({
    page,
    signIn,
    signal,
  }) => {
    await signIn(OFFEREE);
    await page.goto(travelersTab(trip.id));
    await expect(page.getByText(OWNER_SUB).first()).toBeVisible();

    await openRowMenuFor(page, holderHandle);
    await clickText(page, TRANSFER_OWNERSHIP_LABEL);

    await expect.poll(() => signal.dialogs.length, { timeout: 15_000 }).toBeGreaterThan(0);
    await expect.poll(async () => offeredTo(trip.id, offereeToken), { timeout: 30_000 }).toBe(
      holderId,
    );
  });

  test('the original holder accepts it back, and the roles are as they began', async ({
    page,
    signIn,
    signal,
  }) => {
    await signIn(HOLDER);
    await page.goto(travelersTab(trip.id));
    await expect(labelled(page, `${OFFER_ACCEPT_LABEL} ownership`)).toBeVisible();

    await labelled(page, `${OFFER_ACCEPT_LABEL} ownership`).click();

    await expect.poll(() => signal.dialogs.length, { timeout: 15_000 }).toBeGreaterThan(0);
    await expect.poll(async () => ownerOf(trip.id, holderToken), { timeout: 30_000 }).toBe(holderId);
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
    await page.goto(travelersTab(trip.id));
    await expect(page.getByText(/^Travelers · \d+$/).first()).toBeVisible();

    expect(signal.pageErrors).toEqual([]);
    expect(signal.consoleErrors).toEqual([]);
  });
});
