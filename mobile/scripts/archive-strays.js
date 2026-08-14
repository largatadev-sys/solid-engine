const { TRAVELERS } = require('./fixtures/travelers');
const { API, api, poolToken, allMyTrips, requirePoolEnv } = require('./poolApi');


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
