import { test, expect } from '../support/fixtures';
import { api, profileFor, request, tokenFor, API } from '../support/pool';
import { requireStack } from '../support/gate';
import { IDENTITY_MAP, ownerTagFor } from '../support/identities';
import { climbTo, seedTrip, stamp, type SeededTrip } from '../support/seed';

const OWNER = ownerTagFor('api/join-link');
const ASKER = IDENTITY_MAP['api/join-link'].tags[1]!;
const SECOND_ASKER = IDENTITY_MAP['api/join-link'].tags[2]!;

requireStack(OWNER);

test.describe.configure({ mode: 'serial' });

let owner: string;
let asker: string;
let secondAsker: string;
let askerId: string;
let trip: SeededTrip;
let token: string;

const idOf = async (bearer: string): Promise<string> =>
  (await api('/v1/me', 'GET', bearer)).body.id;

const teaserFor = async (bearer?: string) =>
  bearer === undefined
    ? request(`${API}/v1/join/${token}`, 'GET')
    : api(`/v1/join/${token}`, 'GET', bearer);

const queue = async (): Promise<Array<{ id: string; travelerId: string }>> =>
  (await api(`/v1/itineraries/${trip.id}/join-requests`, 'GET', owner)).body.items;

const rosterIds = async (): Promise<string[]> =>
  (await api(`/v1/itineraries/${trip.id}/members`, 'GET', owner)).body.items.map(
    (row: { travelerId: string }) => row.travelerId,
  );

test.beforeAll(async () => {
  owner = await tokenFor(OWNER);
  asker = await tokenFor(ASKER);
  secondAsker = await tokenFor(SECOND_ASKER);
  await profileFor(ASKER);
  await profileFor(SECOND_ASKER);
  askerId = await idOf(asker);

  trip = await seedTrip({ ownerTag: OWNER, title: stamp('join link'), destination: 'El Nido' });
  token = (await api(`/v1/itineraries/${trip.id}/join-link`, 'GET', owner)).body.token;
});

test('the link is minted once and reused forever', async () => {
  const again = await api(`/v1/itineraries/${trip.id}/join-link`, 'GET', owner);

  expect(again.status).toBe(200);
  expect(again.body.token).toBe(token);
  expect(again.body.shareUrl).toContain(`/join/${token}`);
});

test('the shared URL carries the card version, so a re-share unfurls fresh', async () => {
  const link = await api(`/v1/itineraries/${trip.id}/join-link`, 'GET', owner);

  expect(link.body.shareUrl).toMatch(new RegExp(`/join/${token}\\?v=\\d+$`));
});

test('the teaser answers a visitor carrying no credential at all', async () => {
  const anonymous = await teaserFor();

  expect(anonymous.status).toBe(200);
  expect(anonymous.body.title).toBe(trip.title);
  expect(anonymous.body.destination).toBe('El Nido');
  expect(anonymous.body.viewerState).toBe('signedOut');
});

test('the teaser names no traveler and no plan, whoever is looking', async () => {
  const body = JSON.stringify((await teaserFor()).body);

  expect(body).not.toContain('travelerId');
  expect(body).not.toContain('handle');
  expect(body).not.toContain('days');
});

test('a garbage token is refused by its own name, not by a bare 404', async () => {
  const nonsense = await request(`${API}/v1/join/definitely-not-a-real-token`, 'GET');

  expect(nonsense.status).toBe(404);
  expect(nonsense.body?.code).toBe('JOIN_LINK_NOT_FOUND');
});

test('a signed-in stranger is told they may ask', async () => {
  expect((await teaserFor(asker)).body.viewerState).toBe('canRequest');
});

test('the owner is told they are already in', async () => {
  const seen = await teaserFor(owner);

  expect(seen.body.viewerState).toBe('member');
  expect(seen.body.itineraryId).toBe(trip.id);
});

test('asking moves the traveler to pending', async () => {
  const asked = await api(`/v1/join/${token}/request`, 'POST', asker, {});

  expect(asked.status).toBe(200);
  expect(asked.body.viewerState).toBe('pending');
  expect((await teaserFor(asker)).body.viewerState).toBe('pending');
});

