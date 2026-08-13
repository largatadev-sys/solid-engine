const fs = require('node:fs');
const path = require('node:path');

const PHOTO = path.join(__dirname, 'fixtures', 'photo.jpg');

const API = process.env.LARGATA_API_BASE_URL || 'http://localhost:8080';
const BASE = process.env.LARGATA_TEST_POOL_EMAIL_BASE;
const PASSWORD = process.env.LARGATA_TEST_POOL_PASSWORD;
const KEY = process.env.EXPO_PUBLIC_FIREBASE_API_KEY;

const address = (tag) => BASE.replace('@', `+${tag}@`);

let passed = 0;
let failed = 0;

function check(what, ok, detail) {
  console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${what}${detail ? `  — ${detail}` : ''}`);
  if (ok) {
    passed += 1;
  } else {
    failed += 1;
  }
}

async function signIn(tag) {
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${KEY}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: address(tag), password: PASSWORD, returnSecureToken: true }),
    },
  );
  const body = await response.json();
  if (!body.idToken) {
    throw new Error(`sign-in failed for ${tag}: ${JSON.stringify(body)}`);
  }
  return body.idToken;
}

async function api(path, method, token, payload) {
  const response = await fetch(`${API}${path}`, {
    method,
    headers: {
      authorization: `Bearer ${token}`,
      ...(payload ? { 'content-type': 'application/json' } : {}),
    },
    body: payload ? JSON.stringify(payload) : undefined,
  });
  const text = await response.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { status: response.status, body };
}

async function postcard(token, tripId, activityId, caption) {
  const form = new FormData();
  form.append('entry', JSON.stringify({ activityId, caption, fromDump: [] }));
  const bytes = fs.readFileSync(PHOTO);
  form.append('photos', new Blob([bytes], { type: 'image/jpeg' }), 'photo.jpg');
  const response = await fetch(`${API}/v1/itineraries/${tripId}/diary/entries`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}` },
    body: form,
  });
  return { status: response.status, body: await response.json().catch(() => null) };
}

async function listsTrip(token, tripId) {
  const page = await api('/v1/me/diary/trips?limit=50', 'GET', token);
  return (page.body.items ?? []).some((trip) => trip.itineraryId === tripId);
}

