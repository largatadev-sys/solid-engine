const { execFileSync } = require('child_process');
const path = require('path');
const { TRAVELERS } = require('./fixtures/travelers');
const { CACHE_DIR, photosFor } = require('./photoPool');


const DEPLOYED_OPT_IN = '--yes-backdate-the-deployed-rung';

const BASE = process.env.LARGATA_TEST_POOL_EMAIL_BASE;
const address = (tag) => { const [local, domain] = BASE.split('@'); return `${local}+${tag}@${domain}`; };

const BANDS = [
  { label: 'this week', share: 0.20, minDays: 0, maxDays: 7 },
  { label: 'this month', share: 0.30, minDays: 7, maxDays: 30 },
  { label: 'last three months', share: 0.30, minDays: 30, maxDays: 90 },
  { label: 'older', share: 0.20, minDays: 90, maxDays: 180 },
];

const only = (arg) => process.argv.find((a) => a.startsWith(`--${arg}=`))?.split('=')[1];

const COMPLETE_ONLY = process.argv.includes('--complete-only');

const ALL_PUBLIC = process.argv.includes('--all-public');

const lifecycleOf = (trip) => (ALL_PUBLIC ? 'completed' : trip.lifecycle);
const audienceOf = (trip) => (ALL_PUBLIC ? 'public' : trip.publish);
const PHOTOS = CACHE_DIR;

function isFullyPhotographed(trip) {
  return trip.days.every((day) => photosFor(PHOTOS, day.at).length >= Math.max(day.activities.length, 1));
}

function seededRandom(text) {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return ((hash >>> 0) % 100000) / 100000;
}

function bandFor(roll) {
  let running = 0;
  for (const band of BANDS) {
    running += band.share;
    if (roll < running) return band;
  }
  return BANDS[BANDS.length - 1];
}

function daysAgoFor(trip) {
  const roll = seededRandom(trip.title);
  if (lifecycleOf(trip) === 'ongoing') return 0.2 + roll * 1.8;
  const band = bandFor(roll);
  const spread = seededRandom(trip.title + '/spread');
  return band.minDays + spread * (band.maxDays - band.minDays);
}

const PSQL_RETRIES = 3;

function psql(sql) {
  let last;
  for (let attempt = 1; attempt <= PSQL_RETRIES; attempt += 1) {
    try {
      return psqlOnce(sql);
    } catch (e) {
      last = e;
      if (attempt < PSQL_RETRIES) {
        console.log(`   retry  psql — connection failed, attempt ${attempt} of ${PSQL_RETRIES}`);
        Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 1500 * attempt);
      }
    }
  }
  throw last;
}

function psqlOnce(sql) {
  const url = process.env.LARGATA_DATABASE_URL;
  if (url !== undefined && url !== '') {
    if (hasLocalPsql()) {
      return execFileSync('psql', [url, '-tAc', sql], { encoding: 'utf8' }).trim();
    }
    return execFileSync(
      'docker',
      ['run', '--rm', '-i', '-e', 'PGURL', 'postgres:18-alpine',
        'sh', '-c', 'psql "$PGURL" -tAc "$(cat)"'],
      { encoding: 'utf8', input: sql, env: { ...process.env, PGURL: url } },
    ).trim();
  }
  const container = execFileSync('docker', ['ps', '-qf', 'name=app-postgres'], { encoding: 'utf8' }).trim();
  if (container === '') {
    throw new Error(
      'No local postgres container and LARGATA_DATABASE_URL is unset.\n'
        + 'Start the stack (docker compose up -d) or point LARGATA_DATABASE_URL at a rung.',
    );
  }
  return execFileSync(
    'docker',
    ['exec', container, 'psql', '-U', 'largata', '-d', 'largata', '-tAc', sql],
    { encoding: 'utf8' },
  ).trim();
}

