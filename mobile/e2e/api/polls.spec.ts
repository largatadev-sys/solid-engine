import { test, expect } from '../support/fixtures';
import { api, profileFor, tokenFor } from '../support/pool';
import { requireStack } from '../support/gate';
import { IDENTITY_MAP, STRANGER_TAG, ownerTagFor } from '../support/identities';
import { SeedFailure, stamp } from '../support/seed';
import type { PollBoardResponse, PollResponse } from '../../src/types/api';

const OWNER = ownerTagFor('api/polls');
const MEMBER = IDENTITY_MAP['api/polls'].tags[1]!;
const STRANGER = STRANGER_TAG;

requireStack(OWNER);

test.describe.configure({ mode: 'serial' });

let owner: string;
let member: string;
let stranger: string;
let trip: string;
let poll: PollResponse;

const inADay = (): string => new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

const pollsUri = (): string => `/v1/itineraries/${trip}/polls`;

const board = async (as: string): Promise<PollBoardResponse> =>
  (await api(pollsUri(), 'GET', as)).body;

const ask = async (as: string, question: string, options = ['Ramen', 'Tacos']) => {
  const created = await api(pollsUri(), 'POST', as, { question, options, closesAt: inADay() });
  expect(created.status).toBe(201);
  return created.body as PollResponse;
};


