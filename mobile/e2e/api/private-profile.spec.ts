import { test, expect } from '../support/fixtures';
import { api, profileFor, tokenFor } from '../support/pool';
import { requireStack } from '../support/gate';

import type { PoolTag } from '../support/identities';

const OWNER: PoolTag = 't1';
const FOLLOWER: PoolTag = 't2';
const STRANGER: PoolTag = 't3';
const REQUESTER: PoolTag = 't4';
const CO_TRAVELER: PoolTag = 't5';

requireStack(OWNER);

const tokens: Record<string, string> = {};
const ids: Record<string, string> = {};
const handles: Record<string, string> = {};

const EVERYONE: PoolTag[] = [OWNER, FOLLOWER, STRANGER, REQUESTER, CO_TRAVELER];

async function idOf(token: string): Promise<string> {
  return (await api('/v1/me', 'GET', token)).body.id;
}

async function setVisibility(tag: string, visibility: 'public' | 'private') {
  const patched = await api('/v1/me', 'PATCH', tokens[tag], { profileVisibility: visibility });
  expect(patched.status).toBe(200);
  expect(patched.body.profileVisibility).toBe(visibility);
}

async function profile(subject: string, viewer: string) {
  const read = await api(`/v1/travelers/${handles[subject]}`, 'GET', tokens[viewer]);
  expect(read.status).toBe(200);
  return read.body;
}

async function follow(viewer: string, subject: string) {
  return api(`/v1/travelers/${ids[subject]}/follow`, 'POST', tokens[viewer]);
}

async function unfollow(viewer: string, subject: string) {
  return api(`/v1/travelers/${ids[subject]}/follow`, 'DELETE', tokens[viewer]);
}

function fencedReadsOf(subject: string, viewer: string) {
  return [
    api(`/v1/travelers/${handles[subject]}/diary/trips`, 'GET', tokens[viewer]),
    api(`/v1/travelers/${handles[subject]}/followers`, 'GET', tokens[viewer]),
    api(`/v1/travelers/${handles[subject]}/following`, 'GET', tokens[viewer]),
  ];
}

async function expectRefused(subject: string, viewer: string) {
  for (const read of await Promise.all(fencedReadsOf(subject, viewer))) {
    expect(read.status).toBe(403);
    expect(read.body.code).toBe('PROFILE_PRIVATE');
  }
}

async function expectAdmitted(subject: string, viewer: string) {
  for (const read of await Promise.all(fencedReadsOf(subject, viewer))) {
    expect(read.status).toBe(200);
  }
}

async function clearInboxOf(tag: string) {
  const inbox = await api('/v1/me/follow-requests', 'GET', tokens[tag]);
  for (const pending of inbox.body.items ?? []) {
    await api(`/v1/me/follow-requests/${pending.traveler.id}/decline`, 'POST', tokens[tag]);
  }
}

test.describe.configure({ mode: 'serial' });

test.beforeAll(async () => {
  for (const tag of EVERYONE) {
    tokens[tag] = await tokenFor(tag);
    handles[tag] = (await profileFor(tag)).handle;
    ids[tag] = await idOf(tokens[tag]);
  }
});

test.beforeEach(async () => {
  await setVisibility(OWNER, 'public');
  await clearInboxOf(OWNER);
  for (const tag of [FOLLOWER, STRANGER, REQUESTER, CO_TRAVELER]) {
    await unfollow(tag, OWNER);
  }
  await follow(FOLLOWER, OWNER);
});

test.afterEach(async () => {
  await setVisibility(OWNER, 'public');
});

test.afterAll(async () => {
  await setVisibility(OWNER, 'public');
  await clearInboxOf(OWNER);
  for (const tag of [FOLLOWER, STRANGER, REQUESTER, CO_TRAVELER]) {
    await unfollow(tag, OWNER);
  }
});


test('a private profile still reads, and names its own state to every viewer', async () => {
  await setVisibility(OWNER, 'private');

  const seenByStranger = await profile(OWNER, STRANGER);
  expect(seenByStranger.visibility).toBe('private');
  expect(seenByStranger.viewerRelation).toBe('none');
  expect(seenByStranger.traveler.handle, 'the header renders for everyone').toBe(handles[OWNER]);
  expect(typeof seenByStranger.followersCount, 'and so do the four counts').toBe('number');

  const seenByFollower = await profile(OWNER, FOLLOWER);
  expect(seenByFollower.viewerRelation).toBe('following');
});


test('the lists and the diary tab refuse a stranger by name and admit a follower', async () => {
  await setVisibility(OWNER, 'private');

  await expectRefused(OWNER, STRANGER);
  await expectAdmitted(OWNER, FOLLOWER);
  await expectAdmitted(OWNER, OWNER);
});


test('a fifth traveler who does not follow is refused like any other non-follower', async () => {
  await setVisibility(OWNER, 'private');

  await expectRefused(OWNER, CO_TRAVELER);
});


test('the published showcase is never fenced, whoever published it', async () => {
  await setVisibility(OWNER, 'private');

  const showcase = await api(`/v1/travelers/${handles[OWNER]}/published`, 'GET', tokens[STRANGER]);
  expect(showcase.status).toBe(200);
});


