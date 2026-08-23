import { test, expect } from '../support/fixtures';
import { api, profileFor, request, tokenFor, API } from '../support/pool';
import { requireStack } from '../support/gate';
import { IDENTITY_MAP, ownerTagFor } from '../support/identities';
import { climbTo, seedTrip, stamp, type SeededTrip } from '../support/seed';
import { APP_HANDOFF_PARAM } from '../../src/join/handoffParam';

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

const UNFURLERS = [
  CRAWLER,
  'facebookcatalog/1.0',
  'meta-externalfetcher/1.1',
  'WhatsApp/2.23.20.0',
  'Twitterbot/1.0',
  'Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)',
  'Discordbot/2.0 (+https://discordapp.com)',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15 (Applebot/0.1; +http://www.apple.com/go/applebot)',
  'Mozilla/5.0 (compatible; SkypeUriPreview Preview/0.5; +https://www.skype.com)',
  'Mozilla/5.0 (compatible; Bluesky Cardyb/1.1; +mailto:support@bsky.app)',
  'http.rb/5.1.1 (Mastodon/4.2.1; +https://mastodon.social/)',
  'Mozilla/5.0 (compatible; redditbot/1.0; +http://www.reddit.com/feedback)',
  'curl/8.4.0',
  'python-requests/2.31.0',
];

const HUMANS = [
  BROWSER,
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 [FBAN/FBIOS;FBAV/450.0]',
  'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/450.0;]',
  'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36 Instagram 300.0.0.29.110',
];

const asAgent = async (agent: string, path: string): Promise<string> => {
  const answer = await request(`${PREVIEW}${path}`, 'GET', undefined, { 'User-Agent': agent });
  return typeof answer.body === 'string' ? answer.body : '';
};

const previewServed = async (): Promise<boolean> =>
  (await asAgent(BROWSER, '/')).includes('<div id="root">');

const HANDOFF = `?${APP_HANDOFF_PARAM}=1`;

test.describe('the preview container answers every invite link with the per-trip card', () => {
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


  test('EVERY unfurler gets it, including the ones no allowlist would have named', async () => {
    const served = await Promise.all(
      UNFURLERS.map(async (agent) => ({
        agent,
        card: (await asAgent(agent, `/join/${token}`)).includes('You&#39;re invited:'),
      })),
    );

    expect(served.filter((row) => !row.card).map((row) => row.agent)).toEqual([]);
  });


  test('an agent nobody has ever heard of gets it too — that is the point of the flip', async () => {
    const unheard = await asAgent('SomeCrawlerShippedTomorrow/9.9', `/join/${token}`);

    expect(unheard).toContain('You&#39;re invited:');
  });


  test('a human gets the same page, and it carries the hand-off rather than stranding them', async () => {
    const served = await Promise.all(
      HUMANS.map(async (agent) => {
        const page = await asAgent(agent, `/join/${token}`);
        return { agent, handed: page.includes('location.replace') && page.includes('app=1') };
      }),
    );

    expect(served.filter((row) => !row.handed).map((row) => row.agent)).toEqual([]);
  });


  test('the hand-off names the same token, so nobody is handed a different trip', async () => {
    const page = await asAgent(BROWSER, `/join/${token}`);

    expect(page).toContain(`/join/${token}`);
  });


  test('the hand-off url is EXCLUDED from the matcher, or an invite link bounces forever', async () => {
    const landed = await asAgent(BROWSER, `/join/${token}${HANDOFF}`);

    expect(landed).toContain('<div id="root">');
    expect(landed).not.toContain('You&#39;re invited:');
  });


  test('the two answers DIFFER — both are 200, so a status code proves nothing here', async () => {
    const [invite, handoff] = await Promise.all([
      asAgent(BROWSER, `/join/${token}`),
      asAgent(BROWSER, `/join/${token}${HANDOFF}`),
    ]);

    expect(invite).not.toBe(handoff);
  });


  test('a crawler on a non-join path still gets the app — the matcher is path-scoped', async () => {
    const elsewhere = await asAgent(CRAWLER, '/trips');

    expect(elsewhere).toContain('<div id="root">');
  });
});
