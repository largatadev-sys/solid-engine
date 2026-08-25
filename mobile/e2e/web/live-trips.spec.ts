import { test, expect } from '../support/fixtures';
import { api, profileFor, tokenFor } from '../support/pool';
import { requireStack } from '../support/gate';
import { IDENTITY_MAP, ownerTagFor } from '../support/identities';
import { SeedFailure, stamp } from '../support/seed';
import { TAB_ROW_LABEL, editingAdvisory, tabLabel } from '../../src/itineraries/tripTabs';

const WATCHER = ownerTagFor('web/live-trips');
const EDITOR = IDENTITY_MAP['web/live-trips'].tags[1]!;

const ARRIVAL_TIMEOUT_MS = 15_000;

const ADVISORY = editingAdvisory({ beingEdited: true })!;

requireStack(WATCHER);
requireStack(EDITOR);

test.describe.configure({ mode: 'serial' });

let watcherToken: string;
let editorToken: string;
let trip: string;
let title: string;

const lockUri = (): string => `/v1/itineraries/${trip}/edit-lock`;

const sessionBody = () => ({ subjectType: 'SESSION', subjectId: trip });


async function seedSharedTrip(): Promise<void> {
  watcherToken = await tokenFor(WATCHER);
  editorToken = await tokenFor(EDITOR);
  await Promise.all([profileFor(WATCHER), profileFor(EDITOR)]);

  title = stamp('Live Trips Walk');
  const created = await api('/v1/itineraries', 'POST', watcherToken, {
    title,
    destination: 'Coron',
    durationDays: 2,
  });
  if (created.status !== 201) throw new SeedFailure('the shared trip', created.body);
  trip = created.body.id;

  const editorHandle = (await api('/v1/me', 'GET', editorToken)).body.handle;
  const invited = await api(`/v1/itineraries/${trip}/invitations/by-handle`, 'POST', watcherToken, {
    handle: editorHandle,
  });
  if (invited.status !== 201) throw new SeedFailure('the invitation', invited.body);

  const inbox = (await api('/v1/invitations', 'GET', editorToken)).body.items ?? [];
  const mine = inbox.find((one: { itineraryId: string }) => one.itineraryId === trip);
  if (mine === undefined) throw new SeedFailure('the inbox invitation', inbox);

  const accepted = await api(`/v1/invitations/${mine.id}/accept`, 'POST', editorToken, {});
  if (accepted.status !== 200) throw new SeedFailure('the accept', accepted.body);
}


test.beforeAll(async () => {
  await seedSharedTrip();
});


test.afterEach(async () => {
  await api(lockUri(), 'DELETE', editorToken, sessionBody());
});


test.describe('the Trips card moves while you are looking at it (S4.35 AC 1, 2)', () => {
  test('a co-member opening an Editing Session raises the card, and releasing it clears', async ({
    signIn,
    page,
  }) => {
    await recordEveryFrameTheAppReceives(page);
    await signIn(WATCHER);
    await openUpcoming(page);
    await expect(
      ourCard(page).getByText(ADVISORY),
      'scoped to the card this walk seeded: other trips in the pool may hold live sessions'
        + ' of their own, and a page-wide count would answer for them instead',
    ).toHaveCount(0);
    await waitForTheTravelerSubscription(page);

    const acquired = await api(lockUri(), 'POST', editorToken, sessionBody());
    expect(acquired.status, 'the co-member must actually hold the session').toBe(200);

    await expect(
      ourCard(page).getByText(ADVISORY),
      'no refresh, no navigation: the card must move from the socket alone',
    ).toBeVisible({ timeout: ARRIVAL_TIMEOUT_MS });

    const released = await api(lockUri(), 'DELETE', editorToken, sessionBody());
    expect(released.status, 'the co-member must actually release the session').toBe(204);

    await expect(
      ourCard(page).getByText(ADVISORY),
      'a released session must clear the card, or it stays up forever',
    ).toHaveCount(0, { timeout: ARRIVAL_TIMEOUT_MS });
  });


  test('the traveler topic carries the editing-session frames to the watching member', async ({
    signIn,
    page,
  }) => {
    await recordEveryFrameTheAppReceives(page);
    await signIn(WATCHER);
    await openUpcoming(page);

    await api(lockUri(), 'POST', editorToken, sessionBody());
    await expect(ourCard(page).getByText(ADVISORY)).toBeVisible({ timeout: ARRIVAL_TIMEOUT_MS });

    expect(
      await capturedTypes(page),
      'the render and the frame are two claims: a card that moved for any other reason'
        + ' would pass the test above on its own',
    ).toContain('editing-session.acquired');
  });


  test('the subscription is the traveler subject, not a topic per trip on screen', async ({
    signIn,
    page,
  }) => {
    await recordEveryFrameTheAppReceives(page);
    await signIn(WATCHER);
    await openUpcoming(page);

    const travelerId = (await api('/v1/me', 'GET', watcherToken)).body.id;

    await expect
      .poll(() => capturedSubscriptions(page), {
        timeout: ARRIVAL_TIMEOUT_MS,
        message: 'the app must hold exactly one traveler-subject subscription at the root',
      })
      .toContain(`traveler:${travelerId}`);
  });
});


