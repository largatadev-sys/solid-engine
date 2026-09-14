import { test, expect } from '../support/fixtures';
import { api, profileFor, tokenFor } from '../support/pool';
import { requireStack } from '../support/gate';
import { IDENTITY_MAP, ownerTagFor, type PoolTag } from '../support/identities';
import { seedTrip, stamp, type SeededTrip } from '../support/seed';
import { labelled } from '../support/screen';
import { ACCEPT_FAILED, ACCEPT_LABEL, DECLINE_LABEL } from '../../src/members/travelerCopy';
import {
  REQUESTS_ICON_LABEL,
  REQUESTS_TITLE,
  requestsIconLabel,
} from '../../src/members/requestsCopy';
import { declineInvitationWording } from '../../src/components/confirmDestructiveMessage';
import { TRIPS_TAB_ROUTE } from '../../src/navigation/authRoutes';

const OWNER = ownerTagFor('web/invitation-inbox');
const INVITEE: PoolTag = IDENTITY_MAP['web/invitation-inbox'].tags[1]!;

requireStack(OWNER);

let ownerToken: string;
let inviteeToken: string;
let inviteeHandle: string;
let ownerHandle: string;

async function inviteThem(tripId: string): Promise<string> {
  const invited = await api(`/v1/trips/${tripId}/invitations/by-handle`, 'POST', ownerToken, {
    handle: inviteeHandle,
  });
  expect(invited.status).toBe(201);
  return invited.body.id;
}

async function openRequests(page: import('@playwright/test').Page): Promise<void> {
  await page.goto(TRIPS_TAB_ROUTE);
  await labelled(page, REQUESTS_ICON_LABEL).click();
  await expect(page.getByText(REQUESTS_TITLE).first()).toBeVisible();
}

async function inboxIds(): Promise<string[]> {
  return ((await api('/v1/invitations', 'GET', inviteeToken)).body.items ?? []).map(
    (row: { id: string }) => row.id,
  );
}

test.beforeAll(async () => {
  ownerToken = await tokenFor(OWNER);
  inviteeToken = await tokenFor(INVITEE);
  inviteeHandle = (await profileFor(INVITEE)).handle;
  ownerHandle = (await api('/v1/me', 'GET', ownerToken)).body.handle;
});

test.describe('the card an invitee meets on Requests', () => {
  test.describe.configure({ mode: 'serial' });

  let trip: SeededTrip;
  let invitationId: string;

  test.beforeAll(async () => {
    trip = await seedTrip({
      ownerTag: OWNER,
      title: stamp('inbox card'),
      destination: 'El Nido',
    });
    invitationId = await inviteThem(trip.id);
  });

  test('carries the trip’s context, not just a line of text', async ({ page, signIn }) => {
    await signIn(INVITEE);
    await openRequests(page);

    await expect(page.getByText(trip.title).first()).toBeVisible();
    await expect(page.getByText(/El Nido/).first()).toBeVisible();
  });

  test('names who invited them, by handle', async ({ page, signIn }) => {
    await signIn(INVITEE);
    await openRequests(page);
    await expect(page.getByText(trip.title).first()).toBeVisible();

    await expect(page.getByText(new RegExp(`Invited by @${ownerHandle}`)).first()).toBeVisible();
  });

  test('says when the invitation runs out', async ({ page, signIn }) => {
    await signIn(INVITEE);
    await openRequests(page);
    await expect(page.getByText(trip.title).first()).toBeVisible();

    await expect(page.getByText(/Expires in/).first()).toBeVisible();
  });

  test('fetches the cover through the invitation, which is what authorizes it', async ({
    page,
    signIn,
    signal,
  }) => {
    await signIn(INVITEE);
    await openRequests(page);
    await expect(page.getByText(trip.title).first()).toBeVisible();

    const covers = signal.apiRequests.filter((call) => call.url.includes('/cover'));
    for (const call of covers) {
      expect(call.url).toContain('/v1/invitations/');
      expect(call.auth).toBe('bearer');
    }
  });

  test('never shows an address anywhere on the card', async ({ page, signIn }) => {
    await signIn(INVITEE);
    await openRequests(page);
    await expect(page.getByText(trip.title).first()).toBeVisible();

    expect(await page.locator('body').innerText()).not.toContain('@gmail.com');
  });

  test('accepting lands the traveler in the workspace', async ({ page, signIn }) => {
    await signIn(INVITEE);
    await openRequests(page);
    await expect(labelled(page, `${ACCEPT_LABEL} invitation to ${trip.title}`)).toBeVisible();

    await labelled(page, `${ACCEPT_LABEL} invitation to ${trip.title}`).click();

    await expect(page.getByText(ACCEPT_FAILED)).toHaveCount(0);
    await expect
      .poll(() => new URL(page.url()).pathname, { timeout: 30_000 })
      .toContain(`/itineraries/${trip.id}`);
  });

  test('and this trip’s card is gone from Requests once it has been answered', async ({
    page,
    signIn,
  }) => {
    await signIn(INVITEE);
    await openRequests(page);

    await expect(
      labelled(page, `${ACCEPT_LABEL} invitation to ${trip.title}`),
    ).toHaveCount(0);
    expect(await inboxIds()).not.toContain(invitationId);
  });
});

