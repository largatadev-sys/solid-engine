import type { Page } from '@playwright/test';
import { test, expect } from '../support/fixtures';
import { api, profileFor, tokenFor } from '../support/pool';
import { requireStack } from '../support/gate';
import { IDENTITY_MAP, ownerTagFor, type PoolTag } from '../support/identities';
import { climbTo, seedTrip, stamp, type SeededTrip } from '../support/seed';
import { labelled, labelStarting } from '../support/screen';
import { removeMemberWording } from '../../src/components/confirmDestructiveMessage';
import {
  ADD_SHEET_TITLE,
} from '../../src/members/travelerCopy';
import {
  INVITE_LABEL,
  INVITED_GHOST_LABEL,
  ON_THIS_TRIP_LABEL,
  SEARCH_PLACEHOLDER,
  SHARE_LINK_LABEL,
} from '../../src/members/addSheet';
import { LEAVE_TRIP_LABEL, REMOVE_FROM_TRIP_LABEL } from '../../src/members/rowMenu';
import { APPROVE_LABEL, DECLINE_LABEL, REVOKE_LABEL } from '../../src/members/travelerCopy';

const OWNER = ownerTagFor('web/travelers');
const MEMBER: PoolTag = IDENTITY_MAP['web/travelers'].tags[1]!;
const STRANGER: PoolTag = IDENTITY_MAP['web/travelers'].tags[2]!;

requireStack(OWNER);

let ownerToken: string;
let memberToken: string;
let memberHandle: string;

const travelersTab = (tripId: string) => `/itineraries/${tripId}?tab=travelers`;

async function pendingInvitations(tripId: string): Promise<Array<{ id: string }>> {
  return (await api(`/v1/itineraries/${tripId}/invitations`, 'GET', ownerToken)).body.items ?? [];
}

async function rosterIds(tripId: string, token: string): Promise<string[]> {
  return ((await api(`/v1/itineraries/${tripId}/members`, 'GET', token)).body.items ?? []).map(
    (row: { travelerId: string }) => row.travelerId,
  );
}

async function openAddSheet(page: Page): Promise<void> {
  await labelled(page, 'Add traveler').click();
  await expect(page.getByText(ADD_SHEET_TITLE, { exact: true }).last()).toBeVisible();
}

async function search(page: Page, handle: string): Promise<void> {
  await labelled(page, SEARCH_PLACEHOLDER).fill(handle);
}

test.beforeAll(async () => {
  ownerToken = await tokenFor(OWNER);
  memberToken = await tokenFor(MEMBER);
  memberHandle = (await profileFor(MEMBER)).handle;
});

test.describe('the roster the owner sees', () => {
  test.describe.configure({ mode: 'serial' });

  let trip: SeededTrip;

  test.beforeAll(async () => {
    trip = await seedTrip({ ownerTag: OWNER, title: stamp('travelers walk') });
  });

  test('the tab lists the roster under a counted heading', async ({ page, signIn }) => {
    await signIn(OWNER);
    await page.goto(travelersTab(trip.id));

    await expect(page.getByText('Travelers · 1', { exact: true })).toBeVisible();
    await expect(page.getByText('Trip owner').first()).toBeVisible();
  });

  test('the add bar opens the sheet, which looks up an exact handle', async ({ page, signIn }) => {
    await signIn(OWNER);
    await page.goto(travelersTab(trip.id));
    await openAddSheet(page);

    await search(page, `@${memberHandle}`);

    await expect(page.getByText(`@${memberHandle}`, { exact: true }).last()).toBeVisible();
    await expect(labelled(page, `${INVITE_LABEL} @${memberHandle}`)).toBeVisible();
  });

  test('inviting lands the row in Invited, named for who asked', async ({ page, signIn }) => {
    await signIn(OWNER);
    await page.goto(travelersTab(trip.id));
    await openAddSheet(page);
    await search(page, `@${memberHandle}`);
    await labelled(page, `${INVITE_LABEL} @${memberHandle}`).click();

    await expect.poll(async () => (await pendingInvitations(trip.id)).length, {
      timeout: 30_000,
    }).toBe(1);

    await page.goto(travelersTab(trip.id));
    await expect(page.getByText('Invited · 1', { exact: true })).toBeVisible();
    await expect(page.getByText(/waiting on them/).first()).toBeVisible();
  });

  test('a second look at the same handle opens ghosted, with nothing to press', async ({
    page,
    signIn,
  }) => {
    await signIn(OWNER);
    await page.goto(travelersTab(trip.id));
    await openAddSheet(page);
    await search(page, `@${memberHandle}`);

    await expect(page.getByText(INVITED_GHOST_LABEL, { exact: true }).last()).toBeVisible();
    await expect(labelled(page, `${INVITE_LABEL} @${memberHandle}`)).toHaveCount(0);
  });

  test('a handle that matches nobody pivots to the link instead of stalling', async ({
    page,
    signIn,
  }) => {
    await signIn(OWNER);
    await page.goto(travelersTab(trip.id));
    await openAddSheet(page);

    await search(page, '@nobodyholdsthishandle999');

    await expect(page.getByText(/No one matches/).first()).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText('Send them the invite link', { exact: true })).toBeVisible();
    await expect(page.getByText(SHARE_LINK_LABEL, { exact: true })).toHaveCount(0);
  });
});

