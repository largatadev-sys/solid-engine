const fs = require('fs');
const path = require('path');

// One definition, imported by the fetcher and the seeder. It lived as a literal 3 in both, unsynced:
// raising it in fetch-fixtures.js alone downloads photos that photosFor() never looks for, and the
// fetch log still reports success. Two call sites, one number, no way to notice the drift.
const PER_PLACE = 6;

const slug = (text) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

function photoPath(dir, query, n) {
  return path.join(dir, `${slug(query)}-${n}.jpg`);
}

function photosFor(dir, query) {
  const found = [];
  for (let n = 1; n <= PER_PLACE; n += 1) {
    const file = photoPath(dir, query, n);
    if (fs.existsSync(file)) found.push(file);
  }
  return found;
}

// The one definition of which photo an activity gets. It has to be shared: the builder derives an
// activity's title from its photo's caption while the seeder uploads that photo, and if the two
// computed the slot independently they would drift into titles describing a picture the traveler
// never sees — silently, since nothing downstream compares them.
function photoForSlot(dir, query, slot) {
  const pool = photosFor(dir, query);
  return pool.length === 0 ? undefined : pool[slot % pool.length];
}

module.exports = { PER_PLACE, slug, photoPath, photosFor, photoForSlot };
