import { HANDLE_MIN_LENGTH, HANDLE_SEARCH_MIN_LENGTH } from '../src/identity/handleRules';
import {
  addSheetState,
  foundCardVisible,
  noOneMatchesLabel,
  isSearchable,
  normalizeHandleQuery,
  pivotVisible,
  type LookupInput,
} from '../src/members/addSheet';

function lookup(over: Partial<LookupInput> = {}): LookupInput {
  return {
    query: '@elenavargas',
    looking: false,
    found: { travelerId: 't-elena', handle: 'elenavargas' },
    notFound: false,
    memberIds: [],
    invitedIds: [],
    ...over,
  };
}

describe('the handle query', () => {
  it('reads the same handle typed with or without the @', () => {
    expect(normalizeHandleQuery('@ElenaVargas')).toBe('elenavargas');
    expect(normalizeHandleQuery('  elenavargas ')).toBe('elenavargas');
  });

  it('survives a traveler leaning on the @ key', () => {
    expect(normalizeHandleQuery('@@elena')).toBe('elena');
  });
});

describe('the add sheet state machine', () => {
  it('rests on an empty query', () => {
    expect(addSheetState(lookup({ query: '' }))).toEqual({ kind: 'idle' });
    expect(addSheetState(lookup({ query: '  @  ' }))).toEqual({ kind: 'idle' });
  });

  it('offers an invite for a traveler who is neither invited nor aboard', () => {
    expect(addSheetState(lookup())).toEqual({ kind: 'invitable', handle: 'elenavargas' });
  });

  it('ghosts the pill for somebody already invited', () => {
    expect(addSheetState(lookup({ invitedIds: ['t-elena'] }))).toEqual({
      kind: 'pending',
      handle: 'elenavargas',
    });
  });

  it('offers nothing to act on for somebody already aboard', () => {
    expect(addSheetState(lookup({ memberIds: ['t-elena'] }))).toEqual({
      kind: 'member',
      handle: 'elenavargas',
    });
  });

  it('prefers membership over a stale invitation when a row is somehow both', () => {
    expect(
      addSheetState(lookup({ memberIds: ['t-elena'], invitedIds: ['t-elena'] })).kind,
    ).toBe('member');
  });

  it('pivots to the link when the handle matches nobody', () => {
    expect(addSheetState(lookup({ found: null, notFound: true, query: '@renz' }))).toEqual({
      kind: 'noResults',
      query: 'renz',
    });
  });

  it('waits rather than declaring nobody home while the lookup is in flight', () => {
    expect(addSheetState(lookup({ looking: true, found: null })).kind).toBe('looking');
    expect(addSheetState(lookup({ found: null, notFound: false })).kind).toBe('looking');
  });

  it('falls back to the typed handle when the found traveler has none', () => {
    expect(addSheetState(lookup({ found: { travelerId: 't-x', handle: null }, query: '@renz' })))
      .toEqual({ kind: 'invitable', handle: 'renz' });
  });
});

describe('what the sheet shows', () => {
  it('shows the found card only once the lookup resolved to somebody', () => {
    expect(foundCardVisible(addSheetState(lookup()))).toBe(true);
    expect(foundCardVisible(addSheetState(lookup({ invitedIds: ['t-elena'] })))).toBe(true);
    expect(foundCardVisible(addSheetState(lookup({ memberIds: ['t-elena'] })))).toBe(true);
    expect(foundCardVisible(addSheetState(lookup({ query: '' })))).toBe(false);
    expect(foundCardVisible(addSheetState(lookup({ found: null, notFound: true })))).toBe(false);
  });

  it('promotes the link row exactly when a search dead-ends', () => {
    const noResults = addSheetState(lookup({ found: null, notFound: true }));

    expect(pivotVisible(noResults)).toBe(true);
  });

  it('leaves it unpromoted in every other state, so only the emphasis moves', () => {
    for (const state of [
      addSheetState(lookup({ query: '' })),
      addSheetState(lookup()),
      addSheetState(lookup({ looking: true, found: null })),
    ]) {
      expect(pivotVisible(state)).toBe(false);
    }
  });

  it('quotes the handle back with its @ in the empty state', () => {
    expect(noOneMatchesLabel('renz')).toBe('No one matches "@renz"');
  });
});

describe('isSearchable — the gate on an explicitly triggered lookup', () => {
  it('refuses a query no handle could ever be', () => {
    expect(isSearchable('')).toBe(false);
    expect(isSearchable('p')).toBe(false);
    expect(isSearchable('@')).toBe(false);
  });

  it('allows TWO characters, because grandfathered two-character handles exist and are '
    + 'no longer mintable — gating at the current mint minimum would make those travelers '
    + 'permanently unfindable by handle', () => {
    expect(isSearchable('ed')).toBe(true);
    expect(HANDLE_SEARCH_MIN_LENGTH).toBeLessThan(HANDLE_MIN_LENGTH);
  });

  it('allows ordinary handles', () => {
    expect(isSearchable('poo')).toBe(true);
    expect(isSearchable('pool_t3')).toBe(true);
  });

  it('judges the normalized handle, not the raw text — @ and spaces are not length', () => {
    expect(isSearchable('@e')).toBe(false);
    expect(isSearchable('  @ed  ')).toBe(true);
  });
});
