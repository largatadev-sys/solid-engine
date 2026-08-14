const fs = require('fs');
const https = require('https');
const path = require('path');
const { TRAVELERS, DUMP_QUERIES } = require('./fixtures/travelers');
const { PER_PLACE, CACHE_DIR, slug, photoPath, photosFor } = require('./photoPool');

const KEY = process.env.PEXELS_API_KEY;
const OUT = CACHE_DIR;
const CREDITS = path.join(OUT, 'CREDITS.json');

function getJson(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { Authorization: KEY } }, (res) => {
        let body = '';
        res.on('data', (c) => (body += c));
        res.on('end', () => {
          if (res.statusCode === 429) {
            reject(new Error('Pexels rate limit reached (200/hour). Re-run later — finished files are kept.'));
            return;
          }
          if (res.statusCode !== 200) {
            reject(new Error(`${res.statusCode} from Pexels: ${body.slice(0, 200)}`));
            return;
          }
          resolve({ body: JSON.parse(body), remaining: res.headers['x-ratelimit-remaining'] });
        });
      })
      .on('error', reject);
  });
}

function download(url, to) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          download(res.headers.location, to).then(resolve, reject);
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error(`${res.statusCode} downloading ${url}`));
          return;
        }
        const file = fs.createWriteStream(to);
        res.pipe(file);
        file.on('finish', () => file.close(() => resolve(fs.statSync(to).size)));
        file.on('error', reject);
      })
      .on('error', reject);
  });
}

function wanted() {
  const places = new Set();
  for (const traveler of TRAVELERS) {
    for (const trip of traveler.trips) {
      for (const day of trip.days) places.add(day.at);
    }
  }
  return [
    ...[...places].map((query) => ({ query, kind: 'place', take: PER_PLACE })),
    ...DUMP_QUERIES.map((query) => ({ query, kind: 'dump', take: 1 })),
    ...TRAVELERS.map((t) => ({ query: t.bird, kind: 'bird', take: 1 })),
  ];
}

async function main() {
  if (KEY === undefined || KEY === '') {
    console.error('PEXELS_API_KEY is not set.\n');
    console.error('Get a free key at https://www.pexels.com/api/new/ and put it in the gitignored');
    console.error('mobile/.env as PEXELS_API_KEY, then:\n');
    console.error('  cd mobile && set -a && . ./.env && set +a && node scripts/fetch-fixtures.js');
    process.exit(2);
  }

  fs.mkdirSync(OUT, { recursive: true });
  const credits = fs.existsSync(CREDITS) ? JSON.parse(fs.readFileSync(CREDITS, 'utf8')) : {};

  const jobs = wanted();
  console.log(`${jobs.length} searches, up to ${PER_PLACE} photos per place\n`);

  let searched = 0;
  let saved = 0;
  let bytes = 0;
  let remaining;

  for (const job of jobs) {
    if (photosFor(OUT, job.query).length >= job.take) {
      console.log(`  have  ${slug(job.query)}`);
      continue;
    }

    const answer = await getJson(
      `https://api.pexels.com/v1/search?per_page=${job.take}&orientation=landscape`
        + `&query=${encodeURIComponent(job.query)}`,
    );
    searched += 1;
    remaining = answer.remaining ?? remaining;

    const photos = answer.body.photos ?? [];
    if (photos.length === 0) {
      console.log(` MISS  ${job.query} — no result`);
      continue;
    }

    let added = 0;
    for (const [index, photo] of photos.entries()) {
      const file = photoPath(OUT, job.query, index + 1);
      if (fs.existsSync(file)) continue;
      const name = path.basename(file);

      let size;
      try {
        size = await download(photo.src.large, file);
      } catch (e) {
        if (fs.existsSync(file)) fs.unlinkSync(file);
        console.log(` skip  ${name} — ${e.message.split(' ')[0]} from the CDN`);
        continue;
      }

      bytes += size;
      saved += 1;
      added += 1;
      credits[name] = {
        query: job.query,
        kind: job.kind,
        alt: photo.alt,
        photographer: photo.photographer,
        photographerUrl: photo.photographer_url,
        source: photo.url,
        provider: 'Pexels',
        providerUrl: 'https://www.pexels.com',
        license: 'Pexels License — https://www.pexels.com/license/',
      };
    }
    console.log(`   got  ${slug(job.query).padEnd(38)} ${added} new  (${photos.length} returned)  © ${photos[0].photographer}`);
    fs.writeFileSync(CREDITS, JSON.stringify(credits, null, 2) + '\n');
  }

  console.log(`\n${searched} searches, ${saved} photos, ${Math.round(bytes / 1024 / 1024)}MB`);
  if (remaining !== undefined) console.log(`${remaining} Pexels requests left this hour.`);
  console.log(`Attribution per file: ${CREDITS}`);
}

main().catch((e) => {
  console.error(`\n${e.message}`);
  process.exit(1);
});
