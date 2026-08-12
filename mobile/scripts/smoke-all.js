const { execFileSync } = require('child_process');
const http = require('http');

const API = process.env.LARGATA_API_BASE_URL || 'http://localhost:8080';
const PREVIEW = process.env.LARGATA_PREVIEW_URL || 'http://localhost:8081';

const API_SMOKES = [
  'smoke-lifecycle.js',
  'smoke-create-flow.js',
  'smoke-publish.js',
  'smoke-buffered-plan.js',
  'smoke-media.js',
  'smoke-photo-dump.js',
  'smoke-diary.js',
];
const WEB_WALKS = [
  'drive-buffered-plan.js',
  'drive-photo-dump.js',
  'drive-diary.js',
  'drive-profile.js',
  'drive-home.js',
];

const KNOWN_RED = {};

function reachable(url) {
  return new Promise((resolve) => {
    const request = http.get(url, (res) => {
      res.resume();
      resolve(res.statusCode !== undefined && res.statusCode < 500);
    });
    request.on('error', () => resolve(false));
    request.setTimeout(5000, () => {
      request.destroy();
      resolve(false);
    });
  });
}

function run(script, env = {}) {
  process.stdout.write(`\n──────── ${script} ────────\n`);
  try {
    execFileSync(process.execPath, [`${__dirname}/${script}`], {
      stdio: 'inherit',
      env: { ...process.env, ...env },
    });
    return true;
  } catch {
    return false;
  }
}

(async () => {
  const rungs = [
    [`backend ${API}`, await reachable(`${API}/v1/health`)],
    [`web preview ${PREVIEW}`, await reachable(`${PREVIEW}/`)],
  ];
  for (const [name, up] of rungs) {
    console.log(`${up ? '  up  ' : ' DOWN '} ${name}`);
  }
  if (rungs.some(([, up]) => !up)) {
    console.error('\nA rung is down. `docker compose up -d --build` for the backend; rebuild and run');
    console.error('the preview container per CLAUDE.md before trusting any result below.');
    process.exit(1);
  }

  const failed = [];
  for (const script of API_SMOKES) {
    if (!run(script)) failed.push(script);
  }
  for (const script of WEB_WALKS) {
    if (!run(script)) failed.push(script);
  }

  console.log('\n════════ two rungs of three ════════');

  const regressions = failed.filter((script) => KNOWN_RED[script] === undefined);
  const expected = failed.filter((script) => KNOWN_RED[script] !== undefined);

  if (expected.length > 0) {
    console.log('\nAlready red before this branch — verified against dev, not a regression:');
    for (const script of expected) console.log(`  ${script}: ${KNOWN_RED[script]}`);
    console.log('  Re-baseline against dev before treating any of these as new.');
  }

  if (regressions.length > 0) {
    console.error(`\nFAILED: ${regressions.join(', ')}`);
    process.exit(1);
  }
  console.log('API smokes and web-preview walks all green.');
  console.log('\nThe THIRD rung is not automatable: walk the emulator and open the screenshots.');
  console.log('A driver reading innerText cannot see a layout defect (regression line 12).');
})();
