import {
  activeFilterGroups,
  clearedOfFilters,
  differsFromDefaults,
  durationLabel,
  filtersFromParams,
  isDurationBand,
  NO_FILTERS,
  paramsFromFilters,
  queryStringOf,
  sameFilters,
  searchesFor,
  withDestination,
  withDuration,
} from '../src/discovery/discoveryFilters';
import {
  clearedRecents,
  forgetSearch,
  RECENTS_CAP,
  recentsFromStorage,
  recentsToStorage,
  rememberSearch,
} from '../src/discovery/recentSearches';
import {
  queriesFor,
  SEARCH_DEBOUNCE_MS,
  submittableQuery,
} from '../src/discovery/searchGating';


describe('filters survive a round trip through the route, so a shared search restores', () => {
  it('reads a full filter set out of route params', () => {
    expect(filtersFromParams({ q: 'Japan', destination: 'Tokyo', duration: '4-7' })).toEqual({
      query: 'Japan',
      destination: 'Tokyo',
      duration: '4-7',
    });
  });

  it('writes only the filters that are set, so a bare browse carries no noise', () => {
    expect(paramsFromFilters(NO_FILTERS)).toEqual({});
    expect(paramsFromFilters({ query: 'Japan', destination: null, duration: null })).toEqual({
      q: 'Japan',
    });
  });

  it('round-trips without losing or inventing a value', () => {
    const filters = { query: 'Kyoto temples', destination: 'Kyoto', duration: '8-14' as const };
    expect(filtersFromParams(paramsFromFilters(filters))).toEqual(filters);
  });

  it('takes the first value when expo-router hands back an array', () => {
    expect(filtersFromParams({ q: ['Japan', 'stale'] }).query).toBe('Japan');
  });

  it('treats a blank or whitespace param as absent rather than as a filter', () => {
    expect(filtersFromParams({ q: '   ', destination: '' })).toEqual(NO_FILTERS);
  });

  it('refuses a duration it does not recognise instead of passing it to the server', () => {
    expect(filtersFromParams({ duration: 'forever' }).duration).toBeNull();
    expect(isDurationBand('4-7')).toBe(true);
    expect(isDurationBand('2-5')).toBe(false);
    expect(isDurationBand(undefined)).toBe(false);
  });

  it('builds a real query string, never a fragment needing a dummy first param', () => {
    expect(queryStringOf(NO_FILTERS)).toBe('');
    expect(queryStringOf({ query: 'Japan', destination: null, duration: null })).toBe('?q=Japan');
  });
});


describe('the filter badge counts groups, not values', () => {
  it('counts nothing when the traveler has filtered nothing', () => {
    expect(activeFilterGroups(NO_FILTERS)).toBe(0);
    expect(differsFromDefaults(NO_FILTERS)).toBe(false);
  });

  it('does not count the search query — that is the query, not a filter', () => {
    expect(activeFilterGroups({ query: 'Japan', destination: null, duration: null })).toBe(0);
  });

  it('counts destination and duration as one group each', () => {
    expect(activeFilterGroups({ query: null, destination: 'Tokyo', duration: null })).toBe(1);
    expect(activeFilterGroups({ query: null, destination: 'Tokyo', duration: '1-3' })).toBe(2);
    expect(differsFromDefaults({ query: null, destination: null, duration: '1-3' })).toBe(true);
  });
});


describe('editing a draft never mutates what was applied', () => {
  it('returns a new object rather than changing the one it was given', () => {
    const applied = { query: 'Japan', destination: null, duration: null } as const;
    const edited = withDestination(applied, 'Tokyo');

    expect(applied.destination).toBeNull();
    expect(edited.destination).toBe('Tokyo');
    expect(sameFilters(applied, edited)).toBe(false);
  });

  it('clears a destination back to absent when handed a blank', () => {
    expect(withDestination({ query: null, destination: 'Tokyo', duration: null }, '  ').destination)
      .toBeNull();
  });

  it('sets and clears the duration band', () => {
    const withBand = withDuration(NO_FILTERS, '15+');
    expect(withBand.duration).toBe('15+');
    expect(withDuration(withBand, null).duration).toBeNull();
  });

  it('keeps the query when filters are cleared — Clear filters is not Clear search', () => {
    const cleared = clearedOfFilters({ query: 'Japan', destination: 'Tokyo', duration: '1-3' });

    expect(cleared.query).toBe('Japan');
    expect(cleared.destination).toBeNull();
    expect(cleared.duration).toBeNull();
  });

  it('compares filter sets by value so a redundant refetch can be skipped', () => {
    expect(sameFilters(NO_FILTERS, { query: null, destination: null, duration: null })).toBe(true);
  });
});


