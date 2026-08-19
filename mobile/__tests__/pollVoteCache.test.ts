import { QueryClient } from '@tanstack/react-query';
import { castVoteInBoardCache, pollKeys } from '../src/query/pollQueries';
import type { PollBoardResponse, PollResponse } from '../src/types/api';


function poll(overrides: Partial<PollResponse> = {}): PollResponse {
  return {
    id: 'p1',
    question: 'Dinner?',
    createdBy: 't1',
    mine: true,
    status: 'open',
    closesAt: '2026-10-24T18:00:00Z',
    closedAt: null,
    createdAt: '2026-10-23T18:00:00Z',
    options: [
      { id: 'o1', label: 'Ramen', voteCount: 1, voters: [] },
      { id: 'o2', label: 'Tacos', voteCount: 0, voters: [] },
    ],
    winningOptionIds: [],
    myVoteOptionId: null,
    votedCount: 1,
    memberCount: 2,
    ...overrides,
  };
}


function boardOf(active: PollResponse[]): PollBoardResponse {
  return { active, completed: [], memberCount: 2 };
}


let client: QueryClient;

beforeEach(() => {
  client = new QueryClient();
});


describe('castVoteInBoardCache — the viewer sees their own choice land before the server answers', () => {
  it('moves only the viewer’s own vote, never a count', () => {
    client.setQueryData(pollKeys.board('trip-1'), boardOf([poll()]));

    castVoteInBoardCache(client, 'trip-1', { pollId: 'p1', optionId: 'o2' });

    const after = client.getQueryData<PollBoardResponse>(pollKeys.board('trip-1'));
    expect(after?.active[0]?.myVoteOptionId).toBe('o2');
    expect(after?.active[0]?.options.map((option) => option.voteCount))
      .toEqual([1, 0]);
    expect(after?.active[0]?.votedCount)
      .toBe(1);
  });

  it('hands back the previous board so a failed vote can be rolled back exactly', () => {
    const before = boardOf([poll()]);
    client.setQueryData(pollKeys.board('trip-1'), before);

    expect(castVoteInBoardCache(client, 'trip-1', { pollId: 'p1', optionId: 'o2' })).toBe(before);
  });

  it('declines to touch a board it has not loaded yet', () => {
    expect(castVoteInBoardCache(client, 'trip-1', { pollId: 'p1', optionId: 'o2' })).toBeUndefined();
  });

  it('declines an option that is not on the poll, rather than inventing one', () => {
    client.setQueryData(pollKeys.board('trip-1'), boardOf([poll()]));

    expect(
      castVoteInBoardCache(client, 'trip-1', { pollId: 'p1', optionId: 'ghost' }),
    ).toBeUndefined();
    expect(
      client.getQueryData<PollBoardResponse>(pollKeys.board('trip-1'))?.active[0]?.myVoteOptionId,
    ).toBeNull();
  });

  it('declines a poll that has left the active section — a closed poll takes no optimistic vote', () => {
    client.setQueryData(pollKeys.board('trip-1'), {
      active: [],
      completed: [poll({ status: 'closed' })],
      memberCount: 2,
    });

    expect(castVoteInBoardCache(client, 'trip-1', { pollId: 'p1', optionId: 'o2' })).toBeUndefined();
  });

  it('leaves every other poll on the board untouched', () => {
    const other = poll({ id: 'p2', myVoteOptionId: 'o1' });
    client.setQueryData(pollKeys.board('trip-1'), boardOf([poll(), other]));

    castVoteInBoardCache(client, 'trip-1', { pollId: 'p1', optionId: 'o2' });

    const after = client.getQueryData<PollBoardResponse>(pollKeys.board('trip-1'));
    expect(after?.active[1]).toBe(other);
  });
});
