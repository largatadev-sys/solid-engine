const { precompleteProfile } = require('./precomplete-profile');
const http = require('http');
const API = process.env.LARGATA_API_BASE_URL || 'http://localhost:8080';
const KEY = process.env.EXPO_PUBLIC_FIREBASE_API_KEY;
const BASE = process.env.LARGATA_TEST_POOL_EMAIL_BASE;
const PASSWORD = process.env.LARGATA_TEST_POOL_PASSWORD;
let pass = 0, fail = 0;
const check = (n, ok, d='') => { ok ? pass++ : fail++; console.log(`${ok?'  ok  ':' FAIL '} ${n}${d?'  — '+d:''}`); };

function req(url, method, body, headers={}, raw=false) {
  return new Promise((res, rej) => {
    const data = body === undefined ? undefined : (Buffer.isBuffer(body) ? body : JSON.stringify(body));
    const o = { method, headers: {...headers} };
    if (data) {
      if (!Buffer.isBuffer(body)) o.headers['Content-Type']='application/json';
      o.headers['Content-Length']=Buffer.byteLength(data);
    }
    const lib = url.startsWith('https') ? require('https') : http;
    const r = lib.request(new URL(url), o, (rs) => {
      const chunks=[];
      rs.on('data',c=>chunks.push(c));
      rs.on('end',()=>{
        const buf = Buffer.concat(chunks);
        if (raw) return res({status:rs.statusCode, bytes:buf, headers:rs.headers});
        let p; const b = buf.toString(); try{p=b?JSON.parse(b):undefined}catch{p=b}
        res({status:rs.statusCode, body:p, headers:rs.headers});
      });
    });
    r.on('error', rej); if (data) r.write(data); r.end();
  });
}
const api = (p, m, t, b) => req(API+p, m, b, t?{Authorization:'Bearer '+t}:{});

// An earlier step failing must not crash the run on a malformed URL — a crash hides every check
// after it, and "the walk failed" then reads identically to "the walk never ran".
const media = (url, t) =>
  typeof url === 'string' && url.startsWith('/')
    ? req(API+url, 'GET', undefined, t?{Authorization:'Bearer '+t}:{}, true)
    : Promise.resolve({status:0, bytes:Buffer.alloc(0)});

