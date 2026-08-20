const fs = require('fs');
const path = require('path');
const { precompleteProfile } = require('./precomplete-profile');
const { TRAVELERS, DUMP_QUERIES } = require('./fixtures/travelers');
const { CACHE_DIR, slug, photosFor: photosInPool, photoForSlot } = require('./photoPool');
const { API, request, api, poolToken, allMyTrips, requirePoolEnv } = require('./poolApi');


const PHOTOS = CACHE_DIR;
const CREDITS = path.join(PHOTOS, 'CREDITS.json');
const DEPLOYED_OPT_IN = '--yes-seed-the-deployed-rung';

const COLLABORATOR_TAG = 't2';

const only = (arg) => process.argv.find((a) => a.startsWith(`--${arg}=`))?.split('=')[1];

const COMPLETE_ONLY = process.argv.includes('--complete-only');

const ALL_PUBLIC = process.argv.includes('--all-public');

const PARALLEL_ARG = process.argv.find((a) => a === '--parallel' || a.startsWith('--parallel='));
const PARALLEL = PARALLEL_ARG !== undefined;
const WIDTH = PARALLEL_ARG?.includes('=') ? Math.max(1, Number(PARALLEL_ARG.split('=')[1]) || 1) : Infinity;

const lifecycleOf = (trip) => (ALL_PUBLIC ? 'completed' : trip.lifecycle);
const audienceOf = (trip) => (ALL_PUBLIC ? 'public' : trip.publish);

function isFullyPhotographed(trip) {
  return trip.days.every((day) => photosFor(day.at).length >= Math.max(day.activities.length, 1));
}


