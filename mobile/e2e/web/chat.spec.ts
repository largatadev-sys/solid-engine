import type { Page } from '@playwright/test';

import { test, expect } from '../support/fixtures';
import { api, tokenFor } from '../support/pool';
import { requireStack } from '../support/gate';
import { IDENTITY_MAP, ownerTagFor, type PoolTag } from '../support/identities';
import { SeedFailure, stamp } from '../support/seed';
import { labelled } from '../support/screen';
import { chatCopy } from '../../src/theme/workspaceTokens';
import { apiURL } from '../../playwright.config';

const OWNER = ownerTagFor('web/chat');
const MEMBER = IDENTITY_MAP['web/chat'].tags[1]!;

const ARRIVAL_TIMEOUT_MS = 15_000;
const OPEN_TIMEOUT_MS = 10_000;

requireStack(OWNER);
requireStack(MEMBER);

test.describe.configure({ mode: 'serial' });

let ownerToken: string;
let memberToken: string;
let trip: string;

type CapturedFrame = { at: number; raw: string };

declare global {
  interface Window {
    __chatFrames?: CapturedFrame[];
    __chatReady?: Promise<string>;
  }
}

const chatRoute = (id: string): string => `/itineraries/${id}?tab=chat`;

const messagesUri = (): string => `/v1/itineraries/${trip}/chat/messages`;

const sendViaApi = async (as: string, body: string) =>
  api(messagesUri(), 'POST', as, { body });


async function seedChatTrip(): Promise<void> {
  ownerToken = await tokenFor(OWNER);
  memberToken = await tokenFor(MEMBER);

  const created = await api('/v1/itineraries', 'POST', ownerToken, {
    title: stamp('Chat Walk'),
    destination: 'El Nido',
    durationDays: 2,
  });
  if (created.status !== 201) throw new SeedFailure('the chat trip', created.body);
  trip = created.body.id;

  const memberHandle = (await api('/v1/me', 'GET', memberToken)).body.handle;
  const invited = await api(`/v1/itineraries/${trip}/invitations/by-handle`, 'POST', ownerToken, {
    handle: memberHandle,
  });
  if (invited.status !== 201) throw new SeedFailure('the invitation', invited.body);
  const inbox = (await api('/v1/invitations', 'GET', memberToken)).body.items ?? [];
  const mine = inbox.find((one: { itineraryId: string }) => one.itineraryId === trip);
  if (mine === undefined) throw new SeedFailure('the inbox invitation', inbox);
  const accepted = await api(`/v1/invitations/${mine.id}/accept`, 'POST', memberToken, {});
  if (accepted.status !== 200) throw new SeedFailure('the accept', accepted.body);
}


async function watchChatTopic(page: Page, tag: PoolTag, itineraryId: string): Promise<void> {
  const minted = await api('/v1/ws-ticket', 'POST', await tokenFor(tag));
  const ticket = (minted.body as { ticket: string }).ticket;

  await page.evaluate(
    async ([issued, topic, base, openTimeout]) => {
      const socket = new WebSocket(
        `${base.replace(/^http/, 'ws')}/ws?ticket=${encodeURIComponent(issued)}`,
      );
      window.__chatFrames = [];

      window.__chatReady = new Promise<string>((resolve, reject) => {
        const never = setTimeout(() => reject(new Error('socket never opened')), openTimeout);
        socket.addEventListener('message', (event) => {
          const raw = String(event.data);
          window.__chatFrames?.push({ at: Date.now(), raw });
          let frame: { action?: string; topic?: string; code?: string };
          try {
            frame = JSON.parse(raw) as typeof frame;
          } catch {
            return;
          }
          if (frame.action === 'subscribed' && frame.topic === topic) {
            clearTimeout(never);
            resolve('subscribed');
          }
          if (frame.action === 'error') {
            clearTimeout(never);
            reject(new Error(`server refused: ${frame.code}`));
          }
        });
        socket.addEventListener('error', () => {
          clearTimeout(never);
          reject(new Error('socket errored before it opened'));
        });
        socket.addEventListener('open', () =>
          socket.send(JSON.stringify({ action: 'subscribe', topic })),
        );
      });
    },
    [ticket, `itinerary:${itineraryId}:chat`, apiURL, OPEN_TIMEOUT_MS] as const,
  );

  await expect
    .poll(async () => page.evaluate(async () => window.__chatReady), {
      timeout: ARRIVAL_TIMEOUT_MS,
      message: 'the chat topic must accept this member; a refusal here is an authz failure',
    })
    .toBe('subscribed');
}


