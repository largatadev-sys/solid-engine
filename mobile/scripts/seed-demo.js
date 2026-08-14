const https = require('https');
const http = require('http');
const { precompleteProfile } = require('./precomplete-profile');

const API = process.env.LARGATA_API_BASE_URL || 'http://localhost:8080';
const KEY = process.env.EXPO_PUBLIC_FIREBASE_API_KEY;
const BASE = process.env.LARGATA_TEST_POOL_EMAIL_BASE;
const PASSWORD = process.env.LARGATA_TEST_POOL_PASSWORD;

function request(lib, url, method, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const data = body === undefined ? undefined : JSON.stringify(body);
    const options = { method, headers: { ...headers } };
    if (data !== undefined) {
      options.headers['Content-Type'] = 'application/json';
      options.headers['Content-Length'] = Buffer.byteLength(data);
    }
    const req = lib.request(new URL(url), options, (res) => {
      let b = '';
      res.on('data', (c) => (b += c));
      res.on('end', () => {
        let parsed;
        try { parsed = b ? JSON.parse(b) : undefined; } catch { parsed = b; }
        resolve({ status: res.statusCode, body: parsed });
      });
    });
    req.on('error', reject);
    if (data !== undefined) req.write(data);
    req.end();
  });
}

const apiLib = API.startsWith('https') ? https : http;
const api = (path, method = 'GET', token, body) =>
  request(apiLib, API + path, method, body, token ? { Authorization: 'Bearer ' + token } : {});
const address = (tag) => { const [l, d] = BASE.split('@'); return `${l}+${tag}@${d}`; };

