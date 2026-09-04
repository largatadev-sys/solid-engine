import { test, expect } from '../support/fixtures';
import { api, profileFor, tokenFor } from '../support/pool';
import { requireStack } from '../support/gate';
import { ownerTagFor } from '../support/identities';
import { labelStarting } from '../support/screen';
import { FOLLOWING_LABEL, FOLLOW_LABEL, PUBLIC_PROFILE_TITLE } from '../../src/profile/publicProfileCopy';
import {
  CANCEL_REQUEST_FAILED_TOAST,
  REQUESTED_LABEL,
  requestFailedToast,
} from '../../src/profile/privateProfileCopy';

const OWNER = ownerTagFor('web/private-profile');
const STRANGER = 't3';

requireStack(OWNER);

let ownerToken: string;
let strangerToken: string;
let owner: { handle: string };
let ownerId: string;

async function idOf(token: string): Promise<string> {
  return (await api('/v1/me', 'GET', token)).body.id;
}

async function setVisibility(visibility: 'public' | 'private'): Promise<void> {
  const patched = await api('/v1/me', 'PATCH', ownerToken, { profileVisibility: visibility });
  expect(patched.body.profileVisibility).toBe(visibility);
}

async function relationOfStranger(): Promise<string> {
  return (await api(`/v1/travelers/${owner.handle}`, 'GET', strangerToken)).body.viewerRelation;
}

async function clearEdge(): Promise<void> {
  await api(`/v1/travelers/${ownerId}/follow`, 'DELETE', strangerToken);
}

test.beforeAll(async () => {
  ownerToken = await tokenFor(OWNER);
  strangerToken = await tokenFor(STRANGER);
  owner = await profileFor(OWNER);
  ownerId = await idOf(ownerToken);
});

test.beforeEach(async ({ signIn }) => {
  await clearEdge();
  await setVisibility('private');
  await signIn(STRANGER);
});

test.afterAll(async () => {
  await clearEdge();
  await setVisibility('public');
});


test('a tap on a private profile reads Requested at once, and the server agrees', async ({
  page,
  signal,
}) => {
  await page.goto(`/travelers/${owner.handle}`);
  await expect(page.getByText(PUBLIC_PROFILE_TITLE).last()).toBeVisible({ timeout: 20_000 });

  await labelStarting(page, `${FOLLOW_LABEL} `).click();

  await expect(labelStarting(page, `${REQUESTED_LABEL} `)).toBeVisible({ timeout: 10_000 });
  await expect.poll(relationOfStranger, { timeout: 10_000 }).toBe('requested');
  expect(
    signal.dialogs.filter((line) => line.startsWith('confirm:')),
    'asking to follow is as light as following',
  ).toEqual([]);
});


test('a second tap cancels the request, confirm-free, and the server forgets it', async ({
  page,
  signal,
}) => {
  await page.goto(`/travelers/${owner.handle}`);
  await labelStarting(page, `${FOLLOW_LABEL} `).click();
  await expect(labelStarting(page, `${REQUESTED_LABEL} `)).toBeVisible({ timeout: 10_000 });

  await labelStarting(page, `${REQUESTED_LABEL} `).click();

  await expect(labelStarting(page, `${FOLLOW_LABEL} `)).toBeVisible({ timeout: 10_000 });
  await expect.poll(relationOfStranger, { timeout: 10_000 }).toBe('none');
  expect(signal.dialogs.filter((line) => line.startsWith('confirm:'))).toEqual([]);
});


test('a refused request puts the pill back and names the traveler in a toast', async ({ page }) => {
  await page.goto(`/travelers/${owner.handle}`);
  await expect(page.getByText(PUBLIC_PROFILE_TITLE).last()).toBeVisible({ timeout: 20_000 });

  await page.route('**/follow', (route) =>
    route.request().method() === 'POST'
      ? route.fulfill({ status: 503, contentType: 'application/json', body: '{"code":"UNAVAILABLE"}' })
      : route.continue(),
  );

  await labelStarting(page, `${FOLLOW_LABEL} `).click();

  await expect(page.getByText(requestFailedToast(owner.handle)).last()).toBeVisible({
    timeout: 10_000,
  });
  await expect(labelStarting(page, `${FOLLOW_LABEL} `)).toBeVisible();
});


test('a refused cancel puts Requested back and says so, without naming a follow', async ({
  page,
}) => {
  await page.goto(`/travelers/${owner.handle}`);
  await labelStarting(page, `${FOLLOW_LABEL} `).click();
  await expect(labelStarting(page, `${REQUESTED_LABEL} `)).toBeVisible({ timeout: 10_000 });

  await page.route('**/follow', (route) =>
    route.request().method() === 'DELETE'
      ? route.fulfill({ status: 503, contentType: 'application/json', body: '{"code":"UNAVAILABLE"}' })
      : route.continue(),
  );

  await labelStarting(page, `${REQUESTED_LABEL} `).click();

  await expect(page.getByText(CANCEL_REQUEST_FAILED_TOAST).last()).toBeVisible({ timeout: 10_000 });
  await expect(labelStarting(page, `${REQUESTED_LABEL} `)).toBeVisible();
});


test('the same pill on a public profile still follows outright, not requests', async ({ page }) => {
  await setVisibility('public');

  await page.goto(`/travelers/${owner.handle}`);
  await expect(page.getByText(PUBLIC_PROFILE_TITLE).last()).toBeVisible({ timeout: 20_000 });

  await labelStarting(page, `${FOLLOW_LABEL} `).click();

  await expect(labelStarting(page, `${FOLLOWING_LABEL} `)).toBeVisible({ timeout: 10_000 });
  await expect.poll(relationOfStranger, { timeout: 10_000 }).toBe('following');
});
