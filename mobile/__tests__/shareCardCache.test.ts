import { QueryClient } from '@tanstack/react-query';
import {
  itineraryKeys,
  onPlanChanged,
  invalidateShareLink,
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

const cachedVersion = (client: QueryClient, itineraryId: string): string =>
  (client.getQueryData(joinKeys.link(itineraryId)) as { shareUrl: string }).shareUrl.split('?')[1]!;

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

    await invalidateShareLink(client, TRIP);

    expect(isStale(client, TRIP)).toBe(true);
  });

  it('leaves another trip alone', async () => {
    seed(client, TRIP, 1);
    seed(client, OTHER, 1);

    await invalidateShareLink(client, TRIP);

    expect(isStale(client, OTHER)).toBe(false);
  });

  it('is NOT refetched by a plan edit, which is the helper the day/activity writes use', async () => {
    seed(client, TRIP, 1);

    await onPlanChanged(client, TRIP);

    expect(isStale(client, TRIP)).toBe(false);
  });

  it('leaves the trip entity alone — its caller already wrote the authoritative response', async () => {
    client.setQueryData(itineraryKeys.one(TRIP), { id: TRIP });

    await invalidateShareLink(client, TRIP);

    expect(client.getQueryState(itineraryKeys.one(TRIP))?.isInvalidated).toBe(false);
  });


  it('keeps the stale version readable until the refetch lands, rather than blanking the button', async () => {
    seed(client, TRIP, 4);

    await invalidateShareLink(client, TRIP);

    expect(cachedVersion(client, TRIP)).toBe('v=4');
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
