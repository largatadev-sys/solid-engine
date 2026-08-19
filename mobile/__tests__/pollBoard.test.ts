import {
  createFormMessage,
  createFormValidity,
  deadlineMetaFor,
  defaultDeadline,
  footerActionsFor,
  markerFor,
  optionStateFor,
  boardIsWritable,
  progressFor,
  submitButtonFor,
  voteGrammarFor,
  winnerIdsOf,
} from '../src/polls/pollBoard';
import type { PollOptionResponse, PollResponse } from '../src/types/api';


function option(id: string, label: string, voteCount = 0): PollOptionResponse {
  return {
    id,
    label,
    voteCount,
    voters: Array.from({ length: voteCount }, (_unused, index) => ({
      travelerId: `${id}-voter-${index}`,
      displayName: `Voter ${index}`,
      avatarUrl: null,
      handle: null,
    })),
  };
}


function poll(overrides: Partial<PollResponse> = {}): PollResponse {
  return {
    id: 'p1',
    question: 'Day 2 Afternoon Activity',
    createdBy: 't1',
    mine: true,
    status: 'open',
    closesAt: '2026-10-24T18:00:00Z',
    closedAt: null,
    createdAt: '2026-10-23T18:00:00Z',
    options: [option('o1', 'Island Hopping Tour A', 3), option('o2', 'Snorkeling at Shimizu', 2)],
    winningOptionIds: [],
    myVoteOptionId: null,
    votedCount: 5,
    memberCount: 6,
    ...overrides,
  };
}


describe('winnerIdsOf — the star is a closed-poll mark, and only ever a computed one', () => {
  it('stars the single leader the server named', () => {
    expect(winnerIdsOf(poll({ status: 'closed', winningOptionIds: ['o1'] }))).toEqual(['o1']);
  });

  it('stars every leader on a tie, because no tiebreak rule exists', () => {
    expect(winnerIdsOf(poll({ status: 'closed', winningOptionIds: ['o1', 'o2'] }))).toEqual([
      'o1',
      'o2',
    ]);
  });

  it('stars nothing when nobody voted before the poll closed', () => {
    expect(winnerIdsOf(poll({ status: 'closed', winningOptionIds: [] }))).toEqual([]);
  });

  it('stars nothing on an OPEN poll — a leader is not a winner', () => {
    expect(winnerIdsOf(poll({ status: 'open', winningOptionIds: ['o1'] }))).toEqual([]);
  });
});


describe('progressFor — N of M voted, with M the live member count', () => {
  it('reads the counts straight off the wire and never recomputes them', () => {
    expect(progressFor(poll({ votedCount: 5, memberCount: 6 }))).toEqual({
      label: '5 of 6 voted',
      fraction: 5 / 6,
    });
  });

  it('survives a trip that has lost every member but the reader', () => {
    expect(progressFor(poll({ votedCount: 0, memberCount: 1 }))).toEqual({
      label: '0 of 1 voted',
      fraction: 0,
    });
  });

  it('refuses to divide by a denominator that has gone to zero', () => {
    expect(progressFor(poll({ votedCount: 0, memberCount: 0 })).fraction).toBe(0);
  });

  it('clamps a denominator smaller than the tally rather than overflowing the bar', () => {
    expect(progressFor(poll({ votedCount: 3, memberCount: 2 })).fraction).toBe(1);
  });
});