test.beforeAll(async () => {
  owner = await tokenFor(OWNER);
  member = await tokenFor(MEMBER);
  stranger = await tokenFor(STRANGER);
  await profileFor(OWNER);
  await profileFor(MEMBER);
  await profileFor(STRANGER);

  const created = await api('/v1/itineraries', 'POST', owner, {
    title: stamp('Polls Trip'),
    destination: 'El Nido',
    durationDays: 2,
  });
  if (created.status !== 201) throw new SeedFailure('the polls trip', created.body);
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


test('any member starts a poll — creation is not owner-gated', async () => {
  poll = await ask(member, 'Day 2 Afternoon Activity', ['Island Hopping', 'Snorkeling', 'Beach']);

  expect(poll.status).toBe('open');
  expect(poll.options.map((option) => option.label)).toEqual([
    'Island Hopping',
    'Snorkeling',
    'Beach',
  ]);
  expect(poll.mine).toBe(true);
  expect(poll.memberCount).toBe(2);
});


test('the board carries the poll to every member, newest-first, with the denominator live', async () => {
  const older = poll.id;
  const newer = await ask(owner, stamp('Later poll'));

  const seen = await board(owner);

  expect(seen.active.map((one) => one.id)).toEqual([newer.id, older]);
  expect(seen.memberCount).toBe(2);
  expect(seen.active.every((one) => one.status === 'open')).toBe(true);
});


test('a vote is attributed on the option it names, and counted once', async () => {
  const option = poll.options[0]!;

  const voted = await api(`${pollsUri()}/${poll.id}/vote`, 'PUT', owner, { optionId: option.id });

  expect(voted.status).toBe(200);
  expect(voted.body.myVoteOptionId).toBe(option.id);
  expect(voted.body.options.map((one: { voteCount: number }) => one.voteCount)).toEqual([1, 0, 0]);
  expect(voted.body.options[0].voters.map((one: { travelerId: string }) => one.travelerId)).toEqual([
    (await api('/v1/me', 'GET', owner)).body.id,
  ]);
  expect(voted.body.votedCount).toBe(1);
});


test('re-voting MOVES the vote — INV-10 as an upsert, never a second row', async () => {
  const second = poll.options[1]!;

  const moved = await api(`${pollsUri()}/${poll.id}/vote`, 'PUT', owner, { optionId: second.id });

  expect(moved.status).toBe(200);
  expect(moved.body.options.map((one: { voteCount: number }) => one.voteCount)).toEqual([0, 1, 0]);
  expect(moved.body.votedCount).toBe(1);
  expect(moved.body.myVoteOptionId).toBe(second.id);
});


test('a stranger is masked on all five doors — not-found by CODE, never a 403', async () => {
  const option = poll.options[0]!;
  const doors = [
    await api(pollsUri(), 'GET', stranger),
    await api(pollsUri(), 'POST', stranger, {
      question: 'Theirs',
      options: ['A', 'B'],
      closesAt: inADay(),
    }),
    await api(`${pollsUri()}/${poll.id}/vote`, 'PUT', stranger, { optionId: option.id }),
    await api(`${pollsUri()}/${poll.id}/close`, 'POST', stranger, {}),
    await api(`${pollsUri()}/${poll.id}`, 'DELETE', stranger),
  ];

  expect(doors.map((one) => one.status)).toEqual([404, 404, 404, 404, 404]);
  expect(doors.map((one) => one.body?.code)).toEqual(Array(5).fill('ITINERARY_NOT_FOUND'));
});


test('every cap answers with its own name rather than a constraint violation', async () => {
  const refusals = {
    POLL_OPTION_COUNT: { question: 'Q', options: ['only one'], closesAt: inADay() },
    POLL_QUESTION_TOO_LONG: { question: 'x'.repeat(121), options: ['A', 'B'], closesAt: inADay() },
    POLL_OPTION_TOO_LONG: {
      question: 'Q',
      options: ['x'.repeat(81), 'B'],
      closesAt: inADay(),
    },
    POLL_QUESTION_MISSING: { question: '   ', options: ['A', 'B'], closesAt: inADay() },
    POLL_DEADLINE_NOT_FUTURE: {
      question: 'Q',
      options: ['A', 'B'],
      closesAt: new Date(Date.now() - 60_000).toISOString(),
    },
  };

  for (const [code, body] of Object.entries(refusals)) {
    const refused = await api(pollsUri(), 'POST', owner, body);
    expect(refused.status, code).toBe(400);
    expect(refused.body?.code).toBe(code);
  }

  const eleven = Array.from({ length: 11 }, (_unused, index) => `Option ${index}`);
  const tooMany = await api(pollsUri(), 'POST', owner, {
    question: 'Q',
    options: eleven,
    closesAt: inADay(),
  });
  expect(tooMany.status).toBe(400);
  expect(tooMany.body?.code).toBe('POLL_OPTION_COUNT');
});


test('an option from another poll is refused by its own name, not silently accepted', async () => {
  const other = await ask(owner, stamp('Other poll'));

  const crossed = await api(`${pollsUri()}/${poll.id}/vote`, 'PUT', owner, {
    optionId: other.options[0]!.id,
  });

  expect(crossed.status).toBe(404);
  expect(crossed.body?.code).toBe('POLL_OPTION_NOT_FOUND');
});


test('a plain member may not close or delete a poll they did not start', async () => {
  const owners = await ask(owner, stamp('Owners poll'));

  const closing = await api(`${pollsUri()}/${owners.id}/close`, 'POST', member, {});
  const deleting = await api(`${pollsUri()}/${owners.id}`, 'DELETE', member);

  expect(closing.status).toBe(403);
  expect(closing.body?.code).toBe('NOT_PERMITTED');
  expect(deleting.status).toBe(403);
  expect(deleting.body?.code).toBe('NOT_PERMITTED');
});


test('the creator closes early and the winner is computed, with a tie starring every leader', async () => {
  const tied = await ask(owner, stamp('Tied poll'));
  await api(`${pollsUri()}/${tied.id}/vote`, 'PUT', owner, { optionId: tied.options[0]!.id });
  await api(`${pollsUri()}/${tied.id}/vote`, 'PUT', member, { optionId: tied.options[1]!.id });

  const closed = await api(`${pollsUri()}/${tied.id}/close`, 'POST', owner, {});

  expect(closed.status).toBe(200);
  expect(closed.body.status).toBe('closed');
  expect(closed.body.winningOptionIds).toHaveLength(2);
  expect((await board(member)).completed.map((one) => one.id)).toContain(tied.id);
});


test('a zero-vote close stars nothing at all', async () => {
  const untouched = await ask(owner, stamp('Nobody voted'));

  const closed = await api(`${pollsUri()}/${untouched.id}/close`, 'POST', owner, {});

  expect(closed.body.winningOptionIds).toEqual([]);
  expect(closed.body.votedCount).toBe(0);
});


test('voting on a closed poll, and closing it twice, are both refused by name', async () => {
  const closed = (await board(owner)).completed[0]!;

  const voting = await api(`${pollsUri()}/${closed.id}/vote`, 'PUT', member, {
    optionId: closed.options[0]!.id,
  });
  const reclosing = await api(`${pollsUri()}/${closed.id}/close`, 'POST', owner, {});

  expect(voting.status).toBe(409);
  expect(voting.body?.code).toBe('POLL_CLOSED');
  expect(reclosing.status).toBe(409);
  expect(reclosing.body?.code).toBe('POLL_CLOSED');
});


test('the trip owner deletes a poll they did not start, and it goes for everyone', async () => {
  const theirs = await ask(member, stamp('Members poll'));

  const deleted = await api(`${pollsUri()}/${theirs.id}`, 'DELETE', owner);

  expect(deleted.status).toBe(204);
  expect((await board(member)).active.map((one) => one.id)).not.toContain(theirs.id);
});


test('a departing member takes their votes with them, and the denominator drops', async () => {
  const shared = await ask(owner, stamp('Departure poll'));
  await api(`${pollsUri()}/${shared.id}/vote`, 'PUT', member, {
    optionId: shared.options[0]!.id,
  });
  await api(`${pollsUri()}/${shared.id}/vote`, 'PUT', owner, { optionId: shared.options[1]!.id });

  const memberId = (await api('/v1/me', 'GET', member)).body.id;
  const removed = await api(`/v1/itineraries/${trip}/members/${memberId}`, 'DELETE', owner);
  expect(removed.status).toBe(204);

  const after = (await board(owner)).active.find((one) => one.id === shared.id)!;
  expect(after.options.map((one) => one.voteCount)).toEqual([0, 1]);
  expect(after.options[0]!.voters).toEqual([]);
  expect(after.memberCount).toBe(1);
  expect(after.votedCount).toBe(1);
});


test('an archived trip freezes poll writes for the owner and hides the board from a member', async () => {
  const archivable = await api('/v1/itineraries', 'POST', owner, {
    title: stamp('Polls archived'),
    destination: 'Coron',
    durationDays: 2,
  });
  const archivedTrip = archivable.body.id;
  const before = await api(`/v1/itineraries/${archivedTrip}/polls`, 'POST', owner, {
    question: 'Before the archive',
    options: ['A', 'B'],
    closesAt: inADay(),
  });
  expect(before.status).toBe(201);

  await api(`/v1/itineraries/${archivedTrip}/archive`, 'POST', owner, {});

  const ownerReads = await api(`/v1/itineraries/${archivedTrip}/polls`, 'GET', owner);
  expect(ownerReads.status).toBe(200);
  expect(ownerReads.body.active).toHaveLength(1);

  const ownerWrites = await api(`/v1/itineraries/${archivedTrip}/polls`, 'POST', owner, {
    question: 'After',
    options: ['A', 'B'],
    closesAt: inADay(),
  });
  expect(ownerWrites.status).toBe(409);
  expect(ownerWrites.body?.code).toBe('TRIP_ARCHIVED');

  const strangerReads = await api(`/v1/itineraries/${archivedTrip}/polls`, 'GET', member);
  expect(strangerReads.status).toBe(404);
});