test.describe('declining, behind its confirm', () => {
  test.describe.configure({ mode: 'serial' });

  let trip: SeededTrip;
  let invitationId: string;

  test.beforeAll(async () => {
    trip = await seedTrip({ ownerTag: OWNER, title: stamp('inbox decline') });
    invitationId = await inviteThem(trip.id);
  });

  test('asks first, and says the inviter will not be told', async ({ page, signIn, signal }) => {
    await signIn(INVITEE);
    await openRequests(page);
    await expect(labelled(page, `${DECLINE_LABEL} invitation to ${trip.title}`)).toBeVisible();

    await labelled(page, `${DECLINE_LABEL} invitation to ${trip.title}`).click();

    await expect
      .poll(() => signal.dialogs.join(' '), { timeout: 15_000 })
      .toContain(declineInvitationWording('x').body.replace('x ', ''));

    await expect.poll(async () => inboxIds(), { timeout: 30_000 }).not.toContain(invitationId);
  });

  test('leaves the traveler off the trip', async () => {
    const mine = await api('/v1/trips', 'GET', inviteeToken);

    expect(mine.body.items.map((row: { id: string }) => row.id)).not.toContain(trip.id);
  });
});

test.describe('the count on the mail icon', () => {
  test.describe.configure({ mode: 'serial' });

  let first: SeededTrip;
  let second: SeededTrip;

  test.beforeAll(async () => {
    await api('/v1/invitations/seen', 'POST', inviteeToken);
    first = await seedTrip({ ownerTag: OWNER, title: stamp('count one') });
    await inviteThem(first.id);
  });

  test('reads one while the invitation is new to them', async ({ page, signIn }) => {
    await signIn(INVITEE);
    await page.goto(TRIPS_TAB_ROUTE);

    await expect(labelled(page, requestsIconLabel(1))).toBeVisible({ timeout: 20_000 });
  });

  test('falls to zero once they have opened Requests, and the icon loses its number', async ({
    page,
    signIn,
  }) => {
    await signIn(INVITEE);
    await openRequests(page);
    await expect(page.getByText(first.title).first()).toBeVisible({ timeout: 20_000 });

    await page.goBack();

    await expect(labelled(page, REQUESTS_ICON_LABEL)).toBeVisible({ timeout: 20_000 });
    await expect(labelled(page, requestsIconLabel(1))).toHaveCount(0);
  });

  test('rises again when a second invitation arrives, without a refresh', async ({
    page,
    signIn,
  }) => {
    await signIn(INVITEE);
    await page.goto(TRIPS_TAB_ROUTE);
    await expect(labelled(page, REQUESTS_ICON_LABEL)).toBeVisible({ timeout: 20_000 });

    second = await seedTrip({ ownerTag: OWNER, title: stamp('count two') });
    await inviteThem(second.id);

    await expect(labelled(page, requestsIconLabel(1))).toBeVisible({ timeout: 30_000 });
  });

  test('counts the unseen invitation and nothing the traveler asked for themselves', async () => {
    const unseen = ((await api('/v1/invitations', 'GET', inviteeToken)).body.items ?? []).filter(
      (row: { seenAt: string | null }) => row.seenAt === null,
    );
    const asked = (await api('/v1/join-requests', 'GET', inviteeToken)).body.items ?? [];

    expect(unseen.map((row: { itineraryId: string }) => row.itineraryId)).toEqual([second.id]);
    expect(asked.every((row: Record<string, unknown>) => !('seenAt' in row)))
      .toBe(true);
  });
});

test.describe('the count falls live, with no refresh', () => {
  test.describe.configure({ mode: 'serial' });

  let trip: SeededTrip;
  let invitationId: string;

  test.beforeAll(async () => {
    await api('/v1/invitations/seen', 'POST', inviteeToken);
    trip = await seedTrip({ ownerTag: OWNER, title: stamp('live fall') });
    invitationId = await inviteThem(trip.id);
  });

  test('a revoke by the inviter drops the number while the traveler sits on Trips', async ({
    page,
    signIn,
  }) => {
    await signIn(INVITEE);
    await page.goto(TRIPS_TAB_ROUTE);
    await expect(labelled(page, requestsIconLabel(1))).toBeVisible({ timeout: 20_000 });

    await api(`/v1/invitations/${invitationId}/revoke`, 'POST', ownerToken);

    await expect(labelled(page, REQUESTS_ICON_LABEL)).toBeVisible({ timeout: 30_000 });
    await expect(labelled(page, requestsIconLabel(1))).toHaveCount(0);
  });
});
