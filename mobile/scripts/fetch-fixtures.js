const fs = require('fs');
const https = require('https');
const path = require('path');
const { TRIP, DUMP_QUERIES } = require('./fixtures/australia-trip');

const KEY = process.env.UNSPLASH_ACCESS_KEY;
const OUT = path.join(__dirname, 'fixtures', 'australia');
const CREDITS = path.join(OUT, 'CREDITS.json');

const slug = (query) => query.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

function getJson(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { Authorization: `Client-ID ${KEY}` } }, (res) => {
        let body = '';
        res.on('data', (c) => (body += c));
        res.on('end', () => {
          if (res.statusCode !== 200) {
            reject(new Error(`${res.statusCode} from Unsplash: ${body.slice(0, 200)}`));
            return;
          }
          resolve(JSON.parse(body));
        });
      })
      .on('error', reject);
  });
}

function download(url, to) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
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

async function main() {
  if (KEY === undefined || KEY === '') {
    console.error('UNSPLASH_ACCESS_KEY is not set.\n');
    console.error('Register a free application at https://unsplash.com/oauth/applications and put');
    console.error('its Access Key in mobile/.env as UNSPLASH_ACCESS_KEY. The file is gitignored.\n');
    console.error('Then:  cd mobile && set -a && . ./.env && set +a && node scripts/fetch-fixtures.js');
    process.exit(2);
  }

  fs.mkdirSync(OUT, { recursive: true });

  const queries = [
    ...TRIP.days.flatMap((day) => day.activities.map((a) => a.photoQuery)),
    ...DUMP_QUERIES,
  ].filter((q) => q !== undefined);

  const unique = [...new Set(queries)];
  const credits = {};
  let fetched = 0;

  for (const query of unique) {
    const file = path.join(OUT, `${slug(query)}.jpg`);
    if (fs.existsSync(file)) {
      console.log(`  have  ${slug(query)}.jpg`);
      continue;
    }
    const found = await getJson(
      `https://api.unsplash.com/search/photos?per_page=1&orientation=landscape&query=${encodeURIComponent(query)}`,
    );
    const photo = found.results?.[0];
    if (photo === undefined) {
      console.log(` MISS  ${query} — no result, this activity will seed without a photo`);
      continue;
    }
    const bytes = await download(`${photo.urls.raw}&w=1600&q=80&fm=jpg`, file);
    credits[`${slug(query)}.jpg`] = {
      query,
      photographer: photo.user.name,
      photographerUrl: photo.user.links.html,
      source: photo.links.html,
      license: 'Unsplash License — https://unsplash.com/license',
    };
    fetched += 1;
    console.log(`   got  ${slug(query)}.jpg  ${Math.round(bytes / 1024)}KB  © ${photo.user.name}`);
  }

  const existing = fs.existsSync(CREDITS) ? JSON.parse(fs.readFileSync(CREDITS, 'utf8')) : {};
  fs.writeFileSync(CREDITS, JSON.stringify({ ...existing, ...credits }, null, 2) + '\n');

  console.log(`\n${fetched} fetched, ${unique.length} wanted. Credits in fixtures/australia/CREDITS.json`);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
