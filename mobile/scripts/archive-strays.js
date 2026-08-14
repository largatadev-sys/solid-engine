const { TRAVELERS } = require('./fixtures/travelers');
const { API, api, poolToken, allMyTrips, requirePoolEnv } = require('./poolApi');

// Archives every trip a pool account can see that is NOT in the current fixture — the walk debris
// ("Kyoto temples 881845", "Feed walk 057804") that drive scripts leave behind. Locally the DB wipe
// makes this pointless; it exists for the deployed rung, where archive is the only cleanup there is
// and stray published trips would otherwise sit inside Discovery next to the curated dataset.
//
// Scope is structural, not judgemental: it signs in as the ten pool travelers and archives what
// THEY own, so nothing belonging to a real account can be touched — a trip the pool account merely
// belongs to answers 4xx to the archive call, which is counted as refused and moved past. The one
// category it cannot reach is the orphans: trips owned by deleted-and-recreated Firebase accounts
// (the S4.22 finding) have no owner who can sign in, and stay until the product grows a deletion
// story. Titles are matched against the GLOBAL fixture set, so one traveler's membership on
// another's fixture trip is never treated as a stray.


const DEPLOYED_OPT_IN = '--yes-archive-strays-on-the-deployed-rung';


async function main() {
  requirePoolEnv();

  const deployed = !API.startsWith('http://localhost');
  if (deployed && !process.argv.includes(DEPLOYED_OPT_IN)) {
    console.error(`Refusing to archive on ${API} without ${DEPLOYED_OPT_IN}.`);
    console.error('Archiving is the only cleanup the deployed rung has, and it is not reversible');
    console.error('by any endpoint this app ships. Pass the flag only if you mean it.');
    process.exit(2);
  }

  const fixture = new Set(TRAVELERS.flatMap((t) => t.trips.map((trip) => trip.title)));
  console.log(`archiving strays on ${API}${deployed ? '  (DEPLOYED RUNG)' : ''}`);
  console.log(`${fixture.size} fixture titles are protected\n`);

  let archived = 0;
  let refused = 0;
  for (const traveler of TRAVELERS) {
    // poolApi's poolToken throws where this script's own copy returned undefined. An unusable
    // account is a pool problem, not a reason to abandon the nine that work, so the skip stays —
    // it just has to catch now.
    let token;
    try {
      token = await poolToken(traveler.tag);
    } catch {
      console.log(`  ${traveler.tag}  SKIPPED — cannot sign in`);
      continue;
    }
    const mine = await allMyTrips(token);
    const strays = mine.filter((trip) => !fixture.has(trip.title) && trip.archived !== true);
    let ok = 0;
    for (const trip of strays) {
      const res = await api(`/v1/itineraries/${trip.id}/archive`, 'POST', token);
      if (res.status < 300) {
        ok += 1;
        console.log(`  ${traveler.tag}  archived  ${trip.title}`);
      } else {
        refused += 1;
      }
    }
    archived += ok;
    const kept = strays.length - ok;
    console.log(`  ${traveler.tag}  ${mine.length} visible, ${strays.length} strays, ${ok} archived${kept > 0 ? `, ${kept} refused (not the owner)` : ''}`);
  }

  console.log(`\n${archived} stray trip(s) archived, ${refused} refused as memberships.`);
}

main().catch((e) => {
  console.error(`\n${e.message}`);
  process.exit(1);
});
