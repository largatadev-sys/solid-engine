const fs = require('fs');
const os = require('os');
const path = require('path');

const CACHE_DIR = process.env.LARGATA_PHOTO_CACHE
  || path.join(os.homedir(), '.largata', 'photo-cache');

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

function photoForSlot(dir, query, slot) {
  const pool = photosFor(dir, query);
  return pool.length === 0 ? undefined : pool[slot % pool.length];
}

module.exports = { PER_PLACE, CACHE_DIR, slug, photoPath, photosFor, photoForSlot };
