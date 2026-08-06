const { precompleteProfile } = require('./precomplete-profile');
const http = require('http');
const zlib = require('zlib');
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

async function token(tag) {
  const email = BASE.replace('@', `+${tag}@`);
  const r = await req(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${KEY}`,'POST',{email,password:PASSWORD,returnSecureToken:true});
  await precompleteProfile(api, r.body.idToken, tag);
  return r.body.idToken;
}

// A real JPEG, assembled rather than fixture-loaded so the script stays dependency-free. The EXIF
// APP1 segment carries a sentinel we then look for in the served bytes: if it survives, INV-11 is
// not holding on the deployed path, whatever the unit tests say.
const GPS_SENTINEL = 'LARGATA-HOME-COORDS';
function jpegWithExif() {
  const plain = solidJpeg();
  const payload = Buffer.concat([Buffer.from('Exif\0\0','binary'), Buffer.from(GPS_SENTINEL,'ascii')]);
  const len = Buffer.alloc(2); len.writeUInt16BE(payload.length + 2);
  return Buffer.concat([plain.subarray(0,2), Buffer.from([0xFF,0xE1]), len, payload, plain.subarray(2)]);
}

// A minimal baseline JPEG (8x8 grey) — hand-built so no image library is needed here.
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

// A 1200x900 JPEG built from raw pixels, so both variants have room to differ. Encoded by hand
// (baseline JFIF, one grey component) rather than by an image library — this script must stay
// dependency-free like its siblings.
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
  const b = '----largatasmoke' + Date.now();
  const head = Buffer.from(
    `--${b}\r\nContent-Disposition: form-data; name="photo"; filename="${filename}"\r\n` +
    `Content-Type: image/jpeg\r\n\r\n`, 'utf8');
  const tail = Buffer.from(`\r\n--${b}--\r\n`, 'utf8');
  return { boundary: b, body: Buffer.concat([head, bytes, tail]) };
}

async function upload(path, token, bytes, filename='photo.jpg') {
  const { boundary, body } = multipart(bytes, filename);
  return req(API+path, 'POST', body, {
    Authorization: 'Bearer ' + token,
    'Content-Type': `multipart/form-data; boundary=${boundary}`,
  });
}

(async () => {
  const t1 = await token('t1');
  const t2 = await token('t2');

  const up = await upload('/v1/me/avatar', t1, jpegWithExif());
  check('an avatar uploads and lands on the profile', up.status===200 && typeof up.body.avatarUrl==='string', `${up.status} ${up.body?.avatarUrl}`);
  check('the stored url is OUR url, never a provider hostname', up.body.avatarUrl?.startsWith('/v1/media/'), up.body?.avatarUrl);

  const url = up.body.avatarUrl;
  const served = await req(API+url, 'GET', undefined, {Authorization:'Bearer '+t1}, true);
  check('the avatar serves back as a jpeg', served.status===200 && String(served.headers['content-type']).includes('image/jpeg'), `${served.status} ${served.headers['content-type']}`);
  check('the served bytes really are a JPEG', served.bytes[0]===0xFF && served.bytes[1]===0xD8, `magic=${served.bytes?.[0]?.toString(16)}${served.bytes?.[1]?.toString(16)}`);

  // INV-11, checked where it actually matters: on the bytes the server hands out.
  check('the GPS sentinel does NOT survive ingest (INV-11)', !served.bytes.includes(Buffer.from(GPS_SENTINEL,'ascii')), 'sentinel absent from served bytes');
  check('no EXIF marker survives at all (INV-11)', !served.bytes.includes(Buffer.from('Exif\0\0','binary')), 'no APP1/Exif header');

  // A LARGE upload, so the two variants genuinely differ. The 8x8 fixture above is smaller than
  // both caps, which makes display and thumbnail byte-identical — an assertion that would pass just
  // as happily if resizing were broken entirely.
  const bigUp = await upload('/v1/me/avatar', t1, wideJpeg());
  const bigUrl = bigUp.body.avatarUrl;
  const bigDisplay = await req(API+bigUrl, 'GET', undefined, {Authorization:'Bearer '+t1}, true);
  const thumb = await req(API+bigUrl+'/thumb', 'GET', undefined, {Authorization:'Bearer '+t1}, true);
  check('the thumbnail serves and is genuinely smaller than the display variant',
    thumb.status===200 && thumb.bytes.length < bigDisplay.bytes.length,
    `thumb=${thumb.bytes?.length} display=${bigDisplay.bytes?.length}`);

  const supersededByBigUpload = await req(API+url, 'GET', undefined, {Authorization:'Bearer '+t1}, true);
  check('an avatar replaced by a later upload is gone immediately', supersededByBigUpload.status===404, String(supersededByBigUpload.status));

  const byStranger = await req(API+bigUrl, 'GET', undefined, {Authorization:'Bearer '+t2}, true);
  check('any authenticated traveler may read an avatar', byStranger.status===200, String(byStranger.status));

  const byVisitor = await req(API+bigUrl, 'GET', undefined, {}, true);
  check('a visitor with no token is refused', byVisitor.status===401, String(byVisitor.status));

  const notImage = await upload('/v1/me/avatar', t1, Buffer.from('<html>not a photo</html>','utf8'));
  check('non-image bytes are refused, named, in the envelope', notImage.status===400 && notImage.body?.code==='NOT_AN_IMAGE', `${notImage.status} ${notImage.body?.code}`);

  const replaced = await upload('/v1/me/avatar', t1, solidJpeg());
  check('replacing mints a new url', replaced.status===200 && replaced.body.avatarUrl!==bigUrl, `${replaced.body?.avatarUrl}`);
  const oldOne = await req(API+bigUrl, 'GET', undefined, {Authorization:'Bearer '+t1}, true);
  check('the replaced photo is gone, bytes and all', oldOne.status===404, String(oldOne.status));

  const removed = await api('/v1/me/avatar','DELETE',t1);
  check('removing clears the profile back to initials', removed.status===200 && (removed.body.avatarUrl===null||removed.body.avatarUrl===undefined), `${removed.status} ${JSON.stringify(removed.body?.avatarUrl)}`);

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
