import { test, expect } from '../support/fixtures';
import { api, tokenFor } from '../support/pool';
import { requireStack } from '../support/gate';
import { ownerTagFor, type PoolTag } from '../support/identities';
import { joinTrip, seedTrip, stamp, type SeededTrip } from '../support/seed';
import { exactlyLabelled, labelled } from '../support/screen';
import {
  POLLS_ACTIVE_SECTION,
  POLLS_ARCHIVED_NOTE,
  POLLS_COMPLETED_SECTION,
  POLLS_CREATE_CTA,
  POLLS_EMPTY_BODY,
  POLLS_EMPTY_TITLE,
  POLL_ADD_OPTION_LABEL,
  POLL_CHANGE_HINT,
  POLL_CLOSED_BADGE,
  POLL_CLOSE_NOW_LABEL,
  POLL_CREATE_SUBMIT_LABEL,
  POLL_DELETE_CONFIRM_LABEL,
  POLL_DELETE_KEEP_LABEL,
  POLL_DELETE_LABEL,
  POLL_OPEN_BADGE,
  POLL_OPTION_PLACEHOLDER,
  POLL_PROGRESS_LABEL,
  POLL_QUESTION_LABEL,
} from '../../src/polls/pollMessages';
import type { PollBoardResponse, PollResponse } from '../../src/types/api';

const OWNER = ownerTagFor('web/polls');
const SECOND: PoolTag = 't2';

const MAX_OPEN_POLLS = 25;

requireStack(OWNER);

let ownerToken: string;
let secondToken: string;

const pollsRoute = (id: string): string => `/itineraries/${id}?tab=polls`;

const boardOf = async (id: string, as: string = ownerToken): Promise<PollBoardResponse> =>
  (await api(`/v1/itineraries/${id}/polls`, 'GET', as)).body;

const activeOf = async (id: string, as?: string): Promise<PollResponse[]> =>
  (await boardOf(id, as)).active;

async function askViaApi(
  id: string,
  as: string,
  question: string,
  options: string[] = ['Ramen', 'Tacos'],
): Promise<PollResponse> {
  const created = await api(`/v1/itineraries/${id}/polls`, 'POST', as, {
    question,
    options,
    closesAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  });
  expect(created.status).toBe(201);
  return created.body;
}


test.beforeAll(async () => {
  ownerToken = await tokenFor(OWNER);
  secondToken = await tokenFor(SECOND);
});

test.beforeEach(async ({ signIn }) => {
  await signIn(OWNER);
});