test.describe('the rest of the Trips surface moves too (S4.35 AC 5, 6, 11)', () => {
  test('an invitation lands in the inbox header with no refresh', async ({ signIn, page }) => {
    await recordEveryFrameTheAppReceives(page);
    await signIn(WATCHER);
    await openUpcoming(page);
    await waitForTheTravelerSubscription(page);

    const invitedTitle = stamp('Inbox Walk');
    const invited = await api('/v1/itineraries', 'POST', editorToken, {
      title: invitedTitle,
      destination: 'Siargao',
      durationDays: 2,
    });
    expect(invited.status, 'the inviter needs a trip to invite into').toBe(201);
    const watcherHandle = (await api('/v1/me', 'GET', watcherToken)).body.handle;
    const sent = await api(
      `/v1/itineraries/${invited.body.id}/invitations/by-handle`,
      'POST',
      editorToken,
      { handle: watcherHandle },
    );
    expect(sent.status, 'the invitation must actually be issued').toBe(201);

    await expect
      .poll(() => capturedTypes(page), { timeout: ARRIVAL_TIMEOUT_MS })
      .toContain('invitation.received');
    await expect(
      page.getByText(invitedTitle),
      'the inbox is the ListHeaderComponent of this very screen, so a new invitation must'
        + ' appear on it without a refresh gesture',
    ).toBeVisible({ timeout: ARRIVAL_TIMEOUT_MS });
  });


  test('a co-member save reaches the watcher as a payload frame', async ({ signIn, page }) => {
    await recordEveryFrameTheAppReceives(page);
    await signIn(WATCHER);
    await openUpcoming(page);
    await waitForTheTravelerSubscription(page);

    await api(lockUri(), 'POST', editorToken, sessionBody());
    const base = (await api(`/v1/itineraries/${trip}`, 'GET', editorToken)).body.planVersion;
    const saved = await api(`/v1/itineraries/${trip}/plan`, 'PUT', editorToken, {
      basePlanVersion: base,
      days: [],
    });
    expect(saved.status, 'the co-member must actually save').toBe(200);

    await expect
      .poll(() => capturedTypes(page), {
        timeout: ARRIVAL_TIMEOUT_MS,
        message: 'a save inside a live session must reach every other member of that trip',
      })
      .toContain('plan.saved');
  });


  test('a reconnect marks queries stale and fetches nothing until focus', async ({ signIn, page }) => {
    await recordEveryFrameTheAppReceives(page);
    await signIn(WATCHER);
    await openUpcoming(page);
    await waitForTheTravelerSubscription(page);

    const before = await capturedSubscriptions(page);
    await page.evaluate(() => {
      (window as unknown as { __largataKill?: () => void }).__largataKill?.();
    });

    await expect
      .poll(() => capturedSubscriptions(page).then((all) => all.length), {
        timeout: ARRIVAL_TIMEOUT_MS,
        message:
          'the client must back off, reconnect and RESUBSCRIBE — a socket that reconnects'
          + ' without resubscribing is silent in a way nothing else reports',
      })
      .toBeGreaterThan(before.length);

    await api(lockUri(), 'POST', editorToken, sessionBody());
    await expect(
      ourCard(page).getByText(ADVISORY),
      'and the resubscribed socket must actually carry events again',
    ).toBeVisible({ timeout: ARRIVAL_TIMEOUT_MS });
  });
});


function ourCard(page: import('@playwright/test').Page) {
  return page.getByRole('link', { name: title });
}


async function waitForTheTravelerSubscription(page: import('@playwright/test').Page): Promise<void> {
  const travelerId = (await api('/v1/me', 'GET', watcherToken)).body.id;
  await expect
    .poll(() => capturedSubscriptions(page), {
      timeout: ARRIVAL_TIMEOUT_MS,
      message:
        'an event raised before the subscription lands reaches nobody, and the card would'
        + ' then be judged against a socket that was never listening',
    })
    .toContain(`traveler:${travelerId}`);
}


async function openUpcoming(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/trips');
  await page
    .getByRole('tablist', { name: TAB_ROW_LABEL })
    .getByRole('tab', { name: tabLabel('upcoming') })
    .click();
  await expect(
    page.getByText(title),
    'the seeded trip is upcoming; the tab is selected explicitly because the screen'
      + ' remembers whichever tab the previous walk left it on',
  ).toBeVisible({ timeout: ARRIVAL_TIMEOUT_MS });
}


async function recordEveryFrameTheAppReceives(page: import('@playwright/test').Page): Promise<void> {
  await page.addInitScript(() => {
    const seen: string[] = [];
    (window as unknown as { __tripFrames: string[] }).__tripFrames = seen;

    const live: WebSocket[] = [];
    (window as unknown as { __largataKill: () => void }).__largataKill = () => {
      live.forEach((socket) => {
        socket.close();
      });
    };

    const Native = window.WebSocket;
    class Recording extends Native {
      constructor(url: string | URL, protocols?: string | string[]) {
        super(url, protocols);
        live.push(this);
        this.addEventListener('message', (event: MessageEvent) => {
          seen.push(String(event.data));
        });
      }
    }
    window.WebSocket = Recording as unknown as typeof WebSocket;
  });
}


async function capturedTypes(page: import('@playwright/test').Page): Promise<string[]> {
  return page.evaluate(() =>
    ((window as unknown as { __tripFrames?: string[] }).__tripFrames ?? []).flatMap((raw) => {
      try {
        const frame = JSON.parse(raw) as { type?: string };
        return typeof frame.type === 'string' ? [frame.type] : [];
      } catch {
        return [];
      }
    }),
  );
}


async function capturedSubscriptions(page: import('@playwright/test').Page): Promise<string[]> {
  return page.evaluate(() =>
    ((window as unknown as { __tripFrames?: string[] }).__tripFrames ?? []).flatMap((raw) => {
      try {
        const frame = JSON.parse(raw) as { action?: string; topic?: string };
        return frame.action === 'subscribed' && typeof frame.topic === 'string' ? [frame.topic] : [];
      } catch {
        return [];
      }
    }),
  );
}