async function token(tag) {
  const email = BASE.replace('@', `+${tag}@`);
  const r = await req(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${KEY}`,'POST',{email,password:PASSWORD,returnSecureToken:true});
  await precompleteProfile(api, r.body.idToken, tag);
  return r.body.idToken;
}

const GPS_SENTINEL = 'LARGATA-DUMP-COORDS';
function jpegWithExif() {
  const plain = solidJpeg();
  const payload = Buffer.concat([Buffer.from('Exif\0\0','binary'), Buffer.from(GPS_SENTINEL,'ascii')]);
  const len = Buffer.alloc(2); len.writeUInt16BE(payload.length + 2);
  return Buffer.concat([plain.subarray(0,2), Buffer.from([0xFF,0xE1]), len, payload, plain.subarray(2)]);
}

function solidJpeg() {
  return Buffer.from(
    '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0a' +
    'HBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAAIAAgBAREA/8QAHwAAAQUBAQEB' +
    'AQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1Fh' +
    'ByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZ' +
    'WmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXG' +
    'x8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/9oACAEBAAA/APn+iiiv/9k=',
    'base64');
}

// A 1200x900 JPEG built from raw pixels, so both variants have room to differ — hand-encoded
// (baseline JFIF, one grey component) to keep this script dependency-free like its siblings.
function wideJpeg() {
  const w = 1200, h = 900;
  const header = Buffer.from([
    0xFF,0xD8, 0xFF,0xE0,0x00,0x10,0x4A,0x46,0x49,0x46,0x00,0x01,0x01,0x00,0x00,0x01,0x00,0x01,0x00,0x00,
  ]);
  const dqt = Buffer.concat([Buffer.from([0xFF,0xDB,0x00,0x43,0x00]), Buffer.alloc(64, 0x10)]);
  const sof = Buffer.from([
    0xFF,0xC0,0x00,0x0B,0x08, (h>>8)&0xFF, h&0xFF, (w>>8)&0xFF, w&0xFF, 0x01, 0x01,0x11,0x00,
  ]);
  const dht = Buffer.concat([
    Buffer.from([0xFF,0xC4,0x00,0x1F,0x00]),
    Buffer.from([0,1,5,1,1,1,1,1,1,0,0,0,0,0,0,0]),
    Buffer.from([0,1,2,3,4,5,6,7,8,9,10,11]),
    Buffer.from([0xFF,0xC4,0x00,0xB5,0x10]),
    Buffer.from([0,2,1,3,3,2,4,3,5,5,4,4,0,0,1,0x7D]),
    Buffer.alloc(162, 0x01),
  ]);
  const sos = Buffer.from([0xFF,0xDA,0x00,0x08,0x01,0x01,0x00,0x00,0x3F,0x00]);
  const scan = Buffer.alloc(24000, 0x5A);
  return Buffer.concat([header, dqt, sof, dht, sos, scan, Buffer.from([0xFF,0xD9])]);
}

function multipart(bytes, filename) {
  const b = '----largatadump' + Date.now();
  const head = Buffer.from(
    `--${b}\r\nContent-Disposition: form-data; name="photo"; filename="${filename}"\r\n` +
    `Content-Type: image/jpeg\r\n\r\n`, 'utf8');
  const tail = Buffer.from(`\r\n--${b}--\r\n`, 'utf8');
  return { boundary: b, body: Buffer.concat([head, bytes, tail]) };
}

async function upload(path, token, bytes, filename='dump.jpg') {
  const { boundary, body } = multipart(bytes, filename);
  return req(API+path, 'POST', body, {
    Authorization: 'Bearer ' + token,
    'Content-Type': `multipart/form-data; boundary=${boundary}`,
  });
}

(async () => {
  // t1 = owner, t2 = member, t3 = a traveler on no trip of ours (the stranger).
  const t1 = await token('t1');
  const t2 = await token('t2');
  const t3 = await token('t3');

  const trip = (await api('/v1/itineraries','POST',t1,{ title:'Photo Dump Trip', destinations:['Siargao'], durationDays:2 })).body;
  const dump = `/v1/itineraries/${trip.id}/photo-dump`;

  const invited = await api(`/v1/itineraries/${trip.id}/invitations`,'POST',t1,{ email: BASE.replace('@','+t2@') });
  const inbox = await api('/v1/invitations','GET',t2);
  const card = (inbox.body?.items ?? []).find(i => i.id === invited.body?.id);
  const accepted = await api(`/v1/invitations/${invited.body?.id}/accept`,'POST',t2,{});
  check('t2 joined the trip through the real invite → accept',
    invited.status===201 && card !== undefined && accepted.status===200,
    `${invited.status}/${card===undefined?'no card':'card'}/${accepted.status}`);

  const empty = await api(dump,'GET',t2);
  check('a fresh pool is empty and pages in the standard shape',
    empty.status===200 && Array.isArray(empty.body?.items) && empty.body.items.length===0 && !empty.body.nextCursor,
    `${empty.status}`);

  const mine = await upload(dump, t2, jpegWithExif());
  check('a member uploads a photo into the pool', mine.status===201, String(mine.status));
  check('the response carries backend media urls, never a provider hostname',
    mine.body?.url?.startsWith('/v1/media/') && mine.body?.thumbUrl?.endsWith('/thumb'),
    `${mine.body?.url} ${mine.body?.thumbUrl}`);

  const theirs = await upload(dump, t1, solidJpeg());
  check('the owner uploads into the same shared pool', theirs.status===201, String(theirs.status));

  const listed = await api(dump,'GET',t1);
  const ids = (listed.body?.items ?? []).map(p => p.id);
  check('every member sees one pool, in upload order',
    ids.length===2 && ids[0]===mine.body.id && ids[1]===theirs.body.id, ids.join(','));

  const bytes = await media(mine.body.url, t1);
  check('a member reads another member\'s photo bytes', bytes.status===200, String(bytes.status));
  check('INV-11: the GPS sentinel does not survive ingest',
    !bytes.bytes.includes(GPS_SENTINEL), 'sentinel found in served bytes');

  // The two variants only differ when the source is bigger than the 400px thumb bound — ingest
  // never upscales, so an 8x8 fixture would make this pass on a pipeline that minted one variant.
  const big = await upload(dump, t2, wideJpeg());
  const bigDisplay = await media(big.body?.url, t1);
  const bigThumb = await media(big.body?.thumbUrl, t1);
  check('a photo larger than the thumb bound serves two genuinely different variants',
    bigDisplay.status===200 && bigThumb.status===200 && bigThumb.bytes.length < bigDisplay.bytes.length,
    `${bigThumb.bytes.length} vs ${bigDisplay.bytes.length}`);
  await api(`${dump}/${big.body?.id}`,'DELETE',t2);

  const anon = await req(API+mine.body.url,'GET',undefined,{},true);
  check('an unauthenticated media GET is refused (the ANON-GET tell)', anon.status===401, String(anon.status));

  const strangerList = await api(dump,'GET',t3);
  const strangerRead = await media(mine.body.url, t3);
  const strangerUp = await upload(dump, t3, solidJpeg());
  const strangerDel = await api(`${dump}/${mine.body.id}`,'DELETE',t3);
  check('a non-member is masked on list, media, upload and delete',
    strangerList.status===404 && strangerRead.status===404 && strangerUp.status===404 && strangerDel.status===404,
    `${strangerList.status}/${strangerRead.status}/${strangerUp.status}/${strangerDel.status}`);

  const poaching = await api(`${dump}/${theirs.body.id}`,'DELETE',t2);
  check('a member deleting another member\'s photo is refused BY NAME, not masked',
    poaching.status===403 && poaching.body?.code==='NOT_PERMITTED',
    `${poaching.status} ${poaching.body?.code}`);

  const ownDelete = await api(`${dump}/${mine.body.id}`,'DELETE',t2);
  check('the uploader takes their own photo out', ownDelete.status===204, String(ownDelete.status));
  const goneBytes = await media(mine.body.url, t1);
  const goneThumb = await media(mine.body.thumbUrl, t1);
  check('deletion takes both stored variants with it',
    goneBytes.status===404 && goneThumb.status===404, `${goneBytes.status}/${goneThumb.status}`);

  const ownerDeletesTheirs = await api(`${dump}/${theirs.body.id}`,'DELETE',t1);
  check('the owner takes out anyone\'s photo', ownerDeletesTheirs.status===204, String(ownerDeletesTheirs.status));

  // The freeze is the plan: a published trip still accepts photos. This is the check that would
  // have caught the dump being scoped as plan data.
  for (const step of ['finish-planning','start','complete','publish']) {
    await api(`/v1/itineraries/${trip.id}/${step}`,'POST',t1);
  }
  const afterPublish = await upload(dump, t2, solidJpeg());
  check('a PUBLISHED trip still takes photos — the freeze is the plan, not the pool',
    afterPublish.status===201, String(afterPublish.status));
  const strangerAfterPublish = await media(afterPublish.body.url, t3);
  check('publishing never opens the pool to travelers outside the trip',
    strangerAfterPublish.status===404, String(strangerAfterPublish.status));

  await api(`/v1/itineraries/${trip.id}/archive`,'POST',t1);
  const archivedUpload = await upload(dump, t1, solidJpeg());
  const archivedDelete = await api(`${dump}/${afterPublish.body.id}`,'DELETE',t1);
  check('an ARCHIVED trip refuses upload and delete (the fence)',
    archivedUpload.status===409 && archivedDelete.status===409,
    `${archivedUpload.status}/${archivedDelete.status}`);
  const ownerStillReads = await api(dump,'GET',t1);
  const memberMasked = await api(dump,'GET',t2);
  check('the archived pool stays readable to the owner and masks the member',
    ownerStillReads.status===200 && ownerStillReads.body.items.length===1 && memberMasked.status===404,
    `${ownerStillReads.status}/${memberMasked.status}`);

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
