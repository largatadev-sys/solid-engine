const https = require('https');
const http = require('http');
const { precompleteProfile } = require('./precomplete-profile');

const API = process.env.LARGATA_API_BASE_URL || 'http://localhost:8080';
const KEY = process.env.EXPO_PUBLIC_FIREBASE_API_KEY;
const BASE = process.env.LARGATA_TEST_POOL_EMAIL_BASE;
const PASSWORD = process.env.LARGATA_TEST_POOL_PASSWORD;

let pass = 0;
let fail = 0;
const check = (name, ok, detail = '') => {
  ok ? pass++ : fail++;
  console.log(`${ok ? '  ok  ' : ' FAIL '} ${name}${detail ? '  — ' + detail : ''}`);
};

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

const PROJECTION_FIELDS = [
  'id', 'title', 'destinations', 'description', 'standouts', 'bestTimeOfYear',
  'coverImageUrl', 'durationDays', 'creator', 'estimatedCost', 'days',
].sort();

const FORBIDDEN = [
  'startDate', 'endDate', 'state', 'startedAt', 'completedAt', 'archived',
  'workspaceState', 'lastEditedBy', 'lastEditedAt', 'lease', 'status', 'ownerId', 'createdAt',
];

async function main() {
  if (!KEY || !BASE || !PASSWORD) {
    console.error('Missing env — run from mobile/ with: set -a && . ./.env && set +a');
    process.exit(2);
  }
  console.log(`S4.1 publish walk against ${API}`);
  console.log('roles: t1 = owner (publishes), t2 = member, t3 = non-member consumer\n');

  const owner = await poolToken('t1');
  const member = await poolToken('t2');
  const consumer = await poolToken('t3');
  await precompleteProfile(api, owner, 't1');
  await precompleteProfile(api, member, 't2');
  await precompleteProfile(api, consumer, 't3');

  const memberId = (await api('/v1/me', 'GET', member)).body.id;
  const consumerId = (await api('/v1/me', 'GET', consumer)).body.id;

  const created = await api('/v1/itineraries', 'POST', owner, {
    title: 'Island Hopping in El Nido',
    destinations: ['Palawan'],
    description: "Discover the breathtaking beauty of El Nido's lagoons.",
    startDate: '2027-03-04',
    endDate: '2027-03-08',
    durationDays: 2,
  });
  check('a never-started trip is created (lifecycle draft)',
    created.status === 201 && created.body.state === 'draft' && created.body.status === 'draft',
    `${created.status} ${created.body?.state}/${created.body?.status}`);
  const trip = created.body.id;
  const dayOne = created.body.days[0].id;
  const dayTwo = created.body.days[1].id;

  await api(`/v1/itineraries/${trip}/days/${dayOne}/activities`, 'POST', owner, {
    title: 'Airport Transfer', timeOfDay: '14:00', costAmount: '500', costCurrency: 'PHP',
    place: 'Lio Airport', description: 'A van transfer to El Nido town proper.',
    notes: 'Book the earliest slot at 8:00 AM to avoid the large tour groups!',
    externalUrl: 'https://example.test/transfer',
  });
  await api(`/v1/itineraries/${trip}/days/${dayTwo}/activities`, 'POST', owner, {
    title: 'Sunset at Las Cabanas', costAmount: '300', costCurrency: 'PHP',
  });

  await api(`/v1/itineraries/${trip}/invitations`, 'POST', owner, { email: address('t2') });
  const inbox = await api('/v1/invitations', 'GET', member);
  const invite = (inbox.body?.items ?? []).find((i) => i.itineraryId === trip);
  const accepted = await api(`/v1/invitations/${invite?.id}/accept`, 'POST', member, {});
  check('t2 joins through the real invite → accept', accepted.status === 200, 'got ' + accepted.status);

  await api(`/v1/itineraries/${trip}/edit-lock`, 'POST', owner, { subjectType: 'header' });
  const dressed = await api(`/v1/itineraries/${trip}`, 'PATCH', owner, {
    title: 'Island Hopping in El Nido',
    destinations: ['Palawan'],
    description: "Discover the breathtaking beauty of El Nido's lagoons.",
    standouts: ['Big Lagoon Kayaking', 'Local Seafood Dinners'],
    bestTimeOfYear: 'Dec – Apr',
    startDate: '2027-03-04',
    endDate: '2027-03-08',
  });
  check('AC6 standouts + best time save under the header lease',
    dressed.status === 200 && dressed.body.standouts.length === 2 && dressed.body.bestTimeOfYear === 'Dec – Apr',
    `${dressed.status} ${JSON.stringify(dressed.body?.standouts)}`);
  await api(`/v1/itineraries/${trip}/edit-lock`, 'DELETE', owner, { subjectType: 'header' });

  const beforePublish = await api(`/v1/published-itineraries/${trip}`, 'GET', consumer);
  check('AC3 t3 cannot see a draft itinerary',
    beforePublish.status === 404 && beforePublish.body.code === 'ITINERARY_NOT_FOUND',
    'got ' + beforePublish.status);

  const previewed = await api(`/v1/itineraries/${trip}/preview`, 'GET', owner);
  const memberPreview = await api(`/v1/itineraries/${trip}/preview`, 'GET', member);
  check('the owner previews before publishing; a member cannot',
    previewed.status === 200 && memberPreview.status === 403, `${previewed.status}/${memberPreview.status}`);

  const memberPublish = await api(`/v1/itineraries/${trip}/publish`, 'POST', member);
  check('AC7 publish by t2 (member) → 403',
    memberPublish.status === 403 && memberPublish.body.code === 'NOT_PERMITTED', 'got ' + memberPublish.status);

  const published = await api(`/v1/itineraries/${trip}/publish`, 'POST', owner);
  check('AC7 publish by t1 (owner) → 200, status becomes public',
    published.status === 200 && published.body.status === 'public',
    `${published.status} ${published.body?.status}`);

  const seen = await api(`/v1/published-itineraries/${trip}`, 'GET', consumer);
  check('AC1 t3 opens the published page by direct route', seen.status === 200, 'got ' + seen.status);

  const fields = Object.keys(seen.body ?? {}).sort();
  check('AC2 the projection field set is exactly the pinned one',
    JSON.stringify(fields) === JSON.stringify(PROJECTION_FIELDS), fields.join(','));
  const raw = JSON.stringify(seen.body);
  const leaked = FORBIDDEN.filter((f) => raw.includes(`"${f}"`));
  check('AC2 the absence rule holds on the wire — no dates, state, stamps, roster, attribution',
    leaked.length === 0, leaked.join(','));
  check('AC2 …and the date span itself appears nowhere',
    !raw.includes('2027-03-04') && !raw.includes('2027-03-08'));

  check('decision 4 duration derives from the day count, not the span',
    seen.body.durationDays === 2, 'got ' + seen.body.durationDays);
  check('AC4 Creator Tips cross the wall onto the day cards',
    seen.body.days[0].activities[0].notes?.startsWith('Book the earliest slot'),
    seen.body.days[0].activities[0].notes);
  check('AC5 per-activity costs render and the single-currency total is derived',
    seen.body.estimatedCost?.currency === 'PHP' && Number(seen.body.estimatedCost.amount) === 800,
    JSON.stringify(seen.body.estimatedCost));
  check('AC6 standouts + best time reach the projection',
    seen.body.standouts.length === 2 && seen.body.bestTimeOfYear === 'Dec – Apr');

  const frozenEdit = await api(`/v1/itineraries/${trip}/days/${dayTwo}/activities`, 'POST', owner, {
    title: 'Ferry', costAmount: '40', costCurrency: 'USD',
  });
  check('ADR-018 a published plan is frozen — the edit is refused, naming why',
    frozenEdit.status === 409 && frozenEdit.body.code === 'ITINERARY_PUBLISHED',
    `${frozenEdit.status} ${frozenEdit.body?.code}`);

  await api(`/v1/itineraries/${trip}/unpublish`, 'POST', owner);
  const thawed = await api(`/v1/itineraries/${trip}/days/${dayTwo}/activities`, 'POST', owner, {
    title: 'Ferry', costAmount: '40', costCurrency: 'USD',
  });
  check('ADR-018 unpublishing returns it to draft, and the plan is editable again',
    thawed.status === 201, 'got ' + thawed.status);
  await api(`/v1/itineraries/${trip}/publish`, 'POST', owner);

  const mixed = await api(`/v1/published-itineraries/${trip}`, 'GET', consumer);
  check('AC5 a mixed-currency plan shows prices and NO total',
    mixed.body.estimatedCost === null || mixed.body.estimatedCost === undefined,
    JSON.stringify(mixed.body.estimatedCost));
  check('AC5 …and "/Person" appears nowhere on the wire', !JSON.stringify(mixed.body).includes('Person'));

  const ownerId = (await api('/v1/me', 'GET', owner)).body.id;
  check('AC8 byline = current owner', mixed.body.creator.id === ownerId,
    `${mixed.body.creator.id} vs ${ownerId}`);

  const memberSees = await api(`/v1/published-itineraries/${trip}`, 'GET', member);
  check('the projection is one page for every audience — the member reads it too',
    memberSees.status === 200, 'got ' + memberSees.status);

  await api(`/v1/itineraries/${trip}/publish`, 'POST', owner, { audience: 'private' });
  const privateForMember = await api(`/v1/published-itineraries/${trip}`, 'GET', member);
  const privateForStranger = await api(`/v1/published-itineraries/${trip}`, 'GET', consumer);
  check('ADR-018 private is PUBLISHED — the collaborator reads the overview',
    privateForMember.status === 200, 'got ' + privateForMember.status);
  check('ADR-018 …and a stranger is masked, indistinguishably from never-existed',
    privateForStranger.status === 404 && privateForStranger.body.code === 'ITINERARY_NOT_FOUND',
    'got ' + privateForStranger.status);

  const backToPublic = await api(`/v1/itineraries/${trip}/publish`, 'POST', owner, { audience: 'public' });
  check('ADR-018 the audience moves without a round trip through draft',
    backToPublic.status === 200 && backToPublic.body.status === 'public',
    `${backToPublic.status} ${backToPublic.body?.status}`);

  const unpublished = await api(`/v1/itineraries/${trip}/unpublish`, 'POST', owner);
  const goneAgain = await api(`/v1/published-itineraries/${trip}`, 'GET', consumer);
  check('AC3 unpublish → t3 masked again',
    unpublished.status === 200 && goneAgain.status === 404, `${unpublished.status}/${goneAgain.status}`);

  const republished = await api(`/v1/itineraries/${trip}/publish`, 'POST', owner);
  const backAgain = await api(`/v1/published-itineraries/${trip}`, 'GET', consumer);
  check('AC3 republish serves the SAME itinerary id — no new identity',
    republished.body.id === trip && backAgain.body.id === trip, `${republished.body?.id}`);

  await api(`/v1/itineraries/${trip}/archive`, 'POST', owner);
  const archivedPublic = await api(`/v1/published-itineraries/${trip}`, 'GET', consumer);
  const archivedMember = await api(`/v1/itineraries/${trip}`, 'GET', member);
  const archivedMemberList = await api('/v1/itineraries?archived=true', 'GET', member);
  const archivedOwner = await api(`/v1/itineraries/${trip}`, 'GET', owner);
  const fencedPublish = await api(`/v1/itineraries/${trip}/unpublish`, 'POST', owner);
  check('AC9 archived → t3 masked on the public page', archivedPublic.status === 404, 'got ' + archivedPublic.status);
  check('AC9 archived → t2 masked on a direct read', archivedMember.status === 404, 'got ' + archivedMember.status);
  check('AC9 archived → t2\'s archived list excludes it',
    !(archivedMemberList.body?.items ?? []).some((i) => i.id === trip));
  check('AC9 archived → t1 retains access', archivedOwner.status === 200, 'got ' + archivedOwner.status);
  check('AC9 archived → the fence rejects publish/unpublish',
    fencedPublish.status === 409 && fencedPublish.body.code === 'TRIP_ARCHIVED', 'got ' + fencedPublish.status);

  await api(`/v1/itineraries/${trip}/unarchive`, 'POST', owner);
  const restoredPublic = await api(`/v1/published-itineraries/${trip}`, 'GET', consumer);
  const restoredMember = await api(`/v1/itineraries/${trip}`, 'GET', member);
  check('AC9 unarchive restores the public page', restoredPublic.status === 200, 'got ' + restoredPublic.status);
  check('AC9 unarchive restores t2\'s sight', restoredMember.status === 200, 'got ' + restoredMember.status);

  const empty = await api('/v1/itineraries', 'POST', owner, {
    title: 'Someday, Japan', destinations: ['Japan'],
  });
  const emptyPublish = await api(`/v1/itineraries/${empty.body.id}/publish`, 'POST', owner);
  const emptySeen = await api(`/v1/published-itineraries/${empty.body.id}`, 'GET', consumer);
  check('AC10 an empty itinerary publishes and projects cleanly',
    emptyPublish.status === 200 && emptySeen.status === 200 && emptySeen.body.durationDays === 0
      && emptySeen.body.days.length === 0 && emptySeen.body.standouts.length === 0,
    `${emptyPublish.status}/${emptySeen.status}`);

  const stillADraft = await api('/v1/itineraries', 'POST', owner, {
    title: 'Someday, Japan', destinations: ['Japan'],
  });
  const olderClient = await api(`/v1/itineraries/${stillADraft.body.id}/edit-lock`, 'POST', owner, { subjectType: 'header' })
    .then(() => api(`/v1/itineraries/${stillADraft.body.id}`, 'PATCH', owner, {
      title: 'Someday, Japan', destinations: ['Japan'], standouts: ['Cherry blossoms'], bestTimeOfYear: 'Mar – Apr',
    }))
    .then(() => api(`/v1/itineraries/${stillADraft.body.id}`, 'PATCH', owner, {
      title: 'Renamed by a client that predates the fields', destinations: ['Japan'],
    }));
  check('ADR-008 a client that cannot send the new fields does not erase them',
    olderClient.body.standouts?.length === 1 && olderClient.body.bestTimeOfYear === 'Mar – Apr',
    `${JSON.stringify(olderClient.body?.standouts)} / ${olderClient.body?.bestTimeOfYear}`);

  console.log(`\n  trip: ${trip}`);
  console.log(`  consumer route: /published/${trip}`);
  console.log(`  ids — owner ${ownerId} · member ${memberId} · consumer ${consumerId}`);
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