test.describe('the board, from empty to a closed winner', () => {
  test.describe.configure({ mode: 'serial' });

  let trip: SeededTrip;
  let poll: PollResponse;

  test.beforeAll(async () => {
    trip = await seedTrip({ ownerTag: OWNER, title: stamp('Polls web'), durationDays: 2 });
    await joinTrip(trip, SECOND);
  });

  test('the Polls tab is reachable rather than refusing the tap', async ({ page, signal }) => {
    await page.goto(`/itineraries/${trip.id}`);
    await labelled(page, 'Polls').click();

    await expect(page.getByText(POLLS_EMPTY_TITLE)).toBeVisible();
    expect(signal.dialogs).toEqual([]);
  });

  test('an empty board says so, and says anyone may start a poll', async ({ page }) => {
    await page.goto(pollsRoute(trip.id));

    await expect(page.getByText(POLLS_EMPTY_TITLE)).toBeVisible();
    await expect(page.getByText(POLLS_EMPTY_BODY)).toBeVisible();
    await expect(labelled(page, POLLS_CREATE_CTA)).toBeVisible();
  });

  test('the creator walks the real create form, entering through its own affordance', async ({
    page,
  }) => {
    await page.goto(pollsRoute(trip.id));
    await labelled(page, POLLS_CREATE_CTA).click();

    await expect(labelled(page, POLL_QUESTION_LABEL)).toBeVisible();
    await labelled(page, POLL_QUESTION_LABEL).fill('Day 2 Afternoon Activity');
    await exactlyLabelled(page, `${POLL_OPTION_PLACEHOLDER} 1`).fill('Island Hopping Tour A');
    await exactlyLabelled(page, `${POLL_OPTION_PLACEHOLDER} 2`).fill('Snorkeling at Shimizu');
    await labelled(page, POLL_ADD_OPTION_LABEL).click();
    await exactlyLabelled(page, `${POLL_OPTION_PLACEHOLDER} 3`).fill('Beach Rest Day');
    await labelled(page, POLL_CREATE_SUBMIT_LABEL).click();

    await expect.poll(async () => (await activeOf(trip.id)).length, { timeout: 20_000 }).toBe(1);
    poll = (await activeOf(trip.id))[0] as PollResponse;
    expect(poll.question).toBe('Day 2 Afternoon Activity');
    expect(poll.options.map((option) => option.label)).toEqual([
      'Island Hopping Tour A',
      'Snorkeling at Shimizu',
      'Beach Rest Day',
    ]);
  });

  test('the new poll renders under ACTIVE POLLS with its open badge and progress', async ({
    page,
  }) => {
    await page.goto(pollsRoute(trip.id));

    await expect(page.getByText(POLLS_ACTIVE_SECTION)).toBeVisible();
    await expect(page.getByText(poll.question)).toBeVisible();
    await expect(page.getByText(POLL_OPEN_BADGE, { exact: true })).toBeVisible();
    await expect(page.getByText(POLL_PROGRESS_LABEL)).toBeVisible();
    await expect(page.getByText('0 of 2 voted')).toBeVisible();
  });

  test('selection is not a vote — Submit Vote only lands the choice on the server', async ({
    page,
  }) => {
    await page.goto(pollsRoute(trip.id));
    const first = poll.options[0] as PollResponse['options'][number];

    await labelled(page, `${first.label}, 0 votes`).click();
    expect((await activeOf(trip.id))[0]?.myVoteOptionId ?? null).toBeNull();

    await labelled(page, 'Submit Vote').click();

    await expect
      .poll(async () => (await activeOf(trip.id))[0]?.myVoteOptionId, { timeout: 20_000 })
      .toBe(first.id);
  });

  test('the recorded vote reads back with its own grammar and no submit button', async ({
    page,
  }) => {
    await page.goto(pollsRoute(trip.id));

    await expect(page.getByText(POLL_CHANGE_HINT)).toBeVisible();
    await expect(labelled(page, 'Submit Vote')).toHaveCount(0);
    await expect(page.getByText('1 of 2 voted')).toBeVisible();
  });

  test('the second traveler sees the first one’s vote attributed BEFORE voting', async ({
    page,
    signIn,
  }) => {
    await signIn(SECOND);
    await page.goto(pollsRoute(trip.id));
    const first = poll.options[0] as PollResponse['options'][number];

    await expect(labelled(page, `${first.label}, 1 votes`)).toBeVisible();
    expect((await activeOf(trip.id, secondToken))[0]?.myVoteOptionId ?? null)
      .toBeNull();
  });

  test('the second traveler votes the other option, and both votes stand', async ({
    page,
    signIn,
  }) => {
    await signIn(SECOND);
    await page.goto(pollsRoute(trip.id));
    const second = poll.options[1] as PollResponse['options'][number];

    await labelled(page, `${second.label}, 0 votes`).click();
    await labelled(page, 'Submit Vote').click();

    await expect
      .poll(async () => (await activeOf(trip.id, secondToken))[0]?.votedCount, { timeout: 20_000 })
      .toBe(2);
    expect((await activeOf(trip.id, secondToken))[0]?.myVoteOptionId).toBe(second.id);
  });

  test('changing a vote MOVES it — the CTA names the target, and no count is added', async ({
    page,
    signIn,
  }) => {
    await signIn(SECOND);
    await page.goto(pollsRoute(trip.id));
    const third = poll.options[2] as PollResponse['options'][number];

    await labelled(page, `${third.label}, 0 votes`).click();
    await expect(labelled(page, 'Submit Vote'))
      .toBeVisible();
    await labelled(page, 'Submit Vote').click();

    await expect
      .poll(async () => (await activeOf(trip.id, secondToken))[0]?.myVoteOptionId, {
        timeout: 20_000,
      })
      .toBe(third.id);
    const after = (await activeOf(trip.id, secondToken))[0] as PollResponse;
    expect(after.votedCount).toBe(2);
    expect(after.options.map((option) => option.voteCount)).toEqual([1, 0, 1]);
  });

  test('a plain member gets no footer actions on a poll they did not start', async ({ page, signIn }) => {
    await signIn(SECOND);
    await page.goto(pollsRoute(trip.id));
    await expect(page.getByText(poll.question)).toBeVisible();

    await expect(labelled(page, POLL_CLOSE_NOW_LABEL)).toHaveCount(0);
    await expect(labelled(page, POLL_DELETE_LABEL)).toHaveCount(0);
  });

  test('the creator closes early through the inline footer action, with no confirm dialog', async ({
    page,
    signal,
  }) => {
    await page.goto(pollsRoute(trip.id));
    await labelled(page, POLL_CLOSE_NOW_LABEL).click();

    await expect.poll(async () => (await boardOf(trip.id)).completed.length, { timeout: 20_000 })
      .toBe(1);
    expect(signal.dialogs).toEqual([]);
  });

  test('the closed poll moves to COMPLETED with its winner starred, radios and progress gone', async ({
    page,
  }) => {
    await page.goto(pollsRoute(trip.id));

    await expect(page.getByText(POLLS_COMPLETED_SECTION)).toBeVisible();
    await expect(page.getByText(POLL_CLOSED_BADGE, { exact: true })).toBeVisible();
    await expect(page.getByText(POLL_PROGRESS_LABEL)).toHaveCount(0);

    const closed = (await boardOf(trip.id)).completed[0] as PollResponse;
    expect(closed.status).toBe('closed');
    expect(closed.winningOptionIds.length).toBe(2);
  });

  test('voting on the closed poll is refused with its NAMED code, not a bare 4xx', async () => {
    const closed = (await boardOf(trip.id)).completed[0] as PollResponse;
    const refused = await api(
      `/v1/itineraries/${trip.id}/polls/${closed.id}/vote`,
      'PUT',
      secondToken,
      { optionId: closed.options[0]?.id },
    );

    expect(refused.status).toBe(409);
    expect(refused.body?.code).toBe('POLL_CLOSED');
  });

  test('the closed poll offers Delete only — Close Poll Now goes with the open state', async ({ page }) => {
    await page.goto(pollsRoute(trip.id));
    await expect(labelled(page, POLL_DELETE_LABEL)).toBeVisible();
    await expect(labelled(page, POLL_CLOSE_NOW_LABEL)).toHaveCount(0);
  });
});