test.describe('any member may revoke, which is the C1 widening on the surface', () => {
  test.describe.configure({ mode: 'serial' });

  let trip: SeededTrip;
  let strangerHandle: string;

  test.beforeAll(async () => {
    trip = await seedTrip({
      ownerTag: OWNER,
      title: stamp('travelers revoke'),
      members: [MEMBER],
    });
    strangerHandle = (await profileFor(STRANGER)).handle;
    await api(`/v1/itineraries/${trip.id}/invitations/by-handle`, 'POST', ownerToken, {
      handle: strangerHandle,
    });
  });

  test('the invited row is visible to a plain member', async ({ page, signIn }) => {
    await signIn(MEMBER);
    await page.goto(travelersTab(trip.id));

    await expect(page.getByText('Invited · 1', { exact: true })).toBeVisible();
  });

  test('and that member — who did not send it — can revoke it', async ({ page, signIn }) => {
    await signIn(MEMBER);
    await page.goto(travelersTab(trip.id));
    await expect(page.getByText('Invited · 1', { exact: true })).toBeVisible();

    await labelStarting(page, REVOKE_LABEL).click();

    await expect.poll(async () => (await pendingInvitations(trip.id)).length, {
      timeout: 30_000,
    }).toBe(0);
  });

  test('a member sees no overflow on anyone else’s row — removal stays owner-only', async ({
    page,
    signIn,
  }) => {
    await signIn(MEMBER);
    await page.goto(travelersTab(trip.id));
    await expect(page.getByText('Trip owner').first()).toBeVisible();

    const ownerHandle = (await api('/v1/me', 'GET', ownerToken)).body.handle;
    await expect(labelStarting(page, `More options for @${ownerHandle}`)).toHaveCount(0);
  });

  test('…but does see it on their own row, which is the only leave door left', async ({
    page,
    signIn,
  }) => {
    await signIn(MEMBER);
    await page.goto(travelersTab(trip.id));
    await expect(page.getByText('Trip owner').first()).toBeVisible();

    await expect(labelStarting(page, `More options for @${memberHandle}`)).toBeVisible();

    await labelStarting(page, `More options for @${memberHandle}`).click();
    await expect(page.getByText(LEAVE_TRIP_LABEL, { exact: true })).toBeVisible();
    await expect(page.getByText(REMOVE_FROM_TRIP_LABEL, { exact: true })).toHaveCount(0);
  });
});

test.describe('the owner answers the requests queue', () => {
  test.describe.configure({ mode: 'serial' });

  let trip: SeededTrip;
  let askerToken: string;
  let askerId: string;

  test.beforeAll(async () => {
    trip = await seedTrip({ ownerTag: OWNER, title: stamp('travelers requests') });
    const asker: PoolTag = STRANGER;
    askerToken = await tokenFor(asker);
    await profileFor(asker);
    askerId = (await api('/v1/me', 'GET', askerToken)).body.id;

    const token = (await api(`/v1/itineraries/${trip.id}/join-link`, 'GET', ownerToken)).body.token;
    await api(`/v1/join/${token}/request`, 'POST', askerToken, {});
  });

  test('the Requests section renders for the owner, last and counted', async ({ page, signIn }) => {
    await signIn(OWNER);
    await page.goto(travelersTab(trip.id));

    await expect(page.getByText('Requests · 1', { exact: true })).toBeVisible();
    await expect(page.getByText(/Via invite link/).first()).toBeVisible();
  });

  test('approving moves the traveler into the roster', async ({ page, signIn }) => {
    await signIn(OWNER);
    await page.goto(travelersTab(trip.id));
    await expect(page.getByText('Requests · 1', { exact: true })).toBeVisible();

    await labelStarting(page, APPROVE_LABEL).click();

    await expect
      .poll(async () => rosterIds(trip.id, ownerToken), { timeout: 30_000 })
      .toContain(askerId);
  });

  test('a second request, declined, disappears silently', async ({ page, signIn }) => {
    const other = await seedTrip({ ownerTag: OWNER, title: stamp('travelers decline') });
    const token = (await api(`/v1/itineraries/${other.id}/join-link`, 'GET', ownerToken)).body.token;
    await api(`/v1/join/${token}/request`, 'POST', askerToken, {});

    await signIn(OWNER);
    await page.goto(travelersTab(other.id));
    await expect(page.getByText('Requests · 1', { exact: true })).toBeVisible();

    await labelStarting(page, DECLINE_LABEL).click();

    await expect
      .poll(async () => rosterIds(other.id, ownerToken), { timeout: 30_000 })
      .not.toContain(askerId);
    await expect(page.getByText('Requests · 1', { exact: true })).toHaveCount(0);
  });
});