async function deliveredBodies(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    (window.__chatFrames ?? []).flatMap((captured) => {
      try {
        const frame = JSON.parse(captured.raw) as {
          type?: string;
          payload?: { body?: string };
        };
        if (frame.type !== 'chat.message.appended') return [];
        return [String(frame.payload?.body ?? '')];
      } catch {
        return [];
      }
    }),
  );
}


test.beforeAll(async () => {
  await seedChatTrip();
});


test('what one traveler sends arrives on the other socket, asserted at the frame', async ({
  page,
  signIn,
}) => {
  await signIn(MEMBER);
  await page.goto(chatRoute(trip));
  await watchChatTopic(page, MEMBER, trip);

  const body = `Ferry hold until 10am ${Date.now()}`;
  const sent = await sendViaApi(ownerToken, body);
  expect(sent.status).toBe(201);

  await expect
    .poll(() => deliveredBodies(page), {
      timeout: ARRIVAL_TIMEOUT_MS,
      message:
        'the owner sent over REST; the member socket must receive the broadcast. '
        + 'The failure mode is an absent frame, not a hang — the wait is bounded.',
    })
    .toContain(body);
});


test('the delivered message renders in the thread per C1', async ({ page, signIn }) => {
  const body = `Rendered ${Date.now()}`;
  await sendViaApi(ownerToken, body);

  await signIn(MEMBER);
  await page.goto(chatRoute(trip));

  await expect(page.getByText(body, { exact: true })).toBeVisible({ timeout: ARRIVAL_TIMEOUT_MS });
});


test('a sent message persists across a reload', async ({ page, signIn }) => {
  const body = `Persisted ${Date.now()}`;
  await sendViaApi(memberToken, body);

  await signIn(OWNER);
  await page.goto(chatRoute(trip));
  await expect(page.getByText(body, { exact: true })).toBeVisible({ timeout: ARRIVAL_TIMEOUT_MS });

  await page.reload();
  await expect(page.getByText(body, { exact: true })).toBeVisible({ timeout: ARRIVAL_TIMEOUT_MS });
});


test('sending from the composer clears the field immediately and shows one bubble', async ({
  page,
  signIn,
}) => {
  await signIn(OWNER);
  await page.goto(chatRoute(trip));

  const field = labelled(page, 'Message').last();
  await expect(field).toBeVisible({ timeout: ARRIVAL_TIMEOUT_MS });

  const body = `Composed ${Date.now()}`;
  await field.fill(body);
  await labelled(page, 'Send').last().click();

  await expect(field).toHaveValue('', { timeout: ARRIVAL_TIMEOUT_MS });
  await expect(page.getByText(body, { exact: true })).toHaveCount(1, {
    timeout: ARRIVAL_TIMEOUT_MS,
  });
});


test('the composer grows as it fills and collapses back to one line once sent', async ({
  page,
  signIn,
}) => {
  await signIn(OWNER);
  await page.goto(chatRoute(trip));

  const field = labelled(page, 'Message').last();
  await expect(field).toBeVisible({ timeout: ARRIVAL_TIMEOUT_MS });

  const heightOf = async (): Promise<number> => (await field.boundingBox())?.height ?? 0;

  const resting = await heightOf();
  expect(resting).toBeGreaterThan(0);

  await field.fill(
    'Rico says the van fits eight plus bags. If we leave at 7 sharp we hit Nacpan by noon, '
      + 'lunch there, then the viewpoint before check-in.',
  );
  await expect
    .poll(heightOf, {
      timeout: ARRIVAL_TIMEOUT_MS,
      message: 'a multi-line draft must grow the field, or C4 growth is dead',
    })
    .toBeGreaterThan(resting);

  await labelled(page, 'Send').last().click();

  await expect
    .poll(heightOf, {
      timeout: ARRIVAL_TIMEOUT_MS,
      message:
        'sending clears the draft, so the field must collapse back to its resting one-line '
        + 'height — it once stayed tall because two measurement drivers fought each other',
    })
    .toBe(resting);
});