function hasLocalPsql() {
  try {
    execFileSync('psql', ['--version'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function quote(text) {
  return `'${text.replace(/'/g, "''")}'`;
}

function countRows(sql) {
  return psql(sql).split('\n').filter((line) => line.trim() === '1').length;
}

function main() {
  if (BASE === undefined || BASE === '') {
    console.error('LARGATA_TEST_POOL_EMAIL_BASE is not set — run: cd mobile && set -a && . ./.env && set +a');
    process.exit(2);
  }
  const deployed = process.env.LARGATA_DATABASE_URL !== undefined && process.env.LARGATA_DATABASE_URL !== '';
  if (deployed && !process.argv.includes(DEPLOYED_OPT_IN)) {
    console.error(`LARGATA_DATABASE_URL is set, so this would rewrite timestamps on a REMOTE rung.`);
    console.error(`Pass ${DEPLOYED_OPT_IN} if that is what you mean.`);
    process.exit(2);
  }

  const wanted = only('tag');
  const chosen = wanted === undefined ? TRAVELERS : TRAVELERS.filter((t) => t.tag === wanted);
  if (chosen.length === 0) throw new Error(`no traveler tagged "${wanted}"`);

  console.log(`backdating ${chosen.length} traveler(s)${deployed ? '  (REMOTE)' : '  (local)'}\n`);

  let moved = 0;
  let published = 0;
  for (const traveler of chosen) {
    for (const trip of (COMPLETE_ONLY ? traveler.trips.filter(isFullyPhotographed) : traveler.trips)) {
      const postcards = trip.days.flatMap((d) => d.activities).filter((a) => a.post !== undefined).length;
      const publishable = audienceOf(trip) !== null && audienceOf(trip) !== undefined;
      if (postcards === 0 && !publishable) continue;

      const daysAgo = daysAgoFor(trip);
      if (!Number.isFinite(daysAgo)) {
        throw new Error(`refusing to build SQL: daysAgo for "${trip.title}" is ${daysAgo}`);
      }

      const publishOffset = Number((seededRandom(trip.title + '/publish') * 2).toFixed(3));
      if (!Number.isFinite(publishOffset)) {
        throw new Error(`refusing to build SQL: publishOffset for "${trip.title}" is ${publishOffset}`);
      }

      const sql = `
        WITH ordered AS (
          SELECT de.id, row_number() OVER (ORDER BY de.id) - 1 AS n
          FROM diary_entry de
          JOIN itinerary i ON i.id = de.itinerary_id
          JOIN workspace w ON w.itinerary_id = i.id
          JOIN membership m ON m.workspace_id = w.id AND m.traveler_id = de.traveler_id AND m.role = 'OWNER'
          JOIN traveler t ON t.id = de.traveler_id
          WHERE i.title = ${quote(trip.title)}
            AND t.email = ${quote(address(traveler.tag))}
            AND de.shared_at IS NOT NULL
            AND w.state <> 'ARCHIVED'
        )
        UPDATE diary_entry d
        SET shared_at = now() - (${daysAgo} || ' days')::interval - (ordered.n || ' days')::interval,
            created_at = now() - (${daysAgo} || ' days')::interval - (ordered.n || ' days')::interval
        FROM ordered
        WHERE d.id = ordered.id
        RETURNING 1
      `.replace(/\s+/g, ' ');

      const publishSql = `
        UPDATE itinerary
        SET published_at = LEAST(
              now(),
              now() - (${daysAgo} || ' days')::interval + (${publishOffset} || ' days')::interval
            )
        WHERE id IN (
          SELECT i.id FROM itinerary i
          JOIN workspace w ON w.itinerary_id = i.id
          JOIN membership m ON m.workspace_id = w.id AND m.role = 'OWNER'
          JOIN traveler t ON t.id = m.traveler_id
          WHERE i.title = ${quote(trip.title)}
            AND t.email = ${quote(address(traveler.tag))}
            AND i.published = true
            AND w.state <> 'ARCHIVED'
        )
        RETURNING 1
      `.replace(/\s+/g, ' ');

      const rows = postcards === 0 ? 0 : countRows(sql);
      const stamped = publishable ? countRows(publishSql) : 0;
      moved += rows;
      published += stamped;
      if (rows > 0 || stamped > 0) {
        console.log(
          `  ${String(Math.round(daysAgo)).padStart(3)}d ago  ${String(rows).padStart(2)} postcard(s)  `
            + `${stamped > 0 ? 'published ' : '          '}`
            + `${traveler.name} — ${trip.title}`,
        );
      }
    }
  }

  console.log(`\n${moved} postcards backdated, ${published} trips stamped published.`);
  console.log('The feed and Discovery now span about six months.');
}

try {
  main();
} catch (e) {
  console.error(`\n${e.message}`);
  process.exit(1);
}