describe('deadlineMetaFor — the meta line under the question', () => {
  const NOW = Date.parse('2026-10-24T15:00:00Z');

  it('counts the hours down while the poll is open', () => {
    const meta = deadlineMetaFor(poll({ closesAt: '2026-10-24T18:00:00Z' }), NOW);
    expect(meta).toMatch(/^Poll closes in 3 hours · /);
  });

  it('says minutes when that is what is left, and singularises one of them', () => {
    expect(deadlineMetaFor(poll({ closesAt: '2026-10-24T15:01:00Z' }), NOW)).toMatch(
      /^Poll closes in 1 minute · /,
    );
    expect(deadlineMetaFor(poll({ closesAt: '2026-10-24T15:45:00Z' }), NOW)).toMatch(
      /^Poll closes in 45 minutes · /,
    );
  });

  it('says days once the deadline is far enough out to stop counting hours', () => {
    expect(deadlineMetaFor(poll({ closesAt: '2026-10-27T15:00:00Z' }), NOW)).toMatch(
      /^Poll closes in 3 days · /,
    );
  });

  it('reads "Poll closed" the moment the deadline passes, with no server action', () => {
    const passed = poll({ status: 'closed', closesAt: '2026-10-24T14:00:00Z' });
    expect(deadlineMetaFor(passed, NOW)).toMatch(/^Poll closed · /);
  });

  it('appends · Tie when more than one option is starred', () => {
    const tied = poll({ status: 'closed', winningOptionIds: ['o1', 'o2'] });
    expect(deadlineMetaFor(tied, NOW)).toMatch(/· Tie$/);
  });

  it('appends · No votes when the poll closed with nothing on it', () => {
    const empty = poll({
      status: 'closed',
      winningOptionIds: [],
      options: [option('o1', 'A'), option('o2', 'B')],
    });
    expect(deadlineMetaFor(empty, NOW)).toMatch(/· No votes$/);
  });

  it('renders the deadline instant in the reader’s own zone, not in UTC', () => {
    const meta = deadlineMetaFor(poll({ closesAt: '2026-10-24T18:00:00Z' }), NOW);
    const local = new Date('2026-10-24T18:00:00Z');
    expect(meta).toContain(String(local.getFullYear() === 2026 ? local.getDate() : ''));
  });
});


describe('voteGrammarFor — the two grammars of canvas frame 3', () => {
  it('is at rest with no vote and no selection', () => {
    expect(voteGrammarFor(poll(), null)).toBe('none');
  });

  it('is selecting once an option is picked but nothing is recorded yet', () => {
    expect(voteGrammarFor(poll(), 'o1')).toBe('selected');
  });

  it('is recorded when the vote is in and the selection matches it', () => {
    expect(voteGrammarFor(poll({ myVoteOptionId: 'o1' }), null)).toBe('recorded');
    expect(voteGrammarFor(poll({ myVoteOptionId: 'o1' }), 'o1')).toBe('recorded');
  });

  it('is changing when a different option is picked over a recorded vote', () => {
    expect(voteGrammarFor(poll({ myVoteOptionId: 'o1' }), 'o2')).toBe('changing');
  });

  it('is at rest on a closed poll however the traveler voted', () => {
    expect(voteGrammarFor(poll({ status: 'closed', myVoteOptionId: 'o1' }), 'o2')).toBe('none');
  });
});


describe('optionStateFor — exactly one option ever reads orange', () => {
  const voted = poll({ myVoteOptionId: 'o1' });

  it('marks the selected option amber before any vote is recorded', () => {
    expect(optionStateFor(poll(), 'o1', 'o1')).toBe('selected');
    expect(optionStateFor(poll(), 'o2', 'o1')).toBe('idle');
  });

  it('marks the recorded option with the cream grammar at rest — v2 cut the tag', () => {
    expect(optionStateFor(voted, 'o1', null)).toBe('recorded');
    expect(optionStateFor(voted, 'o2', null)).toBe('idle');
  });

  it('demotes the recorded option to grey while a different one is selected', () => {
    expect(optionStateFor(voted, 'o1', 'o2')).toBe('demoted');
    expect(optionStateFor(voted, 'o2', 'o2')).toBe('selected');
  });

  it('stays RECORDED when the traveler taps the option they already voted for', () => {
    expect(optionStateFor(voted, 'o1', 'o1')).toBe('recorded');
    expect(markerFor(voted, 'o1', 'o1')).toBe('check');
  });
  it('drops every radio grammar on a closed poll, keeping only the winner mark', () => {
    const closed = poll({ status: 'closed', myVoteOptionId: 'o1', winningOptionIds: ['o1'] });
    expect(optionStateFor(closed, 'o1', null)).toBe('idle');
  });
});


