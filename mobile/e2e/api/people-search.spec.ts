import { test, expect } from '../support/fixtures';
import { api, profileFor, tokenFor } from '../support/pool';
import { requireStack } from '../support/gate';
import { ownerTagFor } from '../support/identities';

const VIEWER = ownerTagFor('web/people-search');
const SUBJECT = 't2';

requireStack(VIEWER);

let token: string;
let subject: { handle: string };
let viewer: { handle: string };
let subjectEmail: string;

function handlesIn(body: any): string[] {
  return (body?.items ?? []).map((person: any) => person.handle);
}

test.beforeAll(async () => {
  token = await tokenFor(VIEWER);
  subject = await profileFor(SUBJECT);
  viewer = await profileFor(VIEWER);
  subjectEmail = (await api('/v1/me', 'GET', await tokenFor(SUBJECT))).body.email;
});


test('a handle prefix finds the traveler', async () => {
  const prefix = (subject.handle ?? '').slice(0, 4);

  const found = await api(`/v1/discovery/people?q=${prefix}`, 'GET', token);

  expect(found.status).toBe(200);
  expect(handlesIn(found.body)).toContain(subject.handle);
});


test('a one-character query yields nobody — the fence is the server\'s', async () => {
  const prefix = (subject.handle ?? '').slice(0, 1);

  const found = await api(`/v1/discovery/people?q=${prefix}`, 'GET', token);

  expect(found.status).toBe(200);
  expect(handlesIn(found.body)).toEqual([]);
});


test('no query never enumerates the traveler list', async () => {
  const browsed = await api('/v1/discovery/people', 'GET', token);

  expect(browsed.status).toBe(200);
  expect(handlesIn(browsed.body)).toEqual([]);
});


test('an email-shaped query finds nobody, even when it is exactly that traveler\'s address', async () => {
  const found = await api(`/v1/discovery/people?q=${encodeURIComponent(subjectEmail)}`, 'GET', token);

  expect(found.status).toBe(200);
  expect(
    handlesIn(found.body),
    'knowing someone\'s email must never unlock their presence here',
  ).toEqual([]);
});


test('the searching traveler never appears in their own results', async () => {
  const found = await api(`/v1/discovery/people?q=${viewer.handle}`, 'GET', token);

  expect(found.status).toBe(200);
  expect(
    handlesIn(found.body),
    'an exact handle match that would otherwise rank first',
  ).not.toContain(viewer.handle);
});


test('the suggestions People group is capped at three', async () => {
  const suggested = await api('/v1/discovery/suggestions?q=la', 'GET', token);

  expect(suggested.status).toBe(200);
  expect((suggested.body.people ?? []).length).toBeLessThanOrEqual(3);
});


test('the results paginate by cursor and never repeat a person', async () => {
  const prefix = (subject.handle ?? '').slice(0, 2);
  const seen: string[] = [];
  const followed = new Set<string>();
  let cursor: string | undefined;

  for (let page = 0; page < 10; page++) {
    const query =
      `/v1/discovery/people?q=${prefix}&limit=2`
      + (cursor === undefined ? '' : `&cursor=${encodeURIComponent(cursor)}`);
    const answer = await api(query, 'GET', token);
    expect(answer.status).toBe(200);
    seen.push(...handlesIn(answer.body));

    const next = answer.body.nextCursor ?? undefined;
    if (next === undefined || followed.has(next)) break;
    followed.add(next);
    cursor = next;
  }

  expect(new Set(seen).size).toBe(seen.length);
});


test('every people read refuses an unauthenticated caller', async () => {
  for (const path of ['/v1/discovery/people?q=la', '/v1/discovery/suggestions?q=la']) {
    const refused = await api(path, 'GET', '');
    expect(refused.status).toBe(401);
  }
});