test('a failed send holds its place with Retry and Discard, and Retry lands it', async ({
  page,
  signIn,
}) => {
  await signIn(OWNER);
  await page.goto(chatRoute(trip));

  const field = labelled(page, 'Message').last();
  await expect(field).toBeVisible({ timeout: ARRIVAL_TIMEOUT_MS });

  let refuseOnce = true;
  await page.route('**/chat/messages', async (route) => {
    if (route.request().method() === 'POST' && refuseOnce) {
      refuseOnce = false;
      await route.abort('failed');
      return;
    }
    await route.continue();
  });

  const body = `Retried ${Date.now()}`;
  await field.fill(body);
  await labelled(page, 'Send').last().click();

  await expect(page.getByText(chatCopy.failed, { exact: true })).toBeVisible({
    timeout: ARRIVAL_TIMEOUT_MS,
  });
  await expect(labelled(page, chatCopy.discard).last()).toBeVisible();

  await labelled(page, chatCopy.retry).last().click();

  await expect(page.getByText(chatCopy.failed, { exact: true })).toHaveCount(0, {
    timeout: ARRIVAL_TIMEOUT_MS,
  });
  await expect(page.getByText(body, { exact: true })).toHaveCount(1);

  await page.unroute('**/chat/messages');
});


test('Discard removes the failed bubble and leaves the composer usable', async ({
  page,
  signIn,
}) => {
  await signIn(OWNER);
  await page.goto(chatRoute(trip));

  const field = labelled(page, 'Message').last();
  await expect(field).toBeVisible({ timeout: ARRIVAL_TIMEOUT_MS });

  await page.route('**/chat/messages', async (route) => {
    if (route.request().method() === 'POST') {
      await route.abort('failed');
      return;
    }
    await route.continue();
  });

  const body = `Discarded ${Date.now()}`;
  await field.fill(body);
  await labelled(page, 'Send').last().click();

  await expect(page.getByText(chatCopy.failed, { exact: true })).toBeVisible({
    timeout: ARRIVAL_TIMEOUT_MS,
  });
  await labelled(page, chatCopy.discard).last().click();

  await expect(page.getByText(body, { exact: true })).toHaveCount(0, {
    timeout: ARRIVAL_TIMEOUT_MS,
  });
  await expect(page.getByText(chatCopy.failed, { exact: true })).toHaveCount(0);

  await page.unroute('**/chat/messages');
  await expect(field).toBeEditable();
});


test('an archived trip renders the notice bar and no composer at all', async ({ page, signIn }) => {
  const archived = await api(`/v1/itineraries/${trip}/archive`, 'POST', ownerToken, {});
  expect(archived.status).toBe(200);

  try {
    await signIn(OWNER);
    await page.goto(chatRoute(trip));

    await expect(page.getByText(chatCopy.archived, { exact: true })).toBeVisible({
      timeout: ARRIVAL_TIMEOUT_MS,
    });
    await expect(labelled(page, 'Send')).toHaveCount(0);
    await expect(labelled(page, 'Message')).toHaveCount(0);
  } finally {
    await api(`/v1/itineraries/${trip}/unarchive`, 'POST', ownerToken, {});
  }
});


test('a fresh trip shows the empty state, exactly as the canvas words it', async ({
  page,
  signIn,
}) => {
  const created = await api('/v1/itineraries', 'POST', ownerToken, {
    title: stamp('Empty Chat'),
    destination: 'Coron',
    durationDays: 2,
  });
  expect(created.status).toBe(201);

  await signIn(OWNER);
  await page.goto(chatRoute(created.body.id));

  await expect(page.getByText(chatCopy.empty, { exact: true })).toBeVisible({
    timeout: ARRIVAL_TIMEOUT_MS,
  });
});


test('a published trip has no chat door, and its API send answers CHAT_CLOSED', async () => {
  await api(`/v1/itineraries/${trip}/start`, 'POST', ownerToken, {});
  await api(`/v1/itineraries/${trip}/complete`, 'POST', ownerToken, {});
  const published = await api(`/v1/itineraries/${trip}/publish`, 'POST', ownerToken, {});
  expect(published.status).toBe(200);

  try {
    const refused = await sendViaApi(ownerToken, 'While published');
    expect(refused.status).toBe(409);
    expect(refused.body.code).toBe('CHAT_CLOSED');
  } finally {
    await api(`/v1/itineraries/${trip}/unpublish`, 'POST', ownerToken, {});
  }
});