describe('markerFor — a closed card drops radios entirely, keeping only the winner star', () => {
  const closed = poll({ status: 'closed', myVoteOptionId: 'o1', winningOptionIds: ['o1'] });

  it('stars the winner and draws NOTHING beside the losers', () => {
    expect(markerFor(closed, 'o1', null)).toBe('star');
    expect(markerFor(closed, 'o2', null))
      .toBe('none');
  });

  it('draws nothing at all on a tie loser, and a star on every leader', () => {
    const tied = poll({ status: 'closed', winningOptionIds: ['o1', 'o2'] });
    expect(markerFor(tied, 'o1', null)).toBe('star');
    expect(markerFor(tied, 'o2', null)).toBe('star');
  });

  it('draws nothing anywhere on a zero-vote close', () => {
    const empty = poll({ status: 'closed', winningOptionIds: [] });
    expect(markerFor(empty, 'o1', null)).toBe('none');
  });

  it('keeps every radio grammar while the poll is open', () => {
    expect(markerFor(poll(), 'o1', null)).toBe('radio');
    expect(markerFor(poll(), 'o1', 'o1')).toBe('selected');
    expect(markerFor(poll({ myVoteOptionId: 'o1' }), 'o1', null)).toBe('check');
    expect(markerFor(poll({ myVoteOptionId: 'o1' }), 'o1', 'o2')).toBe('demotedCheck');
  });
});

describe('submitButtonFor — one button, one label, never relabeled (v2 contract)', () => {
  it('reads "Submit Vote" and nothing else, in every state that shows it', () => {
    expect(submitButtonFor(poll(), null, false)?.label).toBe('Submit Vote');
    expect(submitButtonFor(poll(), 'o1', false)?.label).toBe('Submit Vote');
    expect(submitButtonFor(poll({ myVoteOptionId: 'o1' }), 'o2', false)?.label).toBe('Submit Vote');
  });

  it('is disabled with nothing selected, and enabled once a NEW option is', () => {
    expect(submitButtonFor(poll(), null, false)).toEqual({ label: 'Submit Vote', enabled: false });
    expect(submitButtonFor(poll(), 'o1', false)).toEqual({ label: 'Submit Vote', enabled: true });
  });

  it('is enabled while changing, because the target differs from the recorded vote', () => {
    expect(submitButtonFor(poll({ myVoteOptionId: 'o1' }), 'o2', false)).toEqual({
      label: 'Submit Vote',
      enabled: true,
    });
  });

  it('HIDES once the vote is recorded and nothing new is selected — the hint shows instead', () => {
    expect(submitButtonFor(poll({ myVoteOptionId: 'o1' }), null, false)).toBeNull();
  });

  it('hides when the selection is the vote already recorded — re-submitting is not an act', () => {
    expect(submitButtonFor(poll({ myVoteOptionId: 'o1' }), 'o1', false)).toBeNull();
  });

  it('hides on a closed poll however the traveler voted', () => {
    expect(submitButtonFor(poll({ status: 'closed' }), 'o1', false)).toBeNull();
  });

  it('disables rather than hides while a vote is in flight', () => {
    expect(submitButtonFor(poll(), 'o1', true)).toEqual({ label: 'Submit Vote', enabled: false });
  });
});


