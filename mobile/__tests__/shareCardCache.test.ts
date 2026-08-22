import { QueryClient } from '@tanstack/react-query';
import {
  itineraryKeys,
  onPlanChanged,
  onShareCardInputsChanged,
} from '../src/query/itineraryQueries';
import { joinKeys } from '../src/query/joinKeys';
import { joinLinkOptions } from '../src/query/joinQueries';

const TRIP = 'trip-1';
const OTHER = 'trip-2';

const MINTED = 'Ab3-_9xKq7Z';

const linkAt = (version: number) => ({
  token: MINTED,
  shareUrl: `https://largata.test/join/${MINTED}?v=${version}`,
});

const seed = (client: QueryClient, itineraryId: string, version: number): void => {
  client.setQueryData(joinKeys.link(itineraryId), linkAt(version));
};

const isStale = (client: QueryClient, itineraryId: string): boolean =>
  client.getQueryState(joinKeys.link(itineraryId))?.isInvalidated === true;


describe('the shared invite link after a card input changes', () => {
  let client: QueryClient;

  beforeEach(() => {
    client = new QueryClient();
  });

  afterEach(() => {
    client.clear();
  });

  it('is refetched, so the copy button never hands out a version the platform already cached', async () => {
    seed(client, TRIP, 1);

    await onShareCardInputsChanged(client, TRIP);

    expect(isStale(client, TRIP)).toBe(true);
  });

  it('leaves another trip alone', async () => {
    seed(client, TRIP, 1);
    seed(client, OTHER, 1);

    await onShareCardInputsChanged(client, TRIP);

    expect(isStale(client, OTHER)).toBe(false);
  });

  it('is NOT refetched for a plan edit — the server does not bump for those', async () => {
    seed(client, TRIP, 1);

    await onPlanChanged(client, TRIP);

    expect(isStale(client, TRIP)).toBe(false);
  });

  it('still invalidates the trip itself, so the two stay in step', async () => {
    client.setQueryData(itineraryKeys.one(TRIP), { id: TRIP });

    await onShareCardInputsChanged(client, TRIP);

    expect(client.getQueryState(itineraryKeys.one(TRIP))?.isInvalidated).toBe(true);
  });
});


describe('how long a cached invite link is trusted', () => {
  it('is trusted for no time at all, so opening the tab always asks the server', () => {
    expect(joinLinkOptions(TRIP).staleTime).toBe(0);
  });

  it('is never cached forever — another member editing bumps a version this device never saw', () => {
    expect(joinLinkOptions(TRIP).staleTime).not.toBe(Infinity);
  });
});
