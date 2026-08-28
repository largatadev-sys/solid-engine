import type { Page } from '@playwright/test';
import { test, expect } from '../support/fixtures';
import { requireStack } from '../support/gate';
import { ownerTagFor } from '../support/identities';
import { labelled } from '../support/screen';
import { stamp } from '../support/seed';
import { HOME_TAB_ROUTE } from '../../src/navigation/authRoutes';
import { FEED_TITLE } from '../../src/feed/feedCopy';
import { FEEDBACK_STORAGE_KEY } from '../../src/feedback/dockPosition';
import {
  DOCK_LABEL,
  DONE_LABEL,
  SEND_LABEL,
  SHEET_TITLE,
  THANK_YOU_TITLE,
  TYPE_PROBLEM_LABEL,
} from '../../src/feedback/feedbackCopy';
import { TAPS_TO_REVEAL } from '../../src/feedback/revealTaps';

const AUTHOR = ownerTagFor('web/feedback-dock');

requireStack(AUTHOR);

test.describe.configure({ mode: 'serial' });

const bubble = (page: Page) => labelled(page, DOCK_LABEL);

async function seedVisibility(page: Page, visibility: 'revealed' | 'hidden'): Promise<void> {
  await page.evaluate(
    ([key, value]) => {
      window.localStorage.setItem(key as string, JSON.stringify({ visibility: value }));
    },
    [FEEDBACK_STORAGE_KEY, visibility] as const,
  );
}

async function readVisibility(page: Page): Promise<string | null> {
  return page.evaluate((key) => {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return null;
    return (JSON.parse(raw) as { visibility?: string }).visibility ?? null;
  }, FEEDBACK_STORAGE_KEY);
}

async function dragToDismissZone(page: Page): Promise<boolean> {
  return page.evaluate((label) => {
    const discs = Array.from(document.querySelectorAll(`[aria-label="${label}" i]`)).filter(
      (node) => (node as HTMLElement).offsetParent !== null,
    );
    const disc = discs[discs.length - 1] as HTMLElement | undefined;
    if (disc === undefined) return false;

    const frame = disc.offsetParent as HTMLElement | null;
    if (frame === null) return false;
    const bounds = frame.getBoundingClientRect();
    const box = disc.getBoundingClientRect();

    const at = (target: EventTarget, type: string, x: number, y: number, buttons: number) =>
      target.dispatchEvent(
        new PointerEvent(type, {
          bubbles: true,
          cancelable: true,
          pointerId: 11,
          pointerType: 'mouse',
          clientX: x,
          clientY: y,
          button: 0,
          buttons,
        }),
      );

    at(disc, 'pointerdown', box.x + box.width / 2, box.y + box.height / 2, 1);
    at(window, 'pointerup', bounds.x + bounds.width / 2, bounds.bottom - 108, 0);
    return true;
  }, DOCK_LABEL);
}


async function openHome(page: Page): Promise<void> {
  await page.goto(HOME_TAB_ROUTE);
  await expect(page.getByText(FEED_TITLE).last()).toBeVisible();
}

test.describe('the feedback dock', () => {
  test('is absent by default, so no other walk ever meets it', async ({ page, signIn }) => {
    await signIn(AUTHOR);
    await openHome(page);

    await expect(bubble(page)).toHaveCount(0);
  });

  test('appears once the visibility is revealed', async ({ page, signIn }) => {
    await signIn(AUTHOR);
    await openHome(page);
    await seedVisibility(page, 'revealed');
    await page.reload();
    await openHome(page);

    await expect(bubble(page)).toBeVisible();
  });

  test('files a report through to the thank-you', async ({ page, signIn, signal }) => {
    await signIn(AUTHOR);
    await openHome(page);
    await seedVisibility(page, 'revealed');
    await page.reload();
    await openHome(page);

    await bubble(page).click();
    await expect(page.getByText(SHEET_TITLE).last()).toBeVisible();
    await expect(labelled(page, TYPE_PROBLEM_LABEL)).toBeVisible();

    const description = labelled(page, 'What happened?');
    await description.fill(stamp('FB-2 walk'));
    await labelled(page, SEND_LABEL).click();

    await expect(page.getByText(THANK_YOU_TITLE).last()).toBeVisible({ timeout: 15_000 });

    const posted = signal.apiRequests.filter((call) => call.url.includes('/v1/reports'));
    expect(posted.length).toBe(1);

    await labelled(page, DONE_LABEL).click();
    await expect(page.getByText(THANK_YOU_TITLE)).toHaveCount(0);
    await expect(bubble(page)).toBeVisible();
  });

  test('drag onto the dismiss zone hides it and persists that', async ({ page, signIn }) => {
    await signIn(AUTHOR);
    await openHome(page);
    await seedVisibility(page, 'revealed');
    await page.reload();
    await openHome(page);

    const disc = bubble(page);
    await expect(disc).toBeVisible();

    const dragged = await dragToDismissZone(page);
    expect(dragged).toBe(true);

    await expect(disc).toHaveCount(0);
    expect(await readVisibility(page)).toBe('hidden');
  });

  test('five taps on the wordmark bring it back', async ({ page, signIn }) => {
    await signIn(AUTHOR);
    await openHome(page);
    await seedVisibility(page, 'hidden');
    await page.reload();
    await openHome(page);

    await expect(bubble(page)).toHaveCount(0);

    const wordmark = page.getByText(FEED_TITLE).last();
    for (let tap = 0; tap < TAPS_TO_REVEAL; tap += 1) {
      await wordmark.click();
    }

    await expect(bubble(page)).toBeVisible();
    expect(await readVisibility(page)).toBe('revealed');
  });
});
