import type { Page } from '@playwright/test';

import { test, expect } from '../support/fixtures';
import { api, tokenFor } from '../support/pool';
import { requireStack } from '../support/gate';
import { ownerTagFor, type PoolTag } from '../support/identities';
import { apiURL } from '../../playwright.config';

const SENDER = ownerTagFor('web/socket-echo');
const LISTENER: PoolTag = 't2';

const ECHO_TOPIC = 'debug:echo';
const ARRIVAL_TIMEOUT_MS = 15_000;
const OPEN_TIMEOUT_MS = 10_000;

requireStack(SENDER);
requireStack(LISTENER);

type CapturedFrame = { at: number; raw: string };

declare global {
  interface Window {
    __wsFrames?: CapturedFrame[];
    __wsReady?: Promise<string>;
    __wsSend?: (frame: unknown) => void;
  }
}

async function ticketFor(tag: PoolTag): Promise<string> {
  const minted = await api('/v1/ws-ticket', 'POST', await tokenFor(tag));
  return (minted.body as { ticket: string }).ticket;
}

async function openSocket(page: Page, tag: PoolTag): Promise<void> {
  const ticket = await ticketFor(tag);

  await page.evaluate(
    async ([issued, topic, base, openTimeout]) => {
      const socket = new WebSocket(
        `${base.replace(/^http/, 'ws')}/ws?ticket=${encodeURIComponent(issued)}`,
      );
      window.__wsFrames = [];

      window.__wsReady = new Promise<string>((resolve, reject) => {
        const never = setTimeout(() => reject(new Error('socket never opened')), openTimeout);
        socket.addEventListener('message', (event) => {
          const raw = String(event.data);
          window.__wsFrames?.push({ at: Date.now(), raw });
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

      window.__wsSend = (frame: unknown) => socket.send(JSON.stringify(frame));
    },
    [ticket, ECHO_TOPIC, apiURL, OPEN_TIMEOUT_MS] as const,
  );

  await expect
    .poll(async () => page.evaluate(async () => window.__wsReady), { timeout: ARRIVAL_TIMEOUT_MS })
    .toBe('subscribed');
}

async function framesOn(page: Page): Promise<Array<{ type?: string; payload?: unknown; code?: string }>> {
  return page.evaluate(() =>
    (window.__wsFrames ?? []).flatMap((captured) => {
      try {
        return [JSON.parse(captured.raw) as Record<string, unknown>];
      } catch {
        return [];
      }
    }),
  );
}

async function echoesOn(page: Page): Promise<string[]> {
  return (await framesOn(page))
    .filter((frame) => frame.type === 'debug.echo')
    .map((frame) => String(frame.payload));
}

async function errorCodesOn(page: Page): Promise<string[]> {
  return (await framesOn(page))
    .filter((frame) => frame.code !== undefined)
    .map((frame) => String(frame.code));
}

const send = (page: Page, frame: Record<string, unknown>): Promise<void> =>
  page.evaluate((body) => window.__wsSend?.(body), frame);

test.describe('the socket delivers between two browsers', () => {
  test('what t1 sends arrives on t2 socket, asserted at the frame and never at a render', async ({
    page,
    browser,
    baseURL,
  }) => {
    const listenerContext = await browser.newContext();
    try {
      const listenerPage = await listenerContext.newPage();
      await page.goto(baseURL ?? '/');
      await listenerPage.goto(baseURL ?? '/');

      await openSocket(page, SENDER);
      await openSocket(listenerPage, LISTENER);

      const payload = `echo-${Date.now()}`;
      await send(page, { action: 'echo', payload });

      await expect
        .poll(() => echoesOn(listenerPage), {
          timeout: ARRIVAL_TIMEOUT_MS,
          message: `${SENDER} sent an echo; ${LISTENER} socket must receive it. Absent frame, not a hang.`,
        })
        .toContain(payload);
    } finally {
      await listenerContext.close();
    }
  });

  test('the sender receives its own broadcast, so delivery is not merely one-directional', async ({
    page,
    baseURL,
  }) => {
    await page.goto(baseURL ?? '/');
    await openSocket(page, SENDER);

    const payload = `self-${Date.now()}`;
    await send(page, { action: 'echo', payload });

    await expect.poll(() => echoesOn(page), { timeout: ARRIVAL_TIMEOUT_MS }).toContain(payload);
  });

  test('an unknown action answers an error frame and leaves the connection usable', async ({
    page,
    baseURL,
  }) => {
    await page.goto(baseURL ?? '/');
    await openSocket(page, SENDER);

    await send(page, { action: 'teleport' });

    await expect
      .poll(() => errorCodesOn(page), {
        timeout: ARRIVAL_TIMEOUT_MS,
        message: 'the server answers an error frame rather than ignoring the unknown action',
      })
      .toContain('UNKNOWN_ACTION');

    const payload = `after-unknown-${Date.now()}`;
    await send(page, { action: 'echo', payload });

    await expect
      .poll(() => echoesOn(page), {
        timeout: ARRIVAL_TIMEOUT_MS,
        message: 'the connection survives an unknown action; if it closed, this echo never arrives',
      })
      .toContain(payload);
  });
});