function uploadPhoto(route, token, file) {
  const boundary = `----largata${Date.now()}${process.hrtime()[1]}`;
  const payload = Buffer.concat([
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="photo"; `
        + `filename="${path.basename(file)}"\r\nContent-Type: image/jpeg\r\n\r\n`,
    ),
    fs.readFileSync(file),
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ]);
  return request(API + route, 'POST', payload, {
    Authorization: 'Bearer ' + token,
    'Content-Type': `multipart/form-data; boundary=${boundary}`,
  });
}

function postDiaryEntry(token, itineraryId, entry, files) {
  const boundary = `----largatadiary${Date.now()}${process.hrtime()[1]}`;
  const parts = [
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="entry"\r\n\r\n${JSON.stringify(entry)}\r\n`,
    ),
  ];
  for (const file of files) {
    parts.push(
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="photos"; `
          + `filename="${path.basename(file)}"\r\nContent-Type: image/jpeg\r\n\r\n`,
      ),
      fs.readFileSync(file),
      Buffer.from('\r\n'),
    );
  }
  parts.push(Buffer.from(`--${boundary}--\r\n`));
  return request(`${API}/v1/itineraries/${itineraryId}/diary/entries`, 'POST', Buffer.concat(parts), {
    Authorization: 'Bearer ' + token,
    'Content-Type': `multipart/form-data; boundary=${boundary}`,
  });
}


function must(res, what) {
  if (res.status >= 300) {
    throw new Error(`${what}: ${res.status} ${JSON.stringify(res.body).slice(0, 240)}`);
  }
  return res.body;
}

const photosFor = (query) => photosInPool(PHOTOS, query);

function postcardFrames(activity, wanted) {
  const frames = [activity.file];
  for (const file of activity.pool) {
    if (frames.length >= wanted) break;
    if (!frames.includes(file)) frames.push(file);
  }
  return frames;
}

function altFor(file, credits) {
  const alt = credits[path.basename(file)]?.alt;
  if (alt === undefined || alt.trim() === '') return null;
  return alt.trim();
}

async function archivePreviousRuns(traveler, token) {
  const titles = new Set(traveler.trips.map((t) => t.title));
  const mine = await allMyTrips(token);
  const stale = mine.filter((trip) => titles.has(trip.title) && trip.archived !== true);
  for (const trip of stale) {
    await api(`/v1/itineraries/${trip.id}/archive`, 'POST', token);
  }
  return stale.length;
}


async function seedTraveler(traveler, credits, collaborator, say = console.log) {
  const token = await poolToken(traveler.tag);
  await precompleteProfile(api, token, traveler.tag, traveler.handle);

  must(
    await api('/v1/me', 'PATCH', token, {
      displayName: traveler.name,
      handle: traveler.handle,
      bio: traveler.bio,
      homeCity: traveler.homeCity,
    }),
    `${traveler.tag} profile`,
  );

  const bird = photosFor(traveler.bird)[0];
  if (bird !== undefined) must(await uploadPhoto('/v1/me/avatar', token, bird), `${traveler.tag} avatar`);

  say(`\n${traveler.name}  (${traveler.tag}, @${traveler.handle})  ${traveler.region}`);
  say(`  avatar   ${bird === undefined ? 'MISSING' : path.basename(bird)}`);

  const archived = await archivePreviousRuns(traveler, token);
  if (archived > 0) say(`  cleaned  ${archived} trip(s) from a previous run, archived`);

  const chosenTrips = COMPLETE_ONLY ? traveler.trips.filter(isFullyPhotographed) : traveler.trips;
  const skipped = traveler.trips.length - chosenTrips.length;
  if (skipped > 0) say(`  skipped  ${skipped} trip(s) — photos not fetched yet`);

  const seeded = [];
  for (const trip of chosenTrips) {
    const created = must(
      await api('/v1/itineraries', 'POST', token, {
        title: trip.title,
        destination: trip.destination,
        ...(trip.description === null ? {} : { description: trip.description }),
        durationDays: trip.days.length,
      }),
      `create "${trip.title}"`,
    );

    if (trip.standouts.length > 0 || trip.bestTimeOfYear !== null || trip.description !== null) {
      must(await api(`/v1/itineraries/${created.id}/edit-lock`, 'POST', token, { subjectType: 'header' }), 'header lease');
      must(
        await api(`/v1/itineraries/${created.id}`, 'PATCH', token, {
          title: trip.title,
          destination: trip.destination,
          ...(trip.description === null ? {} : { description: trip.description }),
          standouts: trip.standouts,
          bestTimeOfYear: trip.bestTimeOfYear ?? '',
        }),
        'dress the header',
      );
      await api(`/v1/itineraries/${created.id}/edit-lock`, 'DELETE', token, { subjectType: 'header' });
    }

    const activities = [];
    let attached = 0;
    for (const [index, day] of trip.days.entries()) {
      const dayId = created.days[index]?.id;
      if (dayId === undefined) continue;
      if (day.title !== undefined && day.title !== null) {
        const lease = { subjectType: 'day', subjectId: dayId };
        must(await api(`/v1/itineraries/${created.id}/edit-lock`, 'POST', token, lease), 'day lease');
        must(await api(`/v1/itineraries/${created.id}/days/${dayId}`, 'PATCH', token, { title: day.title }), 'day title');
        await api(`/v1/itineraries/${created.id}/edit-lock`, 'DELETE', token, lease);
      }
      const pool = photosFor(day.at);
      for (const [slot, spec] of day.activities.entries()) {
        const file = photoForSlot(PHOTOS, day.at, slot);
        const description = file === undefined ? null : altFor(file, credits);
        const activity = must(
          await api(`/v1/itineraries/${created.id}/days/${dayId}/activities`, 'POST', token, {
            title: spec.title,
            ...(spec.timeOfDay === undefined ? {} : { timeOfDay: spec.timeOfDay }),
            ...(spec.place === undefined || spec.place === null ? {} : { place: spec.place }),
            ...(spec.notes === undefined || spec.notes === null ? {} : { notes: spec.notes }),
            ...(description === null ? {} : { description }),
            ...(spec.costAmount === undefined ? {} : { costAmount: spec.costAmount, costCurrency: spec.costCurrency }),
          }),
          `activity "${spec.title}"`,
        );
        if (file !== undefined) {
          const lease = { subjectType: 'activity', subjectId: activity.id };
          must(await api(`/v1/itineraries/${created.id}/edit-lock`, 'POST', token, lease), 'activity lease');
          must(
            await uploadPhoto(
              `/v1/itineraries/${created.id}/days/${dayId}/activities/${activity.id}/photos`,
              token,
              file,
            ),
            `photo for "${spec.title}"`,
          );
          await api(`/v1/itineraries/${created.id}/edit-lock`, 'DELETE', token, lease);
          attached += 1;
        }
        activities.push({ id: activity.id, title: spec.title, file, pool, post: spec.post });
      }
    }

    const cover = photosFor(trip.days[0].at)[0];
    if (cover !== undefined) {
      const header = { subjectType: 'header' };
      must(await api(`/v1/itineraries/${created.id}/edit-lock`, 'POST', token, header), 'header lease for cover');
      must(await uploadPhoto(`/v1/itineraries/${created.id}/cover`, token, cover), 'cover');
      await api(`/v1/itineraries/${created.id}/edit-lock`, 'DELETE', token, header);
    }

    let withMember = false;
    if (collaborator !== null && trip.days.length >= 4) {
      must(
        await api(`/v1/itineraries/${created.id}/invitations/by-handle`, 'POST', token,
          { handle: collaborator.handle }),
        'invite',
      );
      const inbox = must(await api('/v1/invitations', 'GET', collaborator.token), 'inbox');
      const invite = (inbox.items ?? []).find((i) => i.itineraryId === created.id);
      if (invite !== undefined) {
        must(await api(`/v1/invitations/${invite.id}/accept`, 'POST', collaborator.token, {}), 'accept');
        withMember = true;
      }
    }

    if (lifecycleOf(trip) === 'ongoing' || lifecycleOf(trip) === 'completed') {
      must(await api(`/v1/itineraries/${created.id}/start`, 'POST', token), 'start');
    }
    if (lifecycleOf(trip) === 'completed') {
      must(await api(`/v1/itineraries/${created.id}/complete`, 'POST', token), 'complete');
    }

    if (withMember) {
      for (const query of DUMP_QUERIES) {
        const file = photosFor(query)[0];
        if (file === undefined) continue;
        must(await uploadPhoto(`/v1/itineraries/${created.id}/photo-dump`, collaborator.token, file), 'dump');
      }
    }

    let posted = 0;
    let frameCount = 0;
    for (const activity of activities.filter((a) => a.post !== undefined)) {
      if (activity.file === undefined) continue;
      const post = typeof activity.post === 'string' ? { caption: activity.post, photos: 1 } : activity.post;
      const frames = postcardFrames(activity, post.photos ?? 1);
      must(
        await postDiaryEntry(
          token,
          created.id,
          { activityId: activity.id, caption: post.caption, fromDump: [] },
          frames,
        ),
        `postcard "${activity.title}"`,
      );
      posted += 1;
      frameCount += frames.length;
    }

    if (audienceOf(trip) !== null) {
      must(await api(`/v1/itineraries/${created.id}/publish`, 'POST', token, { audience: audienceOf(trip) }), 'publish');
    }

    say(
      `  ${lifecycleOf(trip).padEnd(9)} ${(audienceOf(trip) ?? '—').padEnd(7)} `
        + `${String(trip.days.length).padStart(2)}d ${String(activities.length).padStart(2)}a `
        + `${String(attached).padStart(2)}ph ${posted > 0 ? `${posted} postcard(s)/${frameCount}f ` : '              '}`
        + `${withMember ? 'with ' + collaborator.tag + ' ' : ''}${trip.title}`,
    );
    seeded.push(created.id);
  }
  return seeded;
}

async function main() {
  requirePoolEnv();

  const deployed = !API.startsWith('http://localhost');
  if (deployed && !process.argv.includes(DEPLOYED_OPT_IN)) {
    console.error(`Refusing to seed ${API} without ${DEPLOYED_OPT_IN}.\n`);
    console.error('This writes trips, photos and PUBLIC postcards that no endpoint this app has can');
    console.error('undo, on an environment other people read. Pass the flag only if you mean it.');
    process.exit(2);
  }

  if (!fs.existsSync(CREDITS)) {
    console.error(`No photos at ${PHOTOS}.\n`);
    console.error('Run scripts/fetch-fixtures.js first. Refusing rather than seeding a trip with no');
    console.error('images, which is the thing this seeder exists to avoid.');
    process.exit(2);
  }

  const credits = JSON.parse(fs.readFileSync(CREDITS, 'utf8'));
  const wanted = only('tag');
  const chosen = wanted === undefined ? TRAVELERS : TRAVELERS.filter((t) => t.tag === wanted);
  if (chosen.length === 0) throw new Error(`no traveler tagged "${wanted}"`);

  console.log(`seeding ${API}${deployed ? '  (DEPLOYED RUNG)' : ''}`);
  console.log(`${chosen.length} traveler(s), ${chosen.reduce((n, t) => n + t.trips.length, 0)} trips`);

  const collaboratorSpec = TRAVELERS.find((t) => t.tag === COLLABORATOR_TAG);
  if (collaboratorSpec === undefined) {
    throw new Error(`no traveler tagged "${COLLABORATOR_TAG}" — the collaborator every trip is invited from`);
  }
  const collaborator = {
    tag: COLLABORATOR_TAG,
    token: await poolToken(COLLABORATOR_TAG),
    handle: collaboratorSpec.handle,
  };
  await precompleteProfile(api, collaborator.token, COLLABORATOR_TAG, collaborator.handle);

  let trips = 0;
  const skipped = [];
  if (PARALLEL) {
    const queue = [...chosen];
    const outcomes = [];
    const worker = async () => {
      for (let traveler = queue.shift(); traveler !== undefined; traveler = queue.shift()) {
        const lines = [];
        try {
          const seeded = await seedTraveler(
            traveler, credits, traveler.tag === COLLABORATOR_TAG ? null : collaborator, (text) => lines.push(text),
          );
          outcomes.push({ traveler, seeded, lines });
        } catch (e) {
          if (!e.message.startsWith('sign-in failed')) {
            console.log(lines.join('\n'));
            throw e;
          }
          outcomes.push({ traveler, seeded: null, lines });
        }
      }
    };
    await Promise.all(Array.from({ length: Math.min(WIDTH, chosen.length) }, worker));
    for (const outcome of outcomes) {
      console.log(outcome.lines.join('\n'));
      if (outcome.seeded === null) {
        skipped.push(outcome.traveler);
        console.log(`\n${outcome.traveler.name}  (${outcome.traveler.tag})  SKIPPED — cannot sign in`);
      } else {
        trips += outcome.seeded.length;
      }
    }
  } else {
    for (const traveler of chosen) {
      try {
        const seeded = await seedTraveler(traveler, credits, traveler.tag === COLLABORATOR_TAG ? null : collaborator);
        trips += seeded.length;
      } catch (e) {
        if (!e.message.startsWith('sign-in failed')) throw e;
        skipped.push(traveler);
        console.log(`\n${traveler.name}  (${traveler.tag})  SKIPPED — cannot sign in`);
      }
    }
  }

  console.log(`\n${trips} trips seeded for ${chosen.length - skipped.length} traveler(s).`);
  if (skipped.length > 0) {
    console.log(
      `${skipped.length} skipped: ${skipped.map((t) => t.tag).join(', ')} — `
        + 'reset their passwords in the Firebase console, then re-run with --tag=<tag>.',
    );
  }
  console.log('Home feed: http://localhost:8081/');
}

main().catch((e) => {
  console.error(`\n${e.message}`);
  process.exit(1);
});
