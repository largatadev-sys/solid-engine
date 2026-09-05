import { test, expect } from '../support/fixtures';
import { api, profileFor, tokenFor } from '../support/pool';
import { requireStack } from '../support/gate';
import { ownerTagFor } from '../support/identities';

const FOLLOWER = ownerTagFor('api/follow');
const FOLLOWED = 't5';

requireStack(FOLLOWER);

let followerToken: string;
let followedToken: string;
let follower: { handle: string };
let followed: { handle: string };
let followerId: string;
let followedId: string;

async function idOf(token: string): Promise<string> {
  return (await api('/v1/me', 'GET', token)).body.id;
}

async function profile(handle: string, token: string) {
  const read = await api(`/v1/travelers/${handle}`, 'GET', token);
  expect(read.status).toBe(200);
  return read.body;
}

test.beforeAll(async () => {
  followerToken = await tokenFor(FOLLOWER);
  followedToken = await tokenFor(FOLLOWED);
  follower = await profileFor(FOLLOWER);
  followed = await profileFor(FOLLOWED);
  followerId = await idOf(followerToken);
  followedId = await idOf(followedToken);
});

test.beforeEach(async () => {
  await api(`/v1/travelers/${followedId}/follow`, 'DELETE', followerToken);
  await api(`/v1/travelers/${followerId}/follow`, 'DELETE', followedToken);
});


test('following moves both counts and both viewer-relative flags', async () => {
  const before = await profile(followed.handle, followerToken);

  const followed_ = await api(`/v1/travelers/${followedId}/follow`, 'POST', followerToken);
  expect(followed_.status).toBe(200);
  expect(followed_.body.state, 'a public target is followed outright').toBe('following');

  const after = await profile(followed.handle, followerToken);
  expect(after.followersCount).toBe(before.followersCount + 1);
  expect(after.followedByViewer).toBe(true);

  const mine = await profile(follower.handle, followedToken);
  expect(mine.followsViewer, 'the followed traveler sees that this viewer follows them').toBe(true);
  expect(mine.followedByViewer, 'and that they do not follow back').toBe(false);
});


test('a second follow writes nothing — the count does not drift', async () => {
  await api(`/v1/travelers/${followedId}/follow`, 'POST', followerToken);
  const once = await profile(followed.handle, followerToken);

  const again = await api(`/v1/travelers/${followedId}/follow`, 'POST', followerToken);
  expect(again.status).toBe(200);
  expect(again.body.state).toBe('following');

  const twice = await profile(followed.handle, followerToken);
  expect(twice.followersCount).toBe(once.followersCount);
});


test('unfollowing needs no prior edge and repeats harmlessly', async () => {
  const clean = await api(`/v1/travelers/${followedId}/follow`, 'DELETE', followerToken);
  expect(clean.status).toBe(204);

  await api(`/v1/travelers/${followedId}/follow`, 'POST', followerToken);
  const followed_ = await profile(followed.handle, followerToken);

  expect((await api(`/v1/travelers/${followedId}/follow`, 'DELETE', followerToken)).status).toBe(204);
  expect((await api(`/v1/travelers/${followedId}/follow`, 'DELETE', followerToken)).status).toBe(204);

  const after = await profile(followed.handle, followerToken);
  expect(after.followersCount).toBe(followed_.followersCount - 1);
  expect(after.followedByViewer).toBe(false);
});


test('a traveler cannot follow themselves', async () => {
  const refused = await api(`/v1/travelers/${followerId}/follow`, 'POST', followerToken);

  expect(refused.status).toBe(400);
  expect(refused.body.code).toBe('FOLLOW_SELF');
});


test('an unknown traveler is unfollowable, and says only that it was not found', async () => {
  const nobody = '00000000-0000-4000-8000-000000000000';
  const refused = await api(`/v1/travelers/${nobody}/follow`, 'POST', followerToken);

  expect(refused.status).toBe(404);
  expect(refused.body.code).toBe('TRAVELER_NOT_FOUND');
});


test('the lists carry the edge, addressed by handle', async () => {
  await api(`/v1/travelers/${followedId}/follow`, 'POST', followerToken);

  const followers = await api(`/v1/travelers/${followed.handle}/followers`, 'GET', followerToken);
  expect(followers.status).toBe(200);
  expect(followers.body.items.map((person: any) => person.handle)).toContain(follower.handle);

  const following = await api(`/v1/travelers/${follower.handle}/following`, 'GET', followerToken);
  expect(following.status).toBe(200);
  expect(following.body.items.map((person: any) => person.handle)).toContain(followed.handle);
});


test('an unknown handle answers the profile read\'s own 404 on both lists', async () => {
  for (const which of ['followers', 'following']) {
    const missing = await api(`/v1/travelers/nosuchtravelerhere/${which}`, 'GET', followerToken);
    expect(missing.status).toBe(404);
    expect(missing.body.code).toBe('TRAVELER_NOT_FOUND');
  }
});


test('every follow surface refuses an unauthenticated caller', async () => {
  expect((await api(`/v1/travelers/${followedId}/follow`, 'POST', '')).status).toBe(401);
  expect((await api(`/v1/travelers/${followedId}/follow`, 'DELETE', '')).status).toBe(401);
  expect((await api(`/v1/travelers/${followed.handle}/followers`, 'GET', '')).status).toBe(401);
  expect((await api(`/v1/travelers/${followed.handle}/following`, 'GET', '')).status).toBe(401);
});


test('the feed without a scope is byte-for-byte what it was before this story', async () => {
  const plain = await api('/v1/feed/postcards?limit=5', 'GET', followerToken);
  const explicitlyAll = await api('/v1/feed/postcards?limit=5&scope=all', 'GET', followerToken);

  expect(plain.status).toBe(200);
  expect(
    JSON.stringify(explicitlyAll.body),
    'any scope but "following" leaves the public feed untouched',
  ).toBe(JSON.stringify(plain.body));
});


test('the Following scope carries only postcards from travelers the viewer follows', async () => {
  await api(`/v1/travelers/${followedId}/follow`, 'DELETE', followerToken);

  const none = await api('/v1/feed/postcards?scope=following', 'GET', followerToken);
  expect(none.status).toBe(200);
  expect(none.body.items, 'following nobody means an empty lane, never the public feed').toEqual([]);

  await api(`/v1/travelers/${followedId}/follow`, 'POST', followerToken);

  const narrowed = await api('/v1/feed/postcards?scope=following', 'GET', followerToken);
  expect(narrowed.status).toBe(200);
  const authors: string[] = narrowed.body.items.map((card: any) => card.author.id);
  expect(new Set(authors).size <= 1).toBe(true);
  for (const author of authors) {
    expect(author).toBe(followedId);
  }
});


test('the search fences still hold on the people the combined screen renders', async () => {
  const subjectEmail = (await api('/v1/me', 'GET', followedToken)).body.email;

  const short = await api(`/v1/discovery/people?q=${followed.handle.slice(0, 1)}`, 'GET', followerToken);
  expect(short.body.items).toEqual([]);

  const byEmail = await api(
    `/v1/discovery/people?q=${encodeURIComponent(subjectEmail)}`,
    'GET',
    followerToken,
  );
  expect(byEmail.body.items, 'an email must never find a traveler').toEqual([]);

  const browsed = await api('/v1/discovery/people', 'GET', followerToken);
  expect(browsed.body.items, 'no query never enumerates the traveler list').toEqual([]);
});