test("a private owner authors nothing a stranger's Home will carry", async () => {
  await setVisibility(OWNER, 'private');

  const strangersFeed = await api('/v1/feed/postcards?limit=50', 'GET', tokens[STRANGER]);
  expect(strangersFeed.status).toBe(200);
  const authorsSeenByStranger = strangersFeed.body.items.map((card: any) => card.author.id);
  expect(authorsSeenByStranger).not.toContain(ids[OWNER]);

  const ownFeed = await api('/v1/feed/postcards?limit=50', 'GET', tokens[OWNER]);
  expect(ownFeed.status).toBe(200);
});


test('following a private profile asks, and the owner decides', async () => {
  await setVisibility(OWNER, 'private');

  const asked = await follow(REQUESTER, OWNER);
  expect(asked.status).toBe(200);
  expect(asked.body.state).toBe('requested');
  expect((await profile(OWNER, REQUESTER)).viewerRelation).toBe('requested');
  await expectRefused(OWNER, REQUESTER);

  const inbox = await api('/v1/me/follow-requests', 'GET', tokens[OWNER]);
  expect(inbox.status).toBe(200);
  expect(inbox.body.items.map((row: any) => row.traveler.handle)).toContain(handles[REQUESTER]);

  const approved = await api(
    `/v1/me/follow-requests/${ids[REQUESTER]}/approve`, 'POST', tokens[OWNER],
  );
  expect(approved.status).toBe(204);

  expect((await profile(OWNER, REQUESTER)).viewerRelation).toBe('following');
  await expectAdmitted(OWNER, REQUESTER);
});


test('a decline is silent, re-requestable, and refused a second time by name', async () => {
  await setVisibility(OWNER, 'private');
  await follow(REQUESTER, OWNER);

  expect((await api(
    `/v1/me/follow-requests/${ids[REQUESTER]}/decline`, 'POST', tokens[OWNER],
  )).status).toBe(204);

  expect((await profile(OWNER, REQUESTER)).viewerRelation).toBe('none');
  await expectRefused(OWNER, REQUESTER);

  const again = await api(
    `/v1/me/follow-requests/${ids[REQUESTER]}/decline`, 'POST', tokens[OWNER],
  );
  expect(again.status).toBe(404);
  expect(again.body.code).toBe('FOLLOW_REQUEST_NOT_FOUND');

  const asksAgain = await follow(REQUESTER, OWNER);
  expect(asksAgain.body.state, 'a decline is not a verdict').toBe('requested');
});


test('unfollowing cancels a pending request', async () => {
  await setVisibility(OWNER, 'private');
  await follow(REQUESTER, OWNER);

  expect((await unfollow(REQUESTER, OWNER)).status).toBe(204);

  expect((await profile(OWNER, REQUESTER)).viewerRelation).toBe('none');
  const inbox = await api('/v1/me/follow-requests', 'GET', tokens[OWNER]);
  expect(inbox.body.items.map((row: any) => row.traveler.handle)).not.toContain(handles[REQUESTER]);
});


test('removing a follower is silent and sends them back to none', async () => {
  await setVisibility(OWNER, 'private');
  await expectAdmitted(OWNER, FOLLOWER);

  const removed = await api(`/v1/me/followers/${ids[FOLLOWER]}`, 'DELETE', tokens[OWNER]);
  expect(removed.status).toBe(204);

  expect((await profile(OWNER, FOLLOWER)).viewerRelation).toBe('none');
  await expectRefused(OWNER, FOLLOWER);

  expect(
    (await api(`/v1/me/followers/${ids[FOLLOWER]}`, 'DELETE', tokens[OWNER])).status,
    'and it repeats harmlessly',
  ).toBe(204);
});


test('remove-follower works on a public profile too', async () => {
  const removed = await api(`/v1/me/followers/${ids[FOLLOWER]}`, 'DELETE', tokens[OWNER]);

  expect(removed.status).toBe(204);
  expect((await profile(OWNER, FOLLOWER)).viewerRelation).toBe('none');
});


test('going public approves every pending request in the same act', async () => {
  await setVisibility(OWNER, 'private');
  expect((await follow(STRANGER, OWNER)).body.state).toBe('requested');
  expect((await follow(REQUESTER, OWNER)).body.state).toBe('requested');

  await setVisibility(OWNER, 'public');

  expect((await profile(OWNER, STRANGER)).viewerRelation).toBe('following');
  expect((await profile(OWNER, REQUESTER)).viewerRelation).toBe('following');
  const inbox = await api('/v1/me/follow-requests', 'GET', tokens[OWNER]);
  expect(inbox.body.items, 'nobody who asked keeps waiting on a door that is now open').toEqual([]);
});


test('going private keeps every existing follower', async () => {
  await expectAdmitted(OWNER, FOLLOWER);

  await setVisibility(OWNER, 'private');

  await expectAdmitted(OWNER, FOLLOWER);
  expect((await profile(OWNER, FOLLOWER)).viewerRelation).toBe('following');
  await expectRefused(OWNER, STRANGER);
});


test('a public profile answers every list, so the default is untouched', async () => {
  const seen = await profile(OWNER, STRANGER);
  expect(seen.visibility).toBe('public');
  expect(seen.viewerRelation).toBe('none');

  await expectAdmitted(OWNER, STRANGER);
});
