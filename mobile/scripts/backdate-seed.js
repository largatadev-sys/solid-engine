const { execFileSync } = require('child_process');
const { TRAVELERS } = require('./fixtures/travelers');

// THE ONE PLACE THIS HARNESS TOUCHES THE DATABASE DIRECTLY, AND WHY THAT IS NOT THE RULE IT LOOKS
// LIKE. S1.5 banned planting rows with psql because doing so SKIPPED THE VERIFICATION GATE — the
// fixtures were bypassing the very rule the gate exists to enforce. Nothing is bypassed here. Every
// gated act still goes through the real API: auth, membership, the lifecycle ladder, photo ingest,
// the entry itself. Only *when it happened* is adjusted afterwards, and there is deliberately no API
// for that, because a real postcard is posted now. The clock is one app-wide Clock.systemUTC() bean,
// so the alternative would be a request-level override — test-only code in the production path,
// which is a worse trade than one visible, opt-in script.
//
// Kept OUT of seed-travelers.js on purpose: the seeder stays HTTP-only, so the exception is a thing
// you run rather than a thing hidden inside something else.

const DEPLOYED_OPT_IN = '--yes-backdate-the-deployed-rung';

const BASE = process.env.LARGATA_TEST_POOL_EMAIL_BASE;
const address = (tag) => { const [local, domain] = BASE.split('@'); return `${local}+${tag}@${domain}`; };

// Weighted toward recent, so the top of the feed is fresh and the tail goes back about six months.
// A feed where everything is equally old reads as a dump; one where everything is minutes old reads
// as a fixture. Neither looks like an app in use.
const BANDS = [
  { label: 'this week', share: 0.20, minDays: 0, maxDays: 7 },
  { label: 'this month', share: 0.30, minDays: 7, maxDays: 30 },
  { label: 'last three months', share: 0.30, minDays: 30, maxDays: 90 },
  { label: 'older', share: 0.20, minDays: 90, maxDays: 180 },
];

const only = (arg) => process.argv.find((a) => a.startsWith(`--${arg}=`))?.split('=')[1];

// Deterministic, so re-running produces the same history rather than reshuffling it. A trip's date
// is derived from its own title — the same trip lands in the same week every time it is rebuilt.
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

// An ongoing trip is being lived NOW, so its postcards belong to the last couple of days whatever
// the band says. Posting "three months ago" from a trip the app shows as in progress is the kind of
// incoherence the whole dataset exists to avoid.
function daysAgoFor(trip) {
  const roll = seededRandom(trip.title);
  if (trip.lifecycle === 'ongoing') return 0.2 + roll * 1.8;
  const band = bandFor(roll);
  const spread = seededRandom(trip.title + '/spread');
  return band.minDays + spread * (band.maxDays - band.minDays);
}

function psql(sql) {
  const url = process.env.LARGATA_DATABASE_URL;
  if (url !== undefined && url !== '') {
    // Not every machine has a psql binary — this one does not — so fall back to the postgres image,
    // which every machine running this stack already has. The URL goes in as an ENV VAR rather than
    // an argument: argv is visible in the host's process list, and a connection string is a
    // credential.
    if (hasLocalPsql()) {
      return execFileSync('psql', [url, '-tAc', sql], { encoding: 'utf8' }).trim();
    }
    return execFileSync(
      'docker',
      ['run', '--rm', '-i', '-e', `PGURL=${url}`, 'postgres:18-alpine',
        'sh', '-c', 'psql "$PGURL" -tAc "$(cat)"'],
      { encoding: 'utf8', input: sql },
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
  for (const traveler of chosen) {
    for (const trip of traveler.trips) {
      const postcards = trip.days.flatMap((d) => d.activities).filter((a) => a.post !== undefined).length;
      if (postcards === 0) continue;

      // Interpolated into SQL unquoted, so its being a number is load-bearing rather than incidental.
      // Everything else that reaches the statement goes through quote(); this asserts the one thing
      // that does not, rather than relying on the fixture staying trustworthy.
      const daysAgo = daysAgoFor(trip);
      if (!Number.isFinite(daysAgo)) {
        throw new Error(`refusing to build SQL: daysAgo for "${trip.title}" is ${daysAgo}`);
      }

      // Spreads a trip's own postcards across its span rather than stamping them all identically,
      // so a trip reads as several days of posting. Ordered by id (UUIDv7, so creation order) and
      // walked backwards from the trip's date.
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

      // psql prints its "UPDATE n" command tag as an output line even under -tAc, so counting raw
      // lines reports one extra per trip — which read as 124 postcards moved when 92 exist. Count
      // only the RETURNING rows.
      const rows = psql(sql)
        .split('\n')
        .filter((line) => line.trim() === '1').length;
      moved += rows;
      if (rows > 0) {
        console.log(
          `  ${String(Math.round(daysAgo)).padStart(3)}d ago  ${String(rows).padStart(2)} postcard(s)  `
            + `${traveler.name} — ${trip.title}`,
        );
      }
    }
  }

  console.log(`\n${moved} postcards backdated. The feed now spans about six months.`);
}

try {
  main();
} catch (e) {
  console.error(`\n${e.message}`);
  process.exit(1);
}