test('asking twice creates no second row', async () => {
  await api(`/v1/join/${token}/request`, 'POST', asker, {});

  expect((await queue()).length).toBe(1);
});

test('a member cannot see the queue: 403 NOT_PERMITTED', async () => {
  const bystander = await tokenFor(SECOND_ASKER);
  await api(`/v1/join/${token}/request`, 'POST', bystander, {});
  const approved = (await queue()).find((row) => row.travelerId !== askerId);
  await api(
    `/v1/itineraries/${trip.id}/join-requests/${approved!.id}/approve`,
    'POST',
    owner,
    {},
  );

  const asMember = await api(`/v1/itineraries/${trip.id}/join-requests`, 'GET', secondAsker);
  expect(asMember.status).toBe(403);
  expect(asMember.body?.code).toBe('NOT_PERMITTED');
});

test('approval admits the traveler immediately — no second handshake', async () => {
  const waiting = (await queue()).find((row) => row.travelerId === askerId);
  const approved = await api(
    `/v1/itineraries/${trip.id}/join-requests/${waiting!.id}/approve`,
    'POST',
    owner,
    {},
  );

  expect(approved.status).toBe(204);
  expect(await rosterIds()).toContain(askerId);
  expect((await teaserFor(asker)).body.viewerState).toBe('member');
});

test('the approved traveler now sees the trip in their own list', async () => {
  const mine = await api('/v1/itineraries', 'GET', asker);

  expect(mine.body.items.map((row: { id: string }) => row.id)).toContain(trip.id);
});

test('answering the same request twice is refused by name', async () => {
  const spent = await api('/v1/itineraries', 'POST', owner, {
    title: stamp('join link double answer'),
    destination: 'Palawan',
  });
  const other = spent.body.id;
  const otherToken = (await api(`/v1/itineraries/${other}/join-link`, 'GET', owner)).body.token;
  await api(`/v1/join/${otherToken}/request`, 'POST', asker, {});
  const waiting = (await api(`/v1/itineraries/${other}/join-requests`, 'GET', owner)).body.items[0];

  await api(`/v1/itineraries/${other}/join-requests/${waiting.id}/decline`, 'POST', owner, {});
  const again = await api(
    `/v1/itineraries/${other}/join-requests/${waiting.id}/decline`,
    'POST',
    owner,
    {},
  );

  expect(again.status).toBe(409);
  expect(again.body?.code).toBe('ILLEGAL_STATE_TRANSITION');
});

test('a declined traveler may ask again, and the new ask is a new row', async () => {
  const fresh = await api('/v1/itineraries', 'POST', owner, {
    title: stamp('join link retry'),
    destination: 'Palawan',
  });
  const retryTrip = fresh.body.id;
  const retryToken = (await api(`/v1/itineraries/${retryTrip}/join-link`, 'GET', owner)).body.token;

  await api(`/v1/join/${retryToken}/request`, 'POST', asker, {});
  const first = (await api(`/v1/itineraries/${retryTrip}/join-requests`, 'GET', owner)).body.items[0];
  await api(`/v1/itineraries/${retryTrip}/join-requests/${first.id}/decline`, 'POST', owner, {});

  const asked = await api(`/v1/join/${retryToken}/request`, 'POST', asker, {});
  expect(asked.body.viewerState).toBe('pending');

  const second = (await api(`/v1/itineraries/${retryTrip}/join-requests`, 'GET', owner)).body.items[0];
  expect(second.id).not.toBe(first.id);
});

test('a published trip kills the link and refuses new asks', async () => {
  const frozen = await seedTrip({ ownerTag: OWNER, title: stamp('join link frozen') });
  const frozenToken = (await api(`/v1/itineraries/${frozen.id}/join-link`, 'GET', owner)).body.token;
  await climbTo(frozen, 'completed');
  await api(`/v1/itineraries/${frozen.id}/publish`, 'POST', owner, {});

  const teaser = await api(`/v1/join/${frozenToken}`, 'GET', asker);
  expect(teaser.body.viewerState).toBe('dead');
  expect(teaser.body.title).toBe(frozen.title);

  const refused = await api(`/v1/join/${frozenToken}/request`, 'POST', asker, {});
  expect(refused.status).toBe(409);
  expect(refused.body?.code).toBe('JOIN_LINK_CLOSED');
});