async function poolToken(tag) {
  const res = await request(https,
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${KEY}`,
    'POST', { email: address(tag), password: PASSWORD, returnSecureToken: true });
  if (res.status !== 200) throw new Error(`pool member ${tag} unavailable — run scripts/test-pool.js create`);
  return res.body.idToken;
}

const must = (res, what) => {
  if (res.status >= 400) throw new Error(`${what} failed: ${res.status} ${JSON.stringify(res.body)}`);
  return res.body;
};

const TRIPS = [
  {
    title: 'Island Hopping in El Nido',
    destinations: ['Palawan'],
    description: "Four islands, one lagoon you will not stop talking about, and the best grilled fish of your life.",
    bestTimeOfYear: 'Dec – Apr',
    standouts: ['Big Lagoon Kayaking', 'Secret Beach at low tide', 'Local Seafood Dinners'],
    durationDays: 3,
    lifecycle: 'complete',
    publish: 'public',
    withMember: true,
    days: [
      [
        { title: 'Airport Transfer', timeOfDay: '14:00', costAmount: '500', costCurrency: 'PHP',
          place: 'Lio Airport', description: 'A van to El Nido town proper, about 40 minutes.',
          notes: 'Book the earliest slot at 8:00 AM to avoid the large tour groups!',
          externalUrl: 'https://example.test/transfer' },
        { title: 'Sunset at Las Cabanas', costAmount: '0', costCurrency: 'PHP',
          place: 'Las Cabanas Beach', notes: 'Walk down at 4:30. The zipline queue is worst at 5.' },
      ],
      [
        { title: 'Tour A — the lagoons', timeOfDay: '08:30', costAmount: '1400', costCurrency: 'PHP',
          place: 'Corong-Corong pier', notes: 'Bring a dry bag. The boat gets wet on the way back.' },
      ],
      [
        { title: 'Nacpan Beach day', timeOfDay: '09:00', costAmount: '800', costCurrency: 'PHP',
          place: 'Nacpan', notes: 'Rent a tricycle for the day rather than paying each way.' },
      ],
    ],
  },
  {
    title: 'Hokkaido in Winter',
    destinations: ['Sapporo', 'Otaru'],
    description: 'Powder, ramen, and the quietest train ride in Japan.',
    bestTimeOfYear: 'Jan – Feb',
    standouts: ['Otaru canal at night', 'Sapporo Snow Festival'],
    durationDays: 2,
    lifecycle: 'complete',
    publish: 'private',
    withMember: false,
    days: [
      [
        { title: 'Susukino ramen alley', timeOfDay: '19:00', costAmount: '1800', costCurrency: 'JPY',
          place: 'Susukino', notes: 'Queue at Menya Saimi before 6 or expect an hour.' },
      ],
      [
        { title: 'Otaru day trip', timeOfDay: '10:00', costAmount: '1500', costCurrency: 'JPY',
          place: 'Otaru', notes: 'The canal is worth it after dark, not at noon.' },
      ],
    ],
  },
  {
    title: 'Lisbon, slowly',
    destinations: ['Lisbon'],
    description: 'No itinerary. Pastéis, trams, and a lot of walking uphill.',
    bestTimeOfYear: 'Sep – Oct',
    standouts: ['Tram 28 end to end'],
    durationDays: 2,
    lifecycle: 'active',
    publish: null,
    withMember: true,
    days: [
      [{ title: 'Alfama wander', place: 'Alfama', notes: 'Start at the top and fall downhill.' }],
      [{ title: 'Belém', timeOfDay: '10:00', place: 'Belém', notes: 'Pastéis de Belém opens at 8. Go then.' }],
    ],
  },
  {
    title: 'Someday, Patagonia',
    destinations: ['Patagonia'],
    description: null,
    bestTimeOfYear: null,
    standouts: [],
    durationDays: 0,
    lifecycle: 'draft',
    publish: null,
    withMember: false,
    days: [],
  },
];

async function main() {
  if (!KEY || !BASE || !PASSWORD) {
    console.error('Missing env — run from mobile/ with: set -a && . ./.env && set +a');
    process.exit(2);
  }
  if (!API.startsWith('http://localhost')) {
    console.error(`Refusing to seed ${API} — seed-demo is for the local stack only.`);
    process.exit(2);
  }

  const owner = await poolToken('t1');
  const member = await poolToken('t2');
  await precompleteProfile(api, owner, 't1');
  const memberProfile = await precompleteProfile(api, member, 't2');
  await precompleteProfile(api, await poolToken('t3'), 't3');

  console.log(`seeding ${API} — t1 = owner, t2 = collaborator, t3 = a stranger who joins nothing\n`);

  for (const spec of TRIPS) {
    const created = must(await api('/v1/itineraries', 'POST', owner, {
      title: spec.title,
      destinations: spec.destinations,
      ...(spec.description === null ? {} : { description: spec.description }),
      durationDays: spec.durationDays,
    }), `create ${spec.title}`);

    for (const [index, activities] of spec.days.entries()) {
      const dayId = created.days[index]?.id;
      if (dayId === undefined) continue;
      for (const activity of activities) {
        must(await api(`/v1/itineraries/${created.id}/days/${dayId}/activities`, 'POST', owner, activity),
          `activity ${activity.title}`);
      }
    }

    if (spec.standouts.length > 0 || spec.bestTimeOfYear !== null) {
      must(await api(`/v1/itineraries/${created.id}/edit-lock`, 'POST', owner, { subjectType: 'header' }),
        'header lease');
      must(await api(`/v1/itineraries/${created.id}`, 'PATCH', owner, {
        title: spec.title,
        destinations: spec.destinations,
        ...(spec.description === null ? {} : { description: spec.description }),
        standouts: spec.standouts,
        bestTimeOfYear: spec.bestTimeOfYear ?? '',
      }), 'dress the header');
      await api(`/v1/itineraries/${created.id}/edit-lock`, 'DELETE', owner, { subjectType: 'header' });
    }

    if (spec.withMember) {
      must(await api(`/v1/itineraries/${created.id}/invitations/by-handle`, 'POST', owner,
        { handle: memberProfile.handle }), 'invite t2');
      const inbox = must(await api('/v1/invitations', 'GET', member), 'inbox');
      const invite = (inbox.items ?? []).find((i) => i.itineraryId === created.id);
      must(await api(`/v1/invitations/${invite.id}/accept`, 'POST', member, {}), 'accept');
    }

    if (spec.lifecycle === 'active' || spec.lifecycle === 'complete') {
      must(await api(`/v1/itineraries/${created.id}/finish-planning`, 'POST', owner), 'finish-planning');
      must(await api(`/v1/itineraries/${created.id}/start`, 'POST', owner), 'start');
    }
    if (spec.lifecycle === 'complete') {
      must(await api(`/v1/itineraries/${created.id}/complete`, 'POST', owner), 'complete');
    }

    if (spec.publish !== null) {
      must(
        await api(`/v1/itineraries/${created.id}/publish`, 'POST', owner, { audience: spec.publish }),
        'publish',
      );
    }

    console.log(
      `  ${spec.lifecycle.padEnd(8)} ${(spec.publish ?? 'unpublished').padEnd(11)}  ` +
      `${spec.days.length} days  ${spec.withMember ? 'with t2 ' : 'solo    '}  ${created.id}  ${spec.title}`,
    );
  }

  console.log('\ndone. Trips opens on Draft, so Patagonia shows first.');
}

main().catch((e) => { console.error(e); process.exit(1); });
