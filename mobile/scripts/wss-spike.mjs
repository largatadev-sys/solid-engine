import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { poolToken, requirePoolEnv } = require('./poolApi.js');

const BASE = process.argv[2] ?? 'https://api-dev.largata.com';
const HOLD_MS = Number(process.argv[3] ?? 95_000);
const TAG = process.argv[4] ?? 't1';

const httpBase = BASE.replace(/\/+$/, '');
const wsBase = httpBase.replace(/^http(s?):\/\//, 'ws$1://');

const log = (...parts) => console.log(`[${new Date().toISOString()}]`, ...parts);

function fail(why) {
  console.log('');
  console.log('RESULT: FAILED —', why);
  process.exit(1);
}

async function mintTicket(idToken) {
  const response = await fetch(`${httpBase}/v1/ws-ticket`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${idToken}`, Accept: 'application/json' },
  });
  if (!response.ok) fail(`ticket mint returned ${response.status}`);
  return response.json();
}

requirePoolEnv();
const idToken = await poolToken(TAG);
log(`signed in as pool ${TAG}`);

const { ticket, expiresInSeconds } = await mintTicket(idToken);
log(`ticket minted, ttl=${expiresInSeconds}s, length=${ticket.length}`);

const url = `${wsBase}/ws?ticket=${encodeURIComponent(ticket)}`;
log(`connecting to ${wsBase}/ws?ticket=<redacted>`);

const socket = new WebSocket(url);

const frames = [];
let openedAt = null;
let lastEchoAt = null;
let closedEarly = null;

const watchdog = setTimeout(
  () => fail(`global timeout — the run never completed (frames=${frames.length})`),
  HOLD_MS + 60_000,
);

socket.addEventListener('open', () => {
  openedAt = Date.now();
  log('UPGRADE ACCEPTED — the edge forwarded the handshake and the ticket redeemed');
  socket.send(JSON.stringify({ action: 'subscribe', topic: 'debug:echo' }));
});

socket.addEventListener('message', (event) => {
  const raw = String(event.data);
  frames.push({ at: Date.now(), raw });

  let frame;
  try {
    frame = JSON.parse(raw);
  } catch {
    log('non-JSON frame ignored');
    return;
  }

  if (frame.action === 'subscribed') {
    log(`SUBSCRIBED to ${frame.topic}`);
    socket.send(JSON.stringify({ action: 'echo', payload: 'first' }));
    return;
  }
  if (frame.action === 'error') {
    fail(`server answered an error frame: ${frame.code}`);
  }
  if (frame.type !== 'debug.echo') return;

  if (frame.payload === 'first') {
    log(`ECHO 1 received (eventId=${frame.eventId}, at=${frame.at})`);
    log(`holding for ${Math.round(HOLD_MS / 1000)}s across heartbeat cycles...`);
    setTimeout(() => {
      if (socket.readyState !== WebSocket.OPEN) {
        fail(`socket was no longer OPEN after the hold (readyState=${socket.readyState})`);
      }
      log('hold elapsed, socket still reports OPEN — sending the liveness echo');
      socket.send(JSON.stringify({ action: 'echo', payload: 'after-hold' }));
    }, HOLD_MS);
    return;
  }

  if (frame.payload === 'after-hold') {
    lastEchoAt = Date.now();
    report();
    clearTimeout(watchdog);
    socket.close();
  }
});

socket.addEventListener('error', () => log('SOCKET ERROR'));

socket.addEventListener('close', (event) => {
  log(`CLOSED code=${event.code}`);
  if (lastEchoAt === null) {
    closedEarly = event.code;
    const heldFor = openedAt ? ((Date.now() - openedAt) / 1000).toFixed(1) : '0';
    fail(`the connection closed (code ${closedEarly}) after ${heldFor}s without completing the hold`);
  }
});

function report() {
  const holdSeconds = (lastEchoAt - openedAt) / 1000;
  console.log('');
  console.log('================ WS-1 TICKET 01 — wss:// EVIDENCE ================');
  console.log(`URL tested            : ${wsBase}/ws?ticket=<single-use>`);
  console.log(`Client                : Node global WebSocket, no Origin header sent`);
  console.log(`Traveler              : pool ${TAG}`);
  console.log(`Upgrade accepted      : the socket opened, so the edge forwarded the handshake`);
  console.log(`Query param survived  : the ticket redeemed server-side, so ?ticket= arrived intact`);
  console.log(`Hold duration         : ${holdSeconds.toFixed(1)}s`);
  console.log(`Heartbeat cycles      : ${Math.floor(holdSeconds / 30)} (server pings every 30s)`);
  console.log(`Still live after hold : an echo round-tripped at the end, not merely readyState OPEN`);
  console.log(`Idle-timeout observed : none within the hold — an early close would have failed above`);
  console.log(`Frames received       : ${frames.length}`);
  console.log('=================================================================');
  console.log('');
  console.log('RESULT: PASSED');
}