(async () => {
  const stamp = String(Date.now()).slice(-6);
  console.log('\nS4.23 archive walk — t1 = OWNER, t2 = MEMBER (the non-owner whose sight closes)\n');

  const owner = await signIn('t1');
  const member = await signIn('t2');
  const memberMe = await api('/v1/me', 'GET', member);
  const memberId = memberMe.body.id;

  const created = await api('/v1/itineraries', 'POST', owner, {
    title: `Archive walk ${stamp}`,
    destinations: ['Cebu'],
    durationDays: 2,
  });
  const tripId = created.body.id;

  const invited = await api(`/v1/itineraries/${tripId}/invitations`, 'POST', owner, {
    email: address('t2'),
  });
  check(
    'the member is invited',
    invited.status === 201,
    `status=${invited.status} ${JSON.stringify(invited.body)}`,
  );

  const accepted = await api(`/v1/invitations/${invited.body.id}/accept`, 'POST', member, {});
  check(
    'and accepts, through the real invite to accept path',
    accepted.status === 200 || accepted.status === 204,
    `status=${accepted.status}`,
  );

  const roster = await api(`/v1/itineraries/${tripId}/members`, 'GET', owner);
  check(
    'the roster genuinely holds two travelers — the probes below run as a MEMBER, not a stranger',
    (roster.body.items ?? []).length === 2,
    `roster=${(roster.body.items ?? []).map((m) => m.handle).join(', ')}`,
  );

  await api(`/v1/itineraries/${tripId}/finish-planning`, 'POST', owner);
  await api(`/v1/itineraries/${tripId}/start`, 'POST', owner);

  const plan = await api(`/v1/itineraries/${tripId}`, 'GET', owner);
  const day = plan.body.days[0];
  await api(`/v1/itineraries/${tripId}/edit-lock`, 'POST', owner);
  const activity = await api(`/v1/itineraries/${tripId}/days/${day.id}/activities`, 'POST', owner, {
    title: `Sunset ${stamp}`,
  });
  await api(`/v1/itineraries/${tripId}/edit-lock`, 'DELETE', owner);

  const ownerCard = await postcard(owner, tripId, activity.body.id, `owner memory ${stamp}`);
  const memberCard = await postcard(member, tripId, activity.body.id, `member memory ${stamp}`);
  check(
    'both travelers hold a postcard on the trip',
    ownerCard.status === 201 && memberCard.status === 201,
    `owner=${ownerCard.status} member=${memberCard.status}`,
  );

  check(
    'before the archive, BOTH see the trip in their diary list',
    (await listsTrip(owner, tripId)) && (await listsTrip(member, tripId)),
  );

  const archived = await api(`/v1/itineraries/${tripId}/archive`, 'POST', owner);
  check('the owner archives the trip', archived.status === 200, `status=${archived.status}`);

  console.log('\n  --- AC 5: the diary list is a projection of the fence ---');
  check(
    'AC 5: the member diary list no longer offers the archived trip — the dead card is gone',
    (await listsTrip(member, tripId)) === false,
  );
  check(
    'AC 5: the owner diary list still holds it — they legitimately still see it',
    (await listsTrip(owner, tripId)) === true,
  );

  console.log('\n  --- AC 1/2: every write door answers the member with the mask ---');
  const masked = (r) => r.status === 404 && r.body && r.body.code === 'ITINERARY_NOT_FOUND';
  const probes = [
    ['a day write', await api(`/v1/itineraries/${tripId}/days`, 'POST', member, { title: 'While frozen' })],
    [
      'an activity write',
      await api(`/v1/itineraries/${tripId}/days/${day.id}/activities`, 'POST', member, { title: 'x' }),
    ],
    ['acquiring the editing session', await api(`/v1/itineraries/${tripId}/edit-lock`, 'POST', member)],
    [
      'recaptioning their own postcard',
      await api(`/v1/itineraries/${tripId}/diary/entries/${memberCard.body.id}`, 'PATCH', member, {
        caption: 'after the fence',
      }),
    ],
    [
      'deleting their own postcard',
      await api(`/v1/itineraries/${tripId}/diary/entries/${memberCard.body.id}`, 'DELETE', member),
    ],
    [
      'issuing an invitation — a PERMISSION refusal on a live trip, masked here',
      await api(`/v1/itineraries/${tripId}/invitations`, 'POST', member, { email: 'x@example.com' }),
    ],
    [
      'offering ownership — likewise a 403 on a live trip',
      await api(`/v1/itineraries/${tripId}/ownership-offer`, 'POST', member, { travelerId: memberId }),
    ],
  ];
  for (const [what, response] of probes) {
    check(
      `AC 1/2: ${what} answers the not-found mask`,
      masked(response),
      `status=${response.status} code=${response.body && response.body.code}`,
    );
  }

  console.log('\n  --- AC 3: the owner keeps the honest archived refusal ---');
  const ownerRefusals = [
    ['a day write', await api(`/v1/itineraries/${tripId}/days`, 'POST', owner, { title: 'While frozen' })],
    ['acquiring the editing session', await api(`/v1/itineraries/${tripId}/edit-lock`, 'POST', owner)],
    [
      'issuing an invitation',
      await api(`/v1/itineraries/${tripId}/invitations`, 'POST', owner, { email: 'x@example.com' }),
    ],
  ];
  for (const [what, response] of ownerRefusals) {
    check(
      `AC 3: ${what} still answers 409 TRIP_ARCHIVED for the owner`,
      response.status === 409 && response.body && response.body.code === 'TRIP_ARCHIVED',
      `status=${response.status} code=${response.body && response.body.code}`,
    );
  }

  console.log('\n  --- AC 4: self-leave stays open ---');
  const left = await api(`/v1/itineraries/${tripId}/members/${memberId}`, 'DELETE', member);
  check('AC 4: the member can still leave a trip archived under them', left.status === 204, `status=${left.status}`);
  check(
    'AC 4: and the trip stays masked from them afterwards',
    (await api(`/v1/itineraries/${tripId}`, 'GET', member)).status === 404,
  );

  console.log(`\n──────── S4.23 archive walk: ${passed} passed, ${failed} failed ────────\n`);
  process.exit(failed === 0 ? 0 : 1);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
