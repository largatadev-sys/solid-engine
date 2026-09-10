const { api, poolToken, requirePoolEnv } = require('./poolApi');

requirePoolEnv();

const results = [];
const note = (step, ok, detail) => {
  results.push({ step, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${step}\n      ${detail}`);
};

const stamp = `cm5 walk ${Date.now().toString(36)}`;

async function main() {
  const t1 = await poolToken('t1');
  const t3 = await poolToken('t3');

  const made = await api('/v1/trips', 'POST', t1, {
    title: stamp, destination: 'Palawan', durationDays: 2,
    startDate: '2026-11-02', endDate: '2026-11-03',
  });
  if (made.status !== 201) throw new Error(`seed failed ${made.status} ${JSON.stringify(made.body)}`);
  const trip = made.body.id;

  const days = (await api(`/v1/trips/${trip}`, 'GET', t1)).body.days;
  await api(`/v1/trips/${trip}/days/${days[0].id}/activities`, 'POST', t1, { title: 'Snorkel the lagoon' });
  await api(`/v1/trips/${trip}/start`, 'POST', t1);
  await api(`/v1/trips/${trip}/complete`, 'POST', t1);

  // 1 + 2 — publishing mints an Itinerary with its own identity
  const published = await api(`/v1/trips/${trip}/publish`, 'POST', t1);
  const itineraryId = published.body && published.body.id;
  note('1/2 publish mints an Itinerary with its own id',
    published.status === 200 && itineraryId && itineraryId !== trip,
    `status ${published.status}, itinerary ${itineraryId}, trip ${trip}`);

  // the success screen's read — this is what 404'd on every publish
  const page = await api(`/v1/itineraries/${itineraryId}`, 'GET', t1);
  note('1  the success screen\'s read answers by the Itinerary id',
    page.status === 200, `GET /v1/itineraries/{itineraryId} -> ${page.status}`);

  // 7 — the trip's dates must reach the page nowhere, including the raw plan
  const raw = JSON.stringify(page.body);
  note('7  no trip dates anywhere in the page body',
    !raw.includes('startDate') && !raw.includes('endDate') && !raw.includes('2026-11-02'),
    raw.includes('2026-11-02') ? 'THE DATE IS ON THE WIRE' : 'no startDate, no endDate, no date value');

  // 6 — ADR-034: every signed-in traveler reads it, private author included
  await api('/v1/me', 'PATCH', t1, { profileVisibility: 'private' });
  const stranger = await api(`/v1/itineraries/${itineraryId}`, 'GET', t3);
  note('6  a stranger reads a PRIVATE author\'s Itinerary (ADR-034)',
    stranger.status === 200, `private author, stranger -> ${stranger.status}`);
  await api('/v1/me', 'PATCH', t1, { profileVisibility: 'public' });

  // 9 — the courtesy: the by-trip read still resolves an old link
  const byTrip = await api(`/v1/trips/${trip}/itinerary`, 'GET', t3);
  note('9  an old /published/{tripId} link still resolves, and answers the SAME object',
    byTrip.status === 200 && byTrip.body.id === itineraryId,
    `by-trip -> ${byTrip.status}, id ${byTrip.body && byTrip.body.id}`);

  // 8 — fork copies the Itinerary, carries the credit, no dates
  const forked = await api(`/v1/itineraries/${itineraryId}/fork`, 'POST', t3);
  const copy = forked.body && (forked.body.id || forked.body.tripId);
  const copyRead = copy ? (await api(`/v1/trips/${copy}`, 'GET', t3)).body : {};
  note('8  fork copies the plan, dateless, crediting the author',
    forked.status < 300 && copyRead.startDate === null && copyRead.endDate === null
      && copyRead.forkedFrom && copyRead.forkedFrom.sourceItineraryId === itineraryId,
    `fork ${forked.status}, dates ${copyRead.startDate}/${copyRead.endDate}, source ${copyRead.forkedFrom && copyRead.forkedFrom.sourceItineraryId}`);

  // 3/4 — unpublish takes effect, republish keeps the identity
  const un = await api(`/v1/trips/${trip}/unpublish`, 'POST', t1);
  const afterUn = (await api(`/v1/trips/${trip}`, 'GET', t1)).body;
  note('4  unpublish takes effect on the server, not just in a toast',
    un.status === 204 && afterUn.published === false,
    `unpublish ${un.status}, trip.published now ${afterUn.published}`);

  const re = await api(`/v1/trips/${trip}/publish`, 'POST', t1);
  note('3  republish keeps the SAME Itinerary id — a shared link does not die',
    re.status === 200 && re.body.id === itineraryId,
    `republished id ${re.body && re.body.id} (was ${itineraryId})`);

  // 10 — archive masks the page, and now fences both acts
  await api(`/v1/trips/${trip}/archive`, 'POST', t1);
  const masked = await api(`/v1/itineraries/${itineraryId}`, 'GET', t3);
  const fencedPublish = await api(`/v1/trips/${trip}/publish`, 'POST', t1);
  const fencedUnpublish = await api(`/v1/trips/${trip}/unpublish`, 'POST', t1);
  note('10 archive MASKS the page for a stranger',
    masked.status === 404, `archived, stranger -> ${masked.status}`);
  note('10 archive FENCES publish and unpublish (the regression this walk exists for)',
    fencedPublish.status === 409 && fencedUnpublish.status === 409,
    `publish ${fencedPublish.status}, unpublish ${fencedUnpublish.status}`);
  await api(`/v1/trips/${trip}/unarchive`, 'POST', t1);

  // the reopen fence
  const reopened = await api(`/v1/trips/${trip}/reopen`, 'POST', t1);
  note('*  a live Itinerary pins its trip\'s lifecycle (the first regression)',
    reopened.status === 409, `reopen on a published trip -> ${reopened.status}`);

  console.log(`\n${results.filter((r) => r.ok).length} passed, ${results.filter((r) => !r.ok).length} failed`);
  process.exit(results.some((r) => !r.ok) ? 1 : 0);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
