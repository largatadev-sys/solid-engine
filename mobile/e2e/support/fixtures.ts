import { test as base, expect, type Page } from '@playwright/test';
import { profileFor, tokenFor } from './pool';
import { assertVerified, type PoolTag } from './identities';
import { CONFIRM_DIALOG_TESTID } from '../../src/components/confirmDestructiveMessage';

const SESSION_KEY = 'largata.web.session';

export interface WebSession {
  idToken: string;
  refreshToken: string;
  uid: string;
  expiresAt: number;
}

interface Signal {
  consoleErrors: string[];
  pageErrors: string[];
  apiRequests: Array<{ url: string; auth: 'bearer' | 'ANON' }>;
  dialogs: string[];
}

export interface LargataFixtures {
  signIn: (tag: PoolTag) => Promise<void>;
  signal: Signal;
}

export const test = base.extend<LargataFixtures>({
  signal: async ({ page }, use) => {
    const signal: Signal = { consoleErrors: [], pageErrors: [], apiRequests: [], dialogs: [] };

    page.on('console', (message) => {
      if (message.type() === 'error') signal.consoleErrors.push(message.text());
    });
    page.on('pageerror', (error) => signal.pageErrors.push(error.message));
    page.on('request', (request) => {
      const url = request.url();
      if (!url.includes('/v1/')) return;
      signal.apiRequests.push({
        url,
        auth: request.headers()['authorization'] ? 'bearer' : 'ANON',
      });
    });
    page.on('dialog', async (dialog) => {
      signal.dialogs.push(`${dialog.type()}: ${dialog.message()}`);
      await dialog.accept();
    });

    const watching = watchConfirmDialogs(page, signal);
    await use(signal);
    watching.stop();
  },

  signIn: async ({ page, baseURL }, use) => {
    const inject = async (tag: PoolTag) => {
      assertVerified(tag, 'this spec');
      const idToken = await tokenFor(tag);
      await profileFor(tag);
      await page.goto('/');
      await page.evaluate(
        ([key, token, expires]) => {
          window.localStorage.setItem(
            key as string,
            JSON.stringify({
              idToken: token,
              refreshToken: token,
              uid: 'pool',
              expiresAt: expires,
            }),
          );
        },
        [SESSION_KEY, idToken, Date.now() + 50 * 60 * 1000] as const,
      );
    };
    await use(inject);
  },
});

export { expect };


const DIALOG_POLL_MS = 60;


export async function dialogsSettled(page: Page): Promise<void> {
  await page.waitForTimeout(DIALOG_POLL_MS * 3).catch(() => undefined);
}


function watchConfirmDialogs(page: Page, signal: Signal): { stop: () => void } {
  let live = true;
  const seen = new Set<string>();

  const poll = async () => {
    while (live) {
      try {
        const dialog = page.getByTestId(CONFIRM_DIALOG_TESTID);
        if ((await dialog.count()) > 0 && (await dialog.first().isVisible())) {
          const text = (await dialog.first().innerText()).replace(/\s+/g, ' ').trim();
          if (!seen.has(text)) {
            seen.add(text);
            signal.dialogs.push(`confirm: ${text}`);
          }
          const confirm = dialog.first().getByRole('button').last();
          await confirm.click({ timeout: 2_000 });
        }
      } catch {
        // the page navigated or closed mid-poll; the next tick re-reads it
      }
      await page.waitForTimeout(DIALOG_POLL_MS).catch(() => undefined);
    }
  };

  void poll();
  return {
    stop: () => {
      live = false;
    },
  };
}

export async function settled(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle').catch(() => undefined);
}