test.describe('removal, behind the owner’s confirm', () => {
  test.describe.configure({ mode: 'serial' });

  let trip: SeededTrip;
  let memberId: string;

  test.beforeAll(async () => {
    trip = await seedTrip({
      ownerTag: OWNER,
      title: stamp('travelers remove'),
      members: [MEMBER],
    });
    memberId = (await api('/v1/me', 'GET', memberToken)).body.id;
  });

  test('the owner’s menu offers removal, and the confirm names what survives', async ({
    page,
    signIn,
    signal,
  }) => {
    await signIn(OWNER);
    await page.goto(travelersTab(trip.id));
    await expect(page.getByText('Travelers · 2', { exact: true })).toBeVisible();

    await labelStarting(page, `More options for @${memberHandle}`).click();
    await page.getByText(REMOVE_FROM_TRIP_LABEL, { exact: true }).last().click();

    await expect
      .poll(() => signal.dialogs.join(' '), { timeout: 15_000 })
      .toContain(removeMemberWording('x').body);

    await expect
      .poll(async () => rosterIds(trip.id, ownerToken), { timeout: 30_000 })
      .not.toContain(memberId);
  });

  test('the count closes behind them in the same pass', async ({ page, signIn }) => {
    await signIn(OWNER);
    await page.goto(travelersTab(trip.id));

    await expect(page.getByText('Travelers · 1', { exact: true })).toBeVisible();
  });
});

test.describe('the frozen surface, walked on an archived trip', () => {
  test.describe.configure({ mode: 'serial' });

  let trip: SeededTrip;

  test.beforeAll(async () => {
    trip = await seedTrip({
      ownerTag: OWNER,
      title: stamp('travelers frozen'),
      members: [MEMBER],
    });
    await api(`/v1/itineraries/${trip.id}/invitations/by-handle`, 'POST', ownerToken, {
      handle: (await profileFor(STRANGER)).handle,
    });
    await api(`/v1/itineraries/${trip.id}/archive`, 'POST', ownerToken, {});
  });

  test('a frozen trip shows the roster and nothing that would change it', async ({
    page,
    signIn,
  }) => {
    await signIn(OWNER);
    await page.goto(travelersTab(trip.id));

    await expect(page.getByText('Travelers · 2', { exact: true })).toBeVisible();
    await expect(page.getByText('Add traveler', { exact: true })).toHaveCount(0);
    await expect(page.getByText(/^Invited · \d+$/)).toHaveCount(0);
    await expect(page.getByText(/^Requests · \d+$/)).toHaveCount(0);
  });

  test('the owner sees no overflow at all — there is nothing left to act on', async ({
    page,
    signIn,
  }) => {
    await signIn(OWNER);
    await page.goto(travelersTab(trip.id));
    await expect(page.getByText('Travelers · 2', { exact: true })).toBeVisible();

    await expect(labelStarting(page, `More options for @${memberHandle}`)).toHaveCount(0);
  });

  test('a member is masked from the archived trip entirely — ADR-017, owner-only sight', async ({
    page,
    signIn,
  }) => {
    await signIn(MEMBER);
    await page.goto(travelersTab(trip.id));

    await expect(page.getByText('Travelers · 2', { exact: true })).toHaveCount(0);
  });

  test('a published trip is not reachable through this route at all', async ({ page, signIn }) => {
    const shipped = await seedTrip({
      ownerTag: OWNER,
      title: stamp('travelers published'),
      members: [MEMBER],
      durationDays: 2,
    });
    await climbTo(shipped, 'completed');
    await api(`/v1/itineraries/${shipped.id}/publish`, 'POST', ownerToken, {});

    await signIn(MEMBER);
    await page.goto(travelersTab(shipped.id));

    await expect
      .poll(() => new URL(page.url()).pathname, { timeout: 20_000 })
      .toContain(`/published/${shipped.id}`);
  });

  test('the add sheet’s member state renders for somebody already aboard', async ({
    page,
    signIn,
  }) => {
    const open = await seedTrip({
      ownerTag: OWNER,
      title: stamp('travelers on trip'),
      members: [MEMBER],
    });

    await signIn(OWNER);
    await page.goto(travelersTab(open.id));
    await openAddSheet(page);
    await search(page, `@${memberHandle}`);

    await expect(page.getByText(ON_THIS_TRIP_LABEL, { exact: true })).toBeVisible({
      timeout: 20_000,
    });
  });
});