test('a published trip refuses to hand out its link at all', async () => {
  const frozen = await seedTrip({ ownerTag: OWNER, title: stamp('join link no handout') });
  await climbTo(frozen, 'completed');
  await api(`/v1/itineraries/${frozen.id}/publish`, 'POST', owner, {});

  const refused = await api(`/v1/itineraries/${frozen.id}/join-link`, 'GET', owner);
  expect(refused.status).toBe(409);
  expect(refused.body?.code).toBe('MEMBERSHIP_FROZEN');
});

test('a non-member is masked rather than told the trip exists', async () => {
  const someoneElsesTrip = await api('/v1/itineraries', 'POST', owner, {
    title: stamp('join link masked'),
    destination: 'Palawan',
  });

  const shut = await api(
    `/v1/itineraries/${someoneElsesTrip.body.id}/join-link`,
    'GET',
    secondAsker,
  );

  expect(shut.status).toBe(404);
  expect(shut.body?.code).toBe('ITINERARY_NOT_FOUND');
});


test('any member may read the link, not just the owner — the C1 widening', async () => {
  const shared = await api(`/v1/itineraries/${trip.id}/join-link`, 'GET', asker);

  expect(shared.status).toBe(200);
  expect(shared.body.token).toBe(token);
});


const PREVIEW = process.env.LARGATA_PREVIEW_URL ?? 'http://localhost:8081';
const CRAWLER = 'facebookexternalhit/1.1';
const BROWSER = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36';

const asAgent = async (agent: string, path: string): Promise<string> => {
  const answer = await request(`${PREVIEW}${path}`, 'GET', undefined, { 'User-Agent': agent });
  return typeof answer.body === 'string' ? answer.body : '';
};

const previewServed = async (): Promise<boolean> =>
  (await asAgent(BROWSER, '/')).includes('<div id="root">');

test.describe('the preview container routes crawlers to the per-trip card', () => {
  test.beforeAll(async () => {
    if (!(await previewServed())) {
      test.skip(
        true,
        `no preview container at ${PREVIEW} — this spec never ran; it is not a product failure`,
      );
    }
  });

  test('a crawler asking for an invite link gets THAT trip in the tags', async () => {
    const unfurled = await asAgent(CRAWLER, `/join/${token}`);

    expect(unfurled).toContain(`content="You&#39;re invited: ${trip.title}"`);
    expect(unfurled).toContain(`/v1/join/${token}/card.png`);
  });

  test('a browser asking for the same link gets the app, not the crawler stub', async () => {
    const app = await asAgent(BROWSER, `/join/${token}`);

    expect(app).toContain('<div id="root">');
    expect(app).not.toContain('You&#39;re invited:');
  });

  test('the two answers DIFFER — both are 200, so a status code proves nothing here', async () => {
    const [crawler, browser] = await Promise.all([
      asAgent(CRAWLER, `/join/${token}`),
      asAgent(BROWSER, `/join/${token}`),
    ]);

    expect(crawler).not.toBe(browser);
  });

  test('every Meta agent gets the card, not just the one that unfurls a group chat', async () => {
    const metaFamily = [
      'facebookexternalhit/1.1',
      'facebookcatalog/1.0',
      'Facebot',
      'meta-externalagent/1.1',
      'meta-externalfetcher/1.1',
    ];

    for (const agent of metaFamily) {
      expect(await asAgent(agent, `/join/${token}`)).toContain('You&#39;re invited:');
    }
  });


  test('a human inside a Meta app still gets the product, never the crawler stub', async () => {
    const inApp =
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 [FBAN/FBIOS;FBAV/450.0]';

    expect(await asAgent(inApp, `/join/${token}`)).toContain('<div id="root">');
  });


  test('a crawler on a non-join path still gets the app — the matcher is path-scoped', async () => {
    const elsewhere = await asAgent(CRAWLER, '/trips');

    expect(elsewhere).toContain('<div id="root">');
  });
});