test.describe('deleting a poll', () => {
  test.describe.configure({ mode: 'serial' });

  let trip: SeededTrip;
  let doomed: PollResponse;

  test.beforeAll(async () => {
    trip = await seedTrip({ ownerTag: OWNER, title: stamp('Polls delete'), durationDays: 2 });
    await joinTrip(trip, SECOND);
    ownerToken = await tokenFor(OWNER);
    doomed = await askViaApi(trip.id, ownerToken, 'Karaoke Night?');
    await api(`/v1/itineraries/${trip.id}/polls/${doomed.id}/vote`, 'PUT', secondToken, {
      optionId: doomed.options[0]?.id,
    });
  });

  test('delete confirms in an IN-APP dialog naming the poll and its vote count', async ({
    page,
    signal,
  }) => {
    await page.goto(pollsRoute(trip.id));
    await labelled(page, POLL_DELETE_LABEL).click();

    await expect(page.getByText('Delete this poll?')).toBeVisible();
    const body = await page.evaluate(() => document.body.innerText);
    expect(body).toContain('Karaoke Night?');
    expect(body).toMatch(/1 vote/);
    expect(body).toMatch(/gone for everyone/i);
    expect(signal.dialogs)
      .toEqual([]);
  });


  test('Keep Poll dismisses without deleting — the poll survives the dialog', async ({ page }) => {
    await labelled(page, POLL_DELETE_KEEP_LABEL).click();

    await expect(page.getByText('Delete this poll?')).toHaveCount(0);
    expect((await activeOf(trip.id)).map((one) => one.id)).toContain(doomed.id);
  });

  test('the poll and its votes are gone for everyone once confirmed', async ({ page }) => {
    await page.goto(pollsRoute(trip.id));
    await labelled(page, POLL_DELETE_LABEL).click();
    await expect(page.getByText('Delete this poll?')).toBeVisible();
    await labelled(page, POLL_DELETE_CONFIRM_LABEL).click();

    await expect
      .poll(async () => (await activeOf(trip.id, secondToken)).map((one) => one.id), {
        timeout: 20_000,
      })
      .not.toContain(doomed.id);
  });

  test('a plain member cannot delete somebody else’s poll — a named refusal, not a mask', async () => {
    const theirs = await askViaApi(trip.id, ownerToken, stamp('Owners poll'));

    const poaching = await api(
      `/v1/itineraries/${trip.id}/polls/${theirs.id}`,
      'DELETE',
      secondToken,
    );

    expect(poaching.status).toBe(403);
    expect(poaching.body?.code).toBe('NOT_PERMITTED');
  });
});