describe('duration bands read the way the sheet draws them', () => {
  it('labels the finite bands as day ranges', () => {
    expect(durationLabel('1-3')).toBe('1-3 days');
    expect(durationLabel('8-14')).toBe('8-14 days');
  });

  it('labels the open-ended band without inventing an upper bound', () => {
    expect(durationLabel('15+')).toBe('15+ days');
  });
});


describe('search gating keeps the server out of reach until the query is worth running', () => {
  it('waits for the minimum length the server also enforces', () => {
    expect(queriesFor('J')).toBe(false);
    expect(queriesFor('Ja')).toBe(true);
    expect(searchesFor('J')).toBe(false);
    expect(searchesFor('Ja')).toBe(true);
    expect(searchesFor(null)).toBe(false);
  });

  it('ignores surrounding whitespace when measuring', () => {
    expect(queriesFor('  J  ')).toBe(false);
    expect(submittableQuery('  Japan  ')).toBe('Japan');
    expect(submittableQuery(' J ')).toBeNull();
  });

  it('caps an overlong query rather than letting the server reject it', () => {
    expect(submittableQuery('x'.repeat(200))).toHaveLength(80);
    expect(queriesFor('x'.repeat(200))).toBe(false);
  });

  it('debounces at the interval the mock specifies', () => {
    expect(SEARCH_DEBOUNCE_MS).toBe(300);
  });

});


describe('recent searches are strings on this device, capped and deduplicated', () => {
  it('puts the newest search first', () => {
    expect(rememberSearch(['Bali'], 'Japan')).toEqual(['Japan', 'Bali']);
  });

  it('moves a repeated search to the front rather than storing it twice', () => {
    expect(rememberSearch(['Bali', 'Japan'], 'Japan')).toEqual(['Japan', 'Bali']);
  });

  it('treats case and padding as the same search', () => {
    expect(rememberSearch(['Japan'], '  japan ')).toEqual(['japan']);
  });

  it('never grows past the cap', () => {
    const many = Array.from({ length: 20 }, (_unused, index) => `search-${index}`);
    const remembered = many.reduce<string[]>((seen, query) => rememberSearch(seen, query), []);

    expect(remembered).toHaveLength(RECENTS_CAP);
    expect(remembered[0]).toBe('search-19');
  });

  it('refuses to remember an empty search', () => {
    expect(rememberSearch(['Japan'], '   ')).toEqual(['Japan']);
  });

  it('forgets one entry without disturbing the rest', () => {
    expect(forgetSearch(['Japan', 'Bali', 'Peru'], 'Bali')).toEqual(['Japan', 'Peru']);
  });

  it('clears every entry at once', () => {
    expect(clearedRecents()).toEqual([]);
  });

  it('survives a restart through storage', () => {
    const recents = ['Japan', 'Bali'];
    expect(recentsFromStorage(recentsToStorage(recents))).toEqual(recents);
  });

  it('starts empty rather than crashing on absent or corrupt storage', () => {
    expect(recentsFromStorage(null)).toEqual([]);
    expect(recentsFromStorage('not json')).toEqual([]);
    expect(recentsFromStorage('{"not":"an array"}')).toEqual([]);
    expect(recentsFromStorage('[1, 2, 3]')).toEqual([]);
  });

  it('stores strings only, so a stale recent still runs as a plain query', () => {
    const stored = recentsToStorage(['Japan']);
    expect(stored).not.toContain('id');
    expect(JSON.parse(stored)).toEqual(['Japan']);
  });
});
