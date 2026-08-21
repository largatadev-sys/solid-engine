import { test, expect } from '../support/fixtures';
import { api, profileFor, tokenFor } from '../support/pool';
import { requireStack } from '../support/gate';
import { IDENTITY_MAP, STRANGER_TAG, ownerTagFor } from '../support/identities';
import { SeedFailure, stamp } from '../support/seed';
import type { ChatMessageResponse, Page } from '../../src/types/api';

const OWNER = ownerTagFor('api/chat');
const MEMBER = IDENTITY_MAP['api/chat'].tags[1]!;
const STRANGER = STRANGER_TAG;

requireStack(OWNER);
requireStack(MEMBER);

test.describe.configure({ mode: 'serial' });

let owner: string;
let member: string;
let stranger: string;
let trip: string;

const messagesUri = (): string => `/v1/itineraries/${trip}/chat/messages`;

const send = async (as: string, body: string) => api(messagesUri(), 'POST', as, { body });

const thread = async (as: string): Promise<Page<ChatMessageResponse>> =>
  (await api(messagesUri(), 'GET', as)).body;

const act = async (action: string, as: string = owner) => {
  const moved = await api(`/v1/itineraries/${trip}/${action}`, 'POST', as, {});
  if (moved.status !== 200) throw new SeedFailure(`the ${action}`, moved.body);
};


test.beforeAll(async () => {
  owner = await tokenFor(OWNER);
  member = await tokenFor(MEMBER);
  stranger = await tokenFor(STRANGER);
  await profileFor(OWNER);
  await profileFor(MEMBER);
  await profileFor(STRANGER);

  const created = await api('/v1/itineraries', 'POST', owner, {
    title: stamp('Chat Trip'),
    destination: 'El Nido',
    durationDays: 2,
  });
  if (created.status !== 201) throw new SeedFailure('the chat trip', created.body);
  trip = created.body.id;

  const memberHandle = (await api('/v1/me', 'GET', member)).body.handle;
  const invited = await api(`/v1/itineraries/${trip}/invitations/by-handle`, 'POST', owner, {
    handle: memberHandle,
  });
  if (invited.status !== 201) throw new SeedFailure('the invitation', invited.body);
  const inbox = (await api('/v1/invitations', 'GET', member)).body.items ?? [];
  const mine = inbox.find((one: { itineraryId: string }) => one.itineraryId === trip);
  if (mine === undefined) throw new SeedFailure('the inbox invitation', inbox);
  const accepted = await api(`/v1/invitations/${mine.id}/accept`, 'POST', member, {});
  if (accepted.status !== 200) throw new SeedFailure('the accept', accepted.body);
});


test('any member sends, and every member reads the one thread', async () => {
  const sent = await send(member, 'Booked the van from Puerto Princesa.');

  expect(sent.status).toBe(201);
  expect(sent.body.body).toBe('Booked the van from Puerto Princesa.');
  expect(sent.body.author.travelerId).toBeTruthy();

  const asOwner = await thread(owner);
  expect(asOwner.items.map((item) => item.id)).toContain(sent.body.id);
});


test('the thread reads newest-first, which the client renders bottom-anchored', async () => {
  const first = await send(owner, 'First on the wire');
  const second = await send(owner, 'Second on the wire');

  const read = await thread(owner);
  const positions = read.items.map((item) => item.id);

  expect(positions.indexOf(second.body.id)).toBeLessThan(positions.indexOf(first.body.id));
});


test('a blank body and an over-cap body are both refused by name', async () => {
  expect((await send(owner, '   ')).status).toBe(400);

  const overCap = await send(owner, 'x'.repeat(2_001));
  expect(overCap.status).toBe(400);
});


test('the cap itself is accepted — 2,000 is the limit, not the first refusal', async () => {
  const atCap = await send(owner, 'x'.repeat(2_000));

  expect(atCap.status).toBe(201);
  expect(atCap.body.body).toHaveLength(2_000);
});


test('a non-member is answered not-found on both doors, never forbidden', async () => {
  expect((await send(stranger, 'Let me in')).status).toBe(404);
  expect((await api(messagesUri(), 'GET', stranger)).status).toBe(404);
});


test('publishing closes chat for the owner and the member alike', async () => {
  await act('start');
  await act('complete');
  await act('publish');

  const asOwner = await send(owner, 'Owner after publishing');
  expect(asOwner.status).toBe(409);
  expect(asOwner.body.code).toBe('CHAT_CLOSED');

  const asMember = await send(member, 'Member after publishing');
  expect(asMember.status).toBe(409);
  expect(asMember.body.code).toBe('CHAT_CLOSED');
});


test('reads stay open while published, which is what makes the unpublish path work', async () => {
  const read = await api(messagesUri(), 'GET', owner);

  expect(read.status).toBe(200);
  expect(read.body.items.length).toBeGreaterThan(0);
});


test('unpublishing reopens chat with its history intact', async () => {
  await act('unpublish');

  const before = (await thread(owner)).items.length;
  const after = await send(owner, 'After unpublishing');

  expect(after.status).toBe(201);
  expect((await thread(owner)).items).toHaveLength(before + 1);
});


test('archiving is honest to the owner and invisible to a member', async () => {
  await act('archive');

  const asOwner = await send(owner, 'Owner after archiving');
  expect(asOwner.status).toBe(409);
  expect(asOwner.body.code).toBe('TRIP_ARCHIVED');

  expect((await send(member, 'Member after archiving')).status).toBe(404);

  await act('unarchive');
});


test('an exhausted page answers a null cursor, never a page named null', async () => {
  const page = await api(`${messagesUri()}?limit=100`, 'GET', owner);

  expect(page.status).toBe(200);
  expect(page.body.nextCursor ?? null).toBeNull();
});


test('paging walks older messages and terminates', async () => {
  const firstPage = (await api(`${messagesUri()}?limit=2`, 'GET', owner)).body as Page<
    ChatMessageResponse
  >;

  expect(firstPage.items).toHaveLength(2);
  expect(firstPage.nextCursor).toBeTruthy();

  const seen = new Set(firstPage.items.map((item) => item.id));
  let cursor = firstPage.nextCursor;
  let walks = 0;

  while (cursor !== null && cursor !== undefined && walks < 50) {
    const next = (await api(`${messagesUri()}?limit=2&cursor=${cursor}`, 'GET', owner))
      .body as Page<ChatMessageResponse>;
    for (const item of next.items) {
      expect(seen.has(item.id)).toBe(false);
      seen.add(item.id);
    }
    if (next.nextCursor === cursor) throw new Error('the cursor repeated — the walk would spin');
    cursor = next.nextCursor;
    walks += 1;
  }

  expect(walks).toBeLessThan(50);
});


test('sending writes no history entry and takes no lease', async () => {
  const before = (await api(`/v1/itineraries/${trip}`, 'GET', owner)).body.planVersion;

  await send(owner, 'Chat is not a plan edit.');

  const after = (await api(`/v1/itineraries/${trip}`, 'GET', owner)).body.planVersion;
  expect(after).toBe(before);
});
