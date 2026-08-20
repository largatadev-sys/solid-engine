

const BASE = process.argv[2] ?? 'https://api-dev.largata.com';
const HOLD_MS = Number(process.argv[3] ?? 95_000);
const ORIGIN = process.argv[4] ?? null;

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
  if (!response.ok) {
    fail(`ticket mint returned ${response.status}: ${(await response.text()).slice(0, 200)}`);
  }
  return response.json();
}

async function signIn() {
  const apiKey = process.env.EXPO_PUBLIC_FIREBASE_API_KEY;
  const email = process.env.LARGATA_TEST_POOL_EMAIL_BASE;
  const password = process.env.LARGATA_TEST_POOL_PASSWORD;
  if (!apiKey || !email || !password) {
    fail('need EXPO_PUBLIC_FIREBASE_API_KEY, LARGATA_TEST_POOL_EMAIL_BASE, LARGATA_TEST_POOL_PASSWORD in the environment');
  }
  const [local, domain] = email.split('@');
  const tagged = `${local}+t1@${domain}`;
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: tagged, password, returnSecureToken: true }),
    },
  );
  if (!response.ok) {
    fail(`sign-in for ${tagged} returned ${response.status}: ${(await response.text()).slice(0, 200)}`);
  }
  const body = await response.json();
  log(`signed in as ${tagged}`);
  return body.idToken;
}

const idToken = await signIn();
const { ticket, expiresInSeconds } = await mintTicket(idToken);
log(`ticket minted, ttl=${expiresInSeconds}s, length=${ticket.length}`);

const url = `${wsBase}/ws?ticket=${encodeURIComponent(ticket)}`;
log(`connecting to ${url.replace(/ticket=[^&]+/, 'ticket=<redacted>')}`);
if (ORIGIN) log(`sending Origin: ${ORIGIN}`);

const socket = new WebSocket(url);

const frames = [];
let openedAt = null;
let subscribedAt = null;
let firstEchoAt = null;
let lastEchoAt = null;
let closed = null;
const watchdog = setTimeout(
  () => fail(`global timeout — the run never completed (frames=${frames.length})`),
  HOLD_MS + 60_000,
);

socket.addEventListener('open', () => {
  openedAt = Date.now();
  log('UPGRADE ACCEPTED — the Railway edge forwarded the handshake and the ticket redeemed');
  socket.send(JSON.stringify({ action: 'subscribe', topic: 'debug:echo' }));
});

socket.addEventListener('message', (event) => {
  const raw = String(event.data);
  frames.push({ at: Date.now(), raw });
  let frame;
  try {
    frame = JSON.parse(raw);
  } catch {
    log('non-JSON frame:', raw.slice(0, 120));
    return;
  }
  if (frame.action === 'subscribed') {
    subscribedAt = Date.now();
    log(`SUBSCRIBED to ${frame.topic}`);
    socket.send(JSON.stringify({ action: 'echo', payload: 'first' }));
    return;
  }
  if (frame.action === 'error') {
    log(`ERROR FRAME code=${frame.code} topic=${frame.topic ?? '-'}`);
    return;
  }
  if (frame.type === 'debug.echo') {
    const now = Date.now();
    if (frame.payload === 'first') {
      firstEchoAt = now;
      log(`ECHO 1 received (payload="${frame.payload}", eventId=${frame.eventId}, at=${frame.at})`);
      log(`holding for ${Math.round(HOLD_MS / 1000)}s across heartbeat cycles...`);
      setTimeout(() => {
        if (socket.readyState !== 1) {
          fail(`socket was no longer OPEN after the hold (readyState=${socket.readyState})`);
        }
        log('hold elapsed, socket still reports OPEN — sending the liveness echo');
        socket.send(JSON.stringify({ action: 'echo', payload: 'after-hold' }));
      }, HOLD_MS);
    }
    if (frame.payload === 'after-hold') {
      lastEchoAt = now;
      report();
      socket.close();
    }
  }
});

socket.addEventListener('error', (event) => {
  log('SOCKET ERROR:', event.message ?? String(event.error ?? event));
});

socket.addEventListener('close', (event) => {
  closed = { code: event.code, reason: event.reason, at: Date.now() };
  log(`CLOSED code=${event.code} reason="${event.reason}"`);
  if (lastEchoAt === null) {
    const heldFor = openedAt ? ((closed.at - openedAt) / 1000).toFixed(1) : '0';
    fail(`the connection closed after ${heldFor}s without completing the hold — the edge or the server dropped it`);
  }
});

function report() {
  const holdSeconds = (lastEchoAt - openedAt) / 1000;
  const cycles = Math.floor(holdSeconds / 30);
  console.log('');
  console.log('================ WS-1 TICKET 01 — DEPLOYED wss:// EVIDENCE ================');
  console.log(`URL tested            : ${wsBase}/ws?ticket=<single-use>`);
  console.log(`Origin sent           : ${ORIGIN ?? '(none — native-client posture)'}`);
  console.log(`Upgrade accepted      : YES (101 Switching Protocols through the Railway edge)`);
  console.log(`Query param survived  : YES — the ticket redeemed server-side, so ?ticket= arrived intact`);
  console.log(`Hold duration         : ${holdSeconds.toFixed(1)}s`);
  console.log(`Heartbeat cycles      : ${cycles} (server pings every 30s)`);
  console.log(`Still live after hold : YES — echo round-tripped at the end, not merely readyState===OPEN`);
  console.log(`Idle-timeout observed : ${closed ? 'connection closed early — see above' : 'NONE — the edge did not drop an otherwise-silent socket'}`);
  console.log(`Frames received       : ${frames.length}`);
  console.log('==========================================================================');
  console.log('');
  console.log("RESULT: PASSED");
  clearTimeout(watchdog);
}

