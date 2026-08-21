import { test, expect } from '../support/fixtures';
import { tokenFor } from '../support/pool';
import { requireStack } from '../support/gate';
import type { PoolTag } from '../support/identities';
import { apiURL } from '../../playwright.config';

const SENDER: PoolTag = 't1';
const LISTENER: PoolTag = 't2';

const ECHO_TOPIC = 'debug:echo';
const ARRIVAL_TIMEOUT_MS = 15_000;

requireStack(SENDER);

type CapturedFrame = { at: number; raw: string };

declare global {
  interface Window {
    __wsFrames?: CapturedFrame[];
    __wsReady?: Promise<string>;
    __wsSend?: (frame: unknown) => void;
  }
}

async function openSocket(page: import('@playwright/test').Page, tag: PoolTag): Promise<void> {
  const idToken = await tokenFor(tag);

  await page.evaluate(
    async ([token, topic, api]) => {
      const minted = await fetch(`${api}/v1/ws-ticket`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!minted.ok) throw new Error(`ticket mint failed: ${minted.status}`);
      const { ticket } = (await minted.json()) as { ticket: string };

      const url = `${api.replace(/^http/, 'ws')}/ws?ticket=${encodeURIComponent(ticket)}`;
      const socket = new WebSocket(url);
      window.__wsFrames = [];

      window.__wsReady = new Promise<string>((resolve, reject) => {
        const failed = setTimeout(() => reject(new Error('socket never opened')), 10_000);
        socket.addEventListener('message', (event) => {
          const raw = String(event.data);
          window.__wsFrames?.push({ at: Date.now(), raw });
          const frame = JSON.parse(raw) as { action?: string; topic?: string; code?: string };
          if (frame.action === 'subscribed' && frame.topic === topic) {
            clearTimeout(failed);
            resolve('subscribed');
          }
          if (frame.action === 'error') {
            clearTimeout(failed);
            reject(new Error(`server refused: ${frame.code}`));
          }
        });
        socket.addEventListener('error', () => {
          clearTimeout(failed);
          reject(new Error('socket errored before it opened'));
        });
        socket.addEventListener('open', () => {
          socket.send(JSON.stringify({ action: 'subscribe', topic }));
        });
      });

      window.__wsSend = (frame: unknown) => socket.send(JSON.stringify(frame));
    },
    [idToken, ECHO_TOPIC, apiURL] as const,
  );

  await expect
    .poll(async () => page.evaluate(async () => window.__wsReady), { timeout: ARRIVAL_TIMEOUT_MS })
    .toBe('subscribed');
}

async function echoesSeenBy(page: import('@playwright/test').Page): Promise<string[]> {
  return page.evaluate(() =>
    (window.__wsFrames ?? [])
      .map((captured) => JSON.parse(captured.raw) as { type?: string; payload?: unknown })
      .filter((frame) => frame.type === 'debug.echo')
      .map((frame) => String(frame.payload)),
  );
}

test.describe('the socket delivers between two browsers', () => {
  test('what t1 sends arrives on t2 socket, asserted at the frame and never at a render', async ({
    page,
    context,
    baseURL,
  }) => {
    const listenerPage = await context.browser()!.newContext().then((fresh) => fresh.newPage());

    await page.goto(baseURL ?? '/');
    await listenerPage.goto(baseURL ?? '/');

    await openSocket(page, SENDER);
    await openSocket(listenerPage, LISTENER);

    const payload = `echo-${Date.now()}`;
    await page.evaluate((body) => window.__wsSend?.({ action: 'echo', payload: body }), payload);

    await expect
      .poll(() => echoesSeenBy(listenerPage), {
        timeout: ARRIVAL_TIMEOUT_MS,
        message:
          't1 sent an echo and t2 socket must receive it. A connected-and-dead socket looks ' +
          'exactly like a connected one, so this asserts the captured frame rather than any ' +
          'rendered element, and the wait is bounded so the failure is an absent frame rather ' +
          'than a hang.',
      })
      .toContain(payload);

    await listenerPage.context().close();
  });

  test('the sender receives its own broadcast, so delivery is not merely one-directional', async ({
    page,
    baseURL,
  }) => {
    await page.goto(baseURL ?? '/');
    await openSocket(page, SENDER);

    const payload = `self-${Date.now()}`;
    await page.evaluate((body) => window.__wsSend?.({ action: 'echo', payload: body }), payload);

    await expect.poll(() => echoesSeenBy(page), { timeout: ARRIVAL_TIMEOUT_MS }).toContain(payload);
  });

  test('an unknown event type is ignored rather than breaking the connection', async ({
    page,
    baseURL,
  }) => {
    await page.goto(baseURL ?? '/');
    await openSocket(page, SENDER);

    await page.evaluate(() => window.__wsSend?.({ action: 'teleport' }));

    const payload = `after-unknown-${Date.now()}`;
    await page.evaluate((body) => window.__wsSend?.({ action: 'echo', payload: body }), payload);

    await expect
      .poll(() => echoesSeenBy(page), {
        timeout: ARRIVAL_TIMEOUT_MS,
        message:
          'ADR-030 says clients ignore what they do not know and the server answers an error ' +
          'frame without closing. If the connection died on the unknown action this echo never ' +
          'arrives.',
      })
      .toContain(payload);
  });
});
