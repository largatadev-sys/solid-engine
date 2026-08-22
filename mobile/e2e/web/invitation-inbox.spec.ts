import { test, expect } from '../support/fixtures';
import { api, profileFor, tokenFor } from '../support/pool';
import { requireStack } from '../support/gate';
import { IDENTITY_MAP, ownerTagFor, type PoolTag } from '../support/identities';
import { seedTrip, stamp, type SeededTrip } from '../support/seed';
import { labelled } from '../support/screen';
import { ACCEPT_LABEL, DECLINE_LABEL } from '../../src/members/travelerCopy';
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
  const invited = await api(`/v1/itineraries/${tripId}/invitations/by-handle`, 'POST', ownerToken, {
    handle: inviteeHandle,
  });
  expect(invited.status).toBe(201);
  return invited.body.id;
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

test.describe('the card an invitee meets on Trips', () => {
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
    await page.goto(TRIPS_TAB_ROUTE);

    await expect(page.getByText(trip.title).first()).toBeVisible();
    await expect(page.getByText(/El Nido/).first()).toBeVisible();
  });

  test('names who invited them, by handle', async ({ page, signIn }) => {
    await signIn(INVITEE);
    await page.goto(TRIPS_TAB_ROUTE);
    await expect(page.getByText(trip.title).first()).toBeVisible();

    await expect(page.getByText(new RegExp(`Invited by @${ownerHandle}`)).first()).toBeVisible();
  });

  test('says when the invitation runs out', async ({ page, signIn }) => {
    await signIn(INVITEE);
    await page.goto(TRIPS_TAB_ROUTE);
    await expect(page.getByText(trip.title).first()).toBeVisible();

    await expect(page.getByText(/Expires in/).first()).toBeVisible();
  });

  test('fetches the cover through the invitation, which is what authorizes it', async ({
    page,
    signIn,
    signal,
  }) => {
    await signIn(INVITEE);
    await page.goto(TRIPS_TAB_ROUTE);
    await expect(page.getByText(trip.title).first()).toBeVisible();

    const covers = signal.apiRequests.filter((call) => call.url.includes('/cover'));
    for (const call of covers) {
      expect(call.url).toContain('/v1/invitations/');
      expect(call.auth).toBe('bearer');
    }
  });

  test('never shows an address anywhere on the card', async ({ page, signIn }) => {
    await signIn(INVITEE);
    await page.goto(TRIPS_TAB_ROUTE);
    await expect(page.getByText(trip.title).first()).toBeVisible();

    expect(await page.locator('body').innerText()).not.toContain('@gmail.com');
  });

  test('accepting lands the traveler in the workspace', async ({ page, signIn }) => {
    await signIn(INVITEE);
    await page.goto(TRIPS_TAB_ROUTE);
    await expect(labelled(page, `${ACCEPT_LABEL} invitation to ${trip.title}`)).toBeVisible();

    await labelled(page, `${ACCEPT_LABEL} invitation to ${trip.title}`).click();

    await expect
      .poll(() => new URL(page.url()).pathname, { timeout: 30_000 })
      .toContain(`/itineraries/${trip.id}`);
  });

  test('and this trip’s card is gone from Trips once it has been answered', async ({
    page,
    signIn,
  }) => {
    await signIn(INVITEE);
    await page.goto(TRIPS_TAB_ROUTE);
    await expect(page.getByText(/Trips/i).first()).toBeVisible();

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
    await page.goto(TRIPS_TAB_ROUTE);
    await expect(labelled(page, `${DECLINE_LABEL} invitation to ${trip.title}`)).toBeVisible();

    await labelled(page, `${DECLINE_LABEL} invitation to ${trip.title}`).click();

    await expect
      .poll(() => signal.dialogs.join(' '), { timeout: 15_000 })
      .toContain(declineInvitationWording('x').body.replace('x ', ''));

    await expect.poll(async () => inboxIds(), { timeout: 30_000 }).not.toContain(invitationId);
  });

  test('leaves the traveler off the trip', async () => {
    const mine = await api('/v1/itineraries', 'GET', inviteeToken);

    expect(mine.body.items.map((row: { id: string }) => row.id)).not.toContain(trip.id);
  });
});
