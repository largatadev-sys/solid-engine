import type { Page, Request } from '@playwright/test';
import { test, expect } from '../support/fixtures';
import { requireStack } from '../support/gate';
import { ownerTagFor } from '../support/identities';
import { labelled } from '../support/screen';
import { stamp } from '../support/seed';
import { HOME_TAB_ROUTE } from '../../src/navigation/authRoutes';
import { FEED_TITLE } from '../../src/feed/feedCopy';
import type { DeviceContext } from '../../src/feedback/deviceContext';
import { FEEDBACK_STORAGE_KEY } from '../../src/feedback/dockPosition';
import {
  DOCK_LABEL,
  SEND_LABEL,
  SHEET_TITLE,
  THANK_YOU_TITLE,
} from '../../src/feedback/feedbackCopy';

const AUTHOR = ownerTagFor('web/report-device-context');

requireStack(AUTHOR);

type ReportPayload = DeviceContext & { platform?: string };


test.describe('the device context a real browser puts on a report', () => {
  test('names Chromium, which only the Client-Hints brands list can say, alongside an OS', async ({
    page,
    signIn,
  }) => {
    await signIn(AUTHOR);
    await page.goto(HOME_TAB_ROUTE);
    await expect(page.getByText(FEED_TITLE).last()).toBeVisible();
    await page.evaluate(
      ([key, value]) => {
        window.localStorage.setItem(key as string, JSON.stringify({ visibility: value }));
      },
      [FEEDBACK_STORAGE_KEY, 'revealed'] as const,
    );
    await page.reload();
    await expect(page.getByText(FEED_TITLE).last()).toBeVisible();

    const secure = await page.evaluate(() => window.isSecureContext);
    expect(secure, 'Client Hints needs a secure context; a bare-IP origin has none').toBe(true);

    const filed = reportPayloadOf(page);
    const refused = reportRefusalOf(page);

    await labelled(page, DOCK_LABEL).click();
    await expect(page.getByText(SHEET_TITLE).last()).toBeVisible();
    await labelled(page, 'What happened?').fill(stamp('FB-3 device context'));
    await labelled(page, SEND_LABEL).click();

    test.skip(
      await refused,
      "this caller's hourly report allowance is spent, so nothing was accepted to inspect — this "
        + 'spec never ran; it is not a product failure. Restart the backend (the bucket is in '
        + 'memory) or wait out the hour.',
    );

    await expect(page.getByText(THANK_YOU_TITLE).last()).toBeVisible({ timeout: 15_000 });

    const sent = await filed;

    expect(sent.platform).toBe('web');
    expect(sent.browser, 'the user-agent fallback names Chrome; only the brands list says Chromium')
      .toMatch(/^Chromium \d+/);
    expect(sent.os, 'an OS is captured, and the browser assertion above is what proves its source')
      .toBeDefined();
    expect(sent, 'this context reports model "", and an empty model is omitted, never sent')
      .not.toHaveProperty('deviceModel');
  });
});


function reportRefusalOf(page: Page): Promise<boolean> {
  return page
    .waitForResponse(
      (response) =>
        response.url().includes('/v1/reports') && response.request().method() === 'POST',
      { timeout: 20_000 },
    )
    .then((response) => response.status() === 429)
    .catch(() => false);
}


function reportPayloadOf(page: Page): Promise<ReportPayload> {
  return page
    .waitForRequest(
      (request: Request) => request.url().includes('/v1/reports') && request.method() === 'POST',
      { timeout: 20_000 },
    )
    .then((request) => JSON.parse(reportPartOf(request.postData() ?? '')) as ReportPayload);
}


function reportPartOf(body: string): string {
  const part = body.indexOf('name="report"');
  expect(part, 'the report part must be present in the multipart body').toBeGreaterThanOrEqual(0);
  const start = body.indexOf('\r\n\r\n', part) + 4;
  const end = body.indexOf('\r\n--', start);
  return body.slice(start, end < 0 ? undefined : end);
}