describe('footerActionsFor — two inline actions, no menu of any kind (v2 contract)', () => {
  it('gives the creator both actions while the poll is open', () => {
    expect(footerActionsFor(poll({ mine: true }), false, false)).toEqual(['close', 'delete']);
  });

  it('gives the trip owner the same, on a poll they did not start', () => {
    expect(footerActionsFor(poll({ mine: false }), true, false)).toEqual(['close', 'delete']);
  });

  it('gives a plain member nothing — no footer at all', () => {
    expect(footerActionsFor(poll({ mine: false }), false, false)).toEqual([]);
  });

  it('offers Delete only once the poll has closed', () => {
    expect(footerActionsFor(poll({ status: 'closed', mine: true }), false, false)).toEqual(['delete']);
  });

  it('offers nothing on an archived trip, the owner included', () => {
    expect(footerActionsFor(poll({ mine: true }), true, true)).toEqual([]);
  });
});

describe('boardIsWritable — the board is live until the trip is archived', () => {
  it('lets every member create and vote on a live trip, not just the owner', () => {
    expect(boardIsWritable(false)).toBe(true);
  });

  it('offers no creation and no voting on an archived trip', () => {
    expect(boardIsWritable(true)).toBe(false);
  });
});


describe('createFormValidity — the Create a Poll screen', () => {
  it('refuses a blank question however many options are filled', () => {
    expect(createFormValidity('   ', ['A', 'B']).valid).toBe(false);
  });

  it('refuses fewer than two non-empty options', () => {
    expect(createFormValidity('Q', ['A', '  ']).valid).toBe(false);
    expect(createFormValidity('Q', ['A', 'B']).valid).toBe(true);
  });

  it('hides the trash while only two rows remain, and shows it at three', () => {
    expect(createFormValidity('Q', ['A', 'B']).canRemoveOption).toBe(false);
    expect(createFormValidity('Q', ['A', 'B', 'C']).canRemoveOption).toBe(true);
  });

  it('hides Add Option at ten rows', () => {
    const ten = Array.from({ length: 10 }, (_unused, index) => `Option ${index}`);
    expect(createFormValidity('Q', ten).canAddOption).toBe(false);
    expect(createFormValidity('Q', ten.slice(0, 9)).canAddOption).toBe(true);
  });

  it('refuses a question past the server’s 120-character cap before the round trip', () => {
    expect(createFormValidity('x'.repeat(121), ['A', 'B']).valid).toBe(false);
    expect(createFormValidity('x'.repeat(120), ['A', 'B']).valid).toBe(true);
  });

  it('refuses an option past the server’s 80-character cap before the round trip', () => {
    expect(createFormValidity('Q', ['x'.repeat(81), 'B']).valid).toBe(false);
    expect(createFormValidity('Q', ['x'.repeat(80), 'B']).valid).toBe(true);
  });

  it('trims what it will submit, so trailing spaces never become an option', () => {
    expect(createFormValidity('  Q  ', ['  A  ', 'B', '   ']).submittable).toEqual({
      question: 'Q',
      options: ['A', 'B'],
    });
  });
});


describe('createFormMessage — AC 8 wants a VISIBLE refusal, not a silently disabled button', () => {
  it('says nothing while the form is still empty — a blank form is not a refusal', () => {
    expect(createFormMessage('', ['', ''])).toBeNull();
  });

  it('names the two-option floor once the traveler has started typing', () => {
    expect(createFormMessage('Dinner?', ['Ramen', ''])).toBe(
      'A poll needs between 2 and 10 options.',
    );
  });

  it('names the question cap rather than truncating in silence', () => {
    expect(createFormMessage('x'.repeat(121), ['A', 'B'])).toBe(
      'A poll question is at most 120 characters.',
    );
  });

  it('names the option cap', () => {
    expect(createFormMessage('Q', ['x'.repeat(81), 'B'])).toBe(
      'A poll option is at most 80 characters.',
    );
  });

  it('says nothing at all once the form is valid', () => {
    expect(createFormMessage('Q', ['A', 'B'])).toBeNull();
  });
});

describe('defaultDeadline — the +24h the creator can move but never omit', () => {
  it('lands exactly one day after the instant it was asked for', () => {
    const now = Date.parse('2026-10-23T18:00:00Z');
    expect(defaultDeadline(now)).toBe('2026-10-24T18:00:00.000Z');
  });
});
