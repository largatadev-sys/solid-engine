import { test, expect } from '../support/fixtures';
import { api, tokenFor } from '../support/pool';
import { requireStack } from '../support/gate';
import { IDENTITY_MAP, ownerTagFor } from '../support/identities';
import { seedTrip, stamp } from '../support/seed';
import { TAB_ROW_LABEL, editingAdvisory, tabLabel } from '../../src/itineraries/tripTabs';
import { REQUESTED_GHOST_LABEL } from '../../src/members/travelerCopy';

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
  const seeded = await seedTrip({
    ownerTag: WATCHER,
    title: stamp('Live Trips Walk'),
    destination: 'Coron',
    members: [EDITOR],
  });

  trip = seeded.id;
  title = seeded.title;
  watcherToken = seeded.ownerToken;
  editorToken = await tokenFor(EDITOR);
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


  test('an approved join request makes the trip appear and clears its pending row, from one event', async ({
    signIn,
    page,
  }) => {
    await recordEveryFrameTheAppReceives(page);
    await signIn(WATCHER);
    await openUpcoming(page);
    await waitForTheTravelerSubscription(page);

    const hostTitle = stamp('Approval Walk');
    const host = await api('/v1/itineraries', 'POST', editorToken, {
      title: hostTitle,
      destination: 'Bantayan',
      durationDays: 2,
    });
    expect(host.status, 'the owner needs a trip to approve into').toBe(201);

    const link = await api(`/v1/itineraries/${host.body.id}/join-link`, 'GET', editorToken);
    expect(link.status).toBe(200);
    const asked = await api(`/v1/join/${link.body.token}/request`, 'POST', watcherToken, {});
    expect([200, 201], 'the watcher must actually ask to join').toContain(asked.status);

    await openUpcoming(page);
    await waitForTheTravelerSubscription(page);

    await expect(
      page.getByRole('link', { name: hostTitle }),
      'a requested trip is not a member trip yet, so it must not be a LIST CARD before approval.'
        + ' Scoped to the link role because the title is already on screen inside the pending'
        + ' request row — a bare text query would answer for that instead and never fail.',
    ).toHaveCount(0);
    const pendingRows = page.getByText(REQUESTED_GHOST_LABEL, { exact: true });
    await expect
      .poll(() => pendingRows.count(), {
        timeout: ARRIVAL_TIMEOUT_MS,
        message:
          'the pending row is on screen before approval — established by a fetch, because nothing'
          + ' pushes a traveler their own request. Counted rather than matched, because the pool'
          + ' carries requests from other walks and a bare locator is ambiguous.',
      })
      .toBeGreaterThan(0);
    const pendingBefore = await pendingRows.count();

    const queue = await api(`/v1/itineraries/${host.body.id}/join-requests`, 'GET', editorToken);
    expect(queue.status, 'the owner must be able to see the queue').toBe(200);
    const mine = (queue.body.items ?? [])[0];
    expect(mine, 'the request must be in the queue to approve').toBeDefined();

    const approved = await api(
      `/v1/itineraries/${host.body.id}/join-requests/${mine.id}/approve`,
      'POST',
      editorToken,
      {},
    );
    expect(approved.status, 'the owner must actually approve').toBe(204);

    await expect
      .poll(() => capturedTypes(page), { timeout: ARRIVAL_TIMEOUT_MS })
      .toContain('membership.granted');
    await expect(
      page.getByRole('link', { name: hostTitle }),
      'one event, two parts of one screen: the trip joins the list with no refresh gesture',
    ).toBeVisible({ timeout: ARRIVAL_TIMEOUT_MS });
    await expect
      .poll(() => pendingRows.count(), {
        timeout: ARRIVAL_TIMEOUT_MS,
        message:
          'and the same single event clears the pending row — two events for this would be a'
          + ' design regression, not a convenience (ticket 04)',
      })
      .toBeLessThan(pendingBefore);
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