test.describe('the refusals a discriminating probe can tell apart', () => {
  let trip: SeededTrip;

  test.beforeAll(async () => {
    trip = await seedTrip({ ownerTag: OWNER, title: stamp('Polls refusals'), durationDays: 2 });
  });

  test('a non-member is MASKED on the board read — not-found, by code', async () => {
    const stranger = await tokenFor(SECOND);
    const masked = await api(`/v1/itineraries/${trip.id}/polls`, 'GET', stranger);

    expect(masked.status).toBe(404);
    expect(masked.body?.code).toBe('ITINERARY_NOT_FOUND');
  });

  test('the eleventh option is refused by its own name', async () => {
    const eleven = Array.from({ length: 11 }, (_unused, index) => `Option ${index}`);
    const refused = await api(`/v1/itineraries/${trip.id}/polls`, 'POST', ownerToken, {
      question: 'Too many',
      options: eleven,
      closesAt: new Date(Date.now() + 3_600_000).toISOString(),
    });

    expect(refused.status).toBe(400);
    expect(refused.body?.code).toBe('POLL_OPTION_COUNT');
  });

  test('a deadline in the past is refused by its own name', async () => {
    const refused = await api(`/v1/itineraries/${trip.id}/polls`, 'POST', ownerToken, {
      question: 'Yesterday',
      options: ['A', 'B'],
      closesAt: new Date(Date.now() - 60_000).toISOString(),
    });

    expect(refused.status).toBe(400);
    expect(refused.body?.code).toBe('POLL_DEADLINE_NOT_FUTURE');
  });

  test('the twenty-sixth open poll is refused by its own name', async () => {
    test.setTimeout(180_000);
    const capped = await seedTrip({ ownerTag: OWNER, title: stamp('Polls cap'), durationDays: 2 });
    for (let index = 0; index < MAX_OPEN_POLLS; index += 1) {
      await askViaApi(capped.id, ownerToken, `Poll ${index}`);
    }

    const refused = await api(`/v1/itineraries/${capped.id}/polls`, 'POST', ownerToken, {
      question: 'One too many',
      options: ['A', 'B'],
      closesAt: new Date(Date.now() + 3_600_000).toISOString(),
    });

    expect(refused.status).toBe(400);
    expect(refused.body?.code).toBe('TOO_MANY_OPEN_POLLS');
  });
});


test('an archived trip renders the board read-only for the owner', async ({ page }) => {
  const archived = await seedTrip({
    ownerTag: OWNER,
    title: stamp('Polls archived'),
    durationDays: 2,
  });
  await askViaApi(archived.id, ownerToken, 'Before the archive');
  await api(`/v1/itineraries/${archived.id}/archive`, 'POST', ownerToken, {});

  await page.goto(pollsRoute(archived.id));

  await expect(page.getByText(POLLS_ARCHIVED_NOTE)).toBeVisible();
  await expect(page.getByText('Before the archive')).toBeVisible();
  await expect(labelled(page, POLLS_CREATE_CTA)).toHaveCount(0);
  await expect(labelled(page, POLL_CLOSE_NOW_LABEL)).toHaveCount(0);
  await expect(labelled(page, POLL_DELETE_LABEL)).toHaveCount(0);
  await expect(labelled(page, 'Submit Vote')).toHaveCount(0);
});


test('every board request carries a bearer — the ANON-GET tell', async ({ page, signal }) => {
  const trip = await seedTrip({ ownerTag: OWNER, title: stamp('Polls bearer'), durationDays: 2 });
  await askViaApi(trip.id, ownerToken, 'Bearer check');

  await page.goto(pollsRoute(trip.id));
  await expect(page.getByText('Bearer check')).toBeVisible();

  const pollRequests = signal.apiRequests.filter((request) => request.url.includes('/polls'));
  expect(pollRequests.length).toBeGreaterThan(0);
  expect(pollRequests.filter((request) => request.auth === 'ANON').map((one) => one.url)).toEqual(
    [],
  );
});


test('no page or console errors across the board', async ({ page, signal }) => {
  const trip = await seedTrip({ ownerTag: OWNER, title: stamp('Polls clean'), durationDays: 2 });
  await askViaApi(trip.id, ownerToken, 'Clean render');

  await page.goto(pollsRoute(trip.id));
  await expect(page.getByText('Clean render')).toBeVisible();

  expect(signal.pageErrors).toEqual([]);
  expect(signal.consoleErrors).toEqual([]);
});
