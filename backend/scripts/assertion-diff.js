#!/usr/bin/env node
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const BASE = process.argv[2] || 'e249976d';
const REPO = path.resolve(__dirname, '..', '..');
const SCOPE = 'backend/src/test';

// The guards ARE this branch's apparatus — the two windows, the legacy exemption and the
// meta-test's lists are asserted INTO existence here, so counting their churn as drift would make
// the number this script exists to report permanently non-zero and therefore unreadable. Every
// other test file is a pre-existing behaviour test and is compared line for line.
const THIS_BRANCHS_OWN_APPARATUS = /BoundaryTest\.java$|ModuleGuardMetaTest\.java$/;

const ASSERTION = /^\s*(assertThat|assertEquals|assertTrue|assertFalse|assertNull|assertNotNull|assertThrows|assertAll|assertArrayEquals|assertSame|assertIterableEquals|verify|\.as\(|\.isEqualTo\(|\.contains|\.hasSize|\.isEmpty\(|\.isNotEmpty\(|\.expectStatus\(|\.expectBody|\.jsonPath\()/;

const RENAMED_SYMBOLS = [
  ['TripsTopic.', 'TripEventTypes.'],
  ['.admitMember(', '.admit('],
  ['.itineraryIdsByWorkspace(', '.tripIdsByWorkspace('],
  ['.itineraryIdsInSightOf(', '.tripIdsInSightOf('],
];

function git(...args) {
  return execFileSync('git', args, { cwd: REPO, encoding: 'utf8', maxBuffer: 1 << 28 });
}

function show(rev, file) {
  try {
    return execFileSync('git', ['show', rev + ':' + file], {
      cwd: REPO, encoding: 'utf8', maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'ignore'],
    });
  } catch {
    return null;
  }
}

function readWorking(file) {
  const full = path.join(REPO, file);
  return fs.existsSync(full) ? fs.readFileSync(full, 'utf8') : null;
}

function normalise(line) {
  let out = line;
  for (const [from, to] of RENAMED_SYMBOLS) out = out.split(from).join(to);
  return out;
}

function assertionsIn(text) {
  return text.split('\n').map(l => l.trim()).filter(l => ASSERTION.test(l)).map(normalise);
}

const renamedFrom = new Map();
for (const line of git('diff', '--name-status', '-M', BASE, '--', SCOPE).split('\n')) {
  const parts = line.split('\t');
  if (parts[0] && parts[0].startsWith('R') && parts.length === 3) {
    renamedFrom.set(parts[2].trim(), parts[1].trim());
  }
}

const files = git('diff', '--name-only', BASE, '--', SCOPE)
  .split('\n')
  .map(l => l.trim())
  .filter(l => l.endsWith('.java'))
  .filter(l => !THIS_BRANCHS_OWN_APPARATUS.test(l));

const differences = [];
let compared = 0;
let born = 0;

for (const file of files) {
  const before = show(BASE, renamedFrom.get(file) || file);
  const after = readWorking(file);
  if (before === null) { born += 1; continue; }
  if (after === null) {
    differences.push(file + ': DELETED — a test file that existed at ' + BASE + ' is gone');
    continue;
  }
  compared += 1;
  const was = assertionsIn(before);
  const now = assertionsIn(after);
  if (was.length !== now.length) {
    differences.push(file + ': ' + was.length + ' assertion lines at ' + BASE + ', ' + now.length + ' now');
    continue;
  }
  for (let i = 0; i < was.length; i += 1) {
    if (was[i] !== now[i]) {
      differences.push(file + ':\n    was: ' + was[i] + '\n    now: ' + now[i]);
    }
  }
}

console.log('assertion-diff against ' + BASE);
console.log('  test files changed on this branch: ' + files.length);
console.log('  pre-existing files compared:       ' + compared);
console.log('  new files (nothing to compare):    ' + born);
console.log('  PRE-EXISTING ASSERTIONS CHANGED:   ' + differences.length);

if (differences.length > 0) {
  console.log('');
  for (const d of differences) console.log('  ' + d);
  process.exit(1);
}
