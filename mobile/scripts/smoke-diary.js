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

// Every list on this API speaks one shape (P5), diary entries included — read the envelope.
const entriesOf = async (uri, t) => (await api(uri,'GET',t)).body?.items ?? [];

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

// The composer's own wire shape: the entry part is a PLAIN STRING with no content type, because
// react-native's FormData cannot be trusted to type a JSON part (the S3.3 family). A walk that
// posted a typed part would be exercising a request no client of ours can produce.
function composerBody(entry, photoCount) {
  const b = '----largatadiary' + Date.now();
  const parts = [Buffer.from(
    `--${b}\r\nContent-Disposition: form-data; name="entry"\r\n\r\n${JSON.stringify(entry)}\r\n`, 'utf8')];
  for (let i = 0; i < photoCount; i++) {
    parts.push(Buffer.from(
      `--${b}\r\nContent-Disposition: form-data; name="photos"; filename="device-${i}.jpg"\r\n` +
      `Content-Type: image/jpeg\r\n\r\n`, 'utf8'), solidJpeg(), Buffer.from('\r\n','utf8'));
  }
  parts.push(Buffer.from(`--${b}--\r\n`, 'utf8'));
  return { boundary: b, body: Buffer.concat(parts) };
}

async function post(tripId, token, entry, photoCount) {
  const { boundary, body } = composerBody(entry, photoCount);
  return req(`${API}/v1/itineraries/${tripId}/diary/entries`, 'POST', body, {
    Authorization: 'Bearer ' + token,
    'Content-Type': `multipart/form-data; boundary=${boundary}`,
  });
}

async function uploadToDump(tripId, token) {
  const b = '----largatadump' + Date.now();
  const body = Buffer.concat([
    Buffer.from(`--${b}\r\nContent-Disposition: form-data; name="photo"; filename="pool.jpg"\r\n` +
      `Content-Type: image/jpeg\r\n\r\n`, 'utf8'),
    solidJpeg(),
    Buffer.from(`\r\n--${b}--\r\n`, 'utf8'),
  ]);
  return req(`${API}/v1/itineraries/${tripId}/photo-dump`, 'POST', body, {
    Authorization: 'Bearer ' + token,
    'Content-Type': `multipart/form-data; boundary=${b}`,
  });
}

(async () => {
  // t1 = the diary's author (trip owner), t2 = a co-traveler on the same trip, t3 = a stranger.
  const t1 = await token('t1');
  const t2 = await token('t2');
  const t3 = await token('t3');

  const trip = (await api('/v1/itineraries','POST',t1,{ title:'Diary Trip', destinations:['El Nido'], durationDays:2 })).body;
  const diary = `/v1/itineraries/${trip.id}/diary/entries`;

  const invited = await api(`/v1/itineraries/${trip.id}/invitations`,'POST',t1,{ email: BASE.replace('@','+t2@') });
  const accepted = await api(`/v1/invitations/${invited.body?.id}/accept`,'POST',t2,{});
  check('t2 joined the trip through the real invite → accept',
    invited.status===201 && accepted.status===200, `${invited.status}/${accepted.status}`);

  const plan = (await api(`/v1/itineraries/${trip.id}`,'GET',t1)).body;
  const day1 = plan.days[0];
  const activity = (await api(`/v1/itineraries/${trip.id}/days/${day1.id}/activities`,'POST',t1,
    { title:'Sunset at Las Cabanas', timeOfDay:'17:30' })).body;

  // The gate is the server's, not the UI's — a draft trip refuses even when asked directly.
  const draftPost = await post(trip.id, t1, { activityId: activity.id, caption: null, fromDump: [] }, 1);
  check('a DRAFT trip refuses the whole act with the named code',
    draftPost.status===400 && draftPost.body?.code==='TRIP_NOT_STARTED',
    `${draftPost.status}/${draftPost.body?.code}`);

  await api(`/v1/itineraries/${trip.id}/finish-planning`,'POST',t1);
  const upcomingPost = await post(trip.id, t1, { activityId: activity.id, caption: null, fromDump: [] }, 1);
  check('an UPCOMING trip refuses too — a diary of a trip that has not happened is fiction',
    upcomingPost.status===400 && upcomingPost.body?.code==='TRIP_NOT_STARTED',
    `${upcomingPost.status}/${upcomingPost.body?.code}`);

  await api(`/v1/itineraries/${trip.id}/start`,'POST',t1);

  const poolPhoto = (await uploadToDump(trip.id, t2)).body;
  check('t2 put a photo in the trip pool for t1 to draw from', poolPhoto?.id !== undefined);

  const zero = await post(trip.id, t1, { activityId: activity.id, caption: null, fromDump: [] }, 0);
  const six = await post(trip.id, t1, { activityId: activity.id, caption: null, fromDump: [] }, 6);
  check('the floor and the cap both refuse the whole act',
    zero.status===400 && zero.body?.code==='DIARY_ENTRY_NEEDS_A_PHOTO' &&
    six.status===400 && six.body?.code==='TOO_MANY_DIARY_PHOTOS',
    `${zero.body?.code}/${six.body?.code}`);

  const posted = await post(trip.id, t1,
    { activityId: activity.id, caption: 'Best evening of the trip', fromDump: [poolPhoto.id] }, 2);
  check('AC1: two device photos + one dump photo + a caption make one postcard',
    posted.status===201 && posted.body?.photos?.length===3 &&
    posted.body?.caption==='Best evening of the trip',
    `${posted.status}/${posted.body?.photos?.length} photos`);
  const entry = posted.body;

  check('the snapshot records the activity as it was at post time',
    entry.activityTitle==='Sunset at Las Cabanas' && entry.dayLabel==='Day 1' &&
    entry.timeOfDay.startsWith('17:30'),
    `${entry.activityTitle} / ${entry.dayLabel} / ${entry.timeOfDay}`);

  check('the dump photo was COPIED, never referenced',
    !entry.photos.some(p => p.id === poolPhoto.id));

  // The load-bearing check: the outcomes are distinguishable, and the author's succeeding is
  // what makes the co-traveler's 404 mean masking rather than a broken URL.
  const authorReads = await media(entry.photos[0].url, t1);
  const coTravelerReads = await media(entry.photos[0].url, t2);
  const strangerReads = await media(entry.photos[0].url, t3);
  check('AC6: the author reads their diary photo; a CO-TRAVELER of the same trip 404s',
    authorReads.status===200 && authorReads.bytes.length>0 && coTravelerReads.status===404,
    `author ${authorReads.status} / co-traveler ${coTravelerReads.status} / stranger ${strangerReads.status}`);

  const t2Sees = await api(diary,'GET',t2);
  check('AC6: the mine-list serves each traveler only their own — t2 sees none of t1\'s',
    t2Sees.status===200 && t2Sees.body.items.length===0, `${t2Sees.status}/${t2Sees.body?.items?.length}`);

  const strangerList = await api(diary,'GET',t3);
  const strangerPost = await post(trip.id, t3, { activityId: activity.id, caption:null, fromDump:[] }, 1);
  check('a non-member is masked on read and on write',
    strangerList.status===404 && strangerPost.status===404,
    `${strangerList.status}/${strangerPost.status}`);

  const second = await post(trip.id, t1, { activityId: activity.id, caption:null, fromDump:[] }, 1);
  check('AC4: a second postcard for the same activity refuses',
    second.status===409 && second.body?.code==='ACTIVITY_ALREADY_IN_DIARY',
    `${second.status}/${second.body?.code}`);

  const t2Own = await post(trip.id, t2, { activityId: activity.id, caption:'mine, not t1\'s', fromDump:[] }, 1);
  check('every traveler owns their own diary — t2 posts from the SAME activity',
    t2Own.status===201, String(t2Own.status));

  // AC5, walked as a traveler would edit: rename, move, then delete the activity underneath.
  const lock = await api(`/v1/itineraries/${trip.id}/edit-lock`,'POST',t1,
    { subjectType:'activity', subjectId: activity.id });
  const renamed = await api(`/v1/itineraries/${trip.id}/days/${day1.id}/activities/${activity.id}`,'PATCH',t1,
    { title:'Renamed after the fact' });
  check('the plan edits below actually ran — a 409 here would make every AC5 check pass vacuously',
    lock.status===200 && renamed.status===200, `lock ${lock.status} / rename ${renamed.status}`);
  const afterRename = (await entriesOf(diary, t1))[0];
  check('AC5: renaming the activity never rewrites a memory already posted',
    afterRename.activityTitle==='Sunset at Las Cabanas', afterRename.activityTitle);

  const day2 = plan.days[1];
  const moved = await api(`/v1/itineraries/${trip.id}/days/${day1.id}/activities/${activity.id}/move`,'POST',t1,
    { targetDayId: day2.id });
  const afterMove = (await entriesOf(diary, t1))[0];
  check('AC5: moving it to another day does not move the postcard',
    moved.status===200 && afterMove.dayLabel==='Day 1', `move ${moved.status} / ${afterMove.dayLabel}`);

  const killed = await api(`/v1/itineraries/${trip.id}/days/${day2.id}/activities/${activity.id}`,'DELETE',t1);
  check('the activity really was deleted', killed.status===204, String(killed.status));
  const afterDelete = (await entriesOf(diary, t1))[0];
  check('AC5: deleting the activity clears provenance and leaves the postcard whole',
    afterDelete.activityId===null && afterDelete.activityTitle==='Sunset at Las Cabanas' &&
    afterDelete.photos.length===3,
    `activityId=${afterDelete.activityId} photos=${afterDelete.photos.length}`);

  // AC7: the entry owns its bytes, so the pool losing the original changes nothing.
  const copied = afterDelete.photos.find(p => p.id !== undefined);
  await api(`/v1/itineraries/${trip.id}/photo-dump/${poolPhoto.id}`,'DELETE',t2);
  const stillServes = await media(copied.url, t1);
  const poolGone = await media(poolPhoto.url, t1);
  check('AC7: deleting the pool photo never reaches the diary that copied it',
    stillServes.status===200 && poolGone.status===404,
    `entry ${stillServes.status} / pool ${poolGone.status}`);

  const recaptioned = await api(`${diary}/${entry.id}`,'PATCH',t1,{ caption:'Second thoughts' });
  check('AC8: a caption-only edit lands and leaves the photos alone',
    recaptioned.status===200 && recaptioned.body.caption==='Second thoughts' &&
    recaptioned.body.photos.length===3,
    `${recaptioned.status}/${recaptioned.body?.photos?.length}`);

  const t2Edit = await api(`${diary}/${entry.id}`,'PATCH',t2,{ caption:'not yours to write' });
  const t2Delete = await api(`${diary}/${entry.id}`,'DELETE',t2);
  check('only the author may touch a postcard — a co-traveler is masked, not forbidden',
    t2Edit.status===404 && t2Delete.status===404, `${t2Edit.status}/${t2Delete.status}`);

  // Scoped to THIS run's trip: the pool accounts are long-lived, so t1 carries diaries from
  // earlier runs and an absolute count would fail for a reason that is not the product's.
  const trips = await api('/v1/me/diary/trips','GET',t1);
  const thisTrip = (trips.body?.items ?? []).find(t => t.itineraryId === trip.id);
  const t2Trip = ((await api('/v1/me/diary/trips','GET',t2)).body?.items ?? [])
    .find(t => t.itineraryId === trip.id);
  check('AC9: My Diary groups the author\'s entries by trip, with a count',
    trips.status===200 && thisTrip?.entryCount===1 && thisTrip?.title==='Diary Trip',
    `${trips.status}/${thisTrip?.entryCount} entries`);
  check('AC6: each traveler\'s My Diary counts only their own entries on the shared trip',
    t2Trip?.entryCount===1, `t2 sees ${t2Trip?.entryCount}`);

  // AC3, the retro path — completed is a posting state, deliberately.
  const retroActivity = (await api(`/v1/itineraries/${trip.id}/days/${day2.id}/activities`,'POST',t1,
    { title:'Looking back' })).body;
  await api(`/v1/itineraries/${trip.id}/complete`,'POST',t1);
  const retro = await post(trip.id, t1, { activityId: retroActivity.id, caption:'Posted after the fact', fromDump:[] }, 1);
  check('AC3: a COMPLETED trip accepts a retrospective postcard',
    retro.status===201, String(retro.status));

  // AC10: deletion takes the bytes with it and frees the activity to be posted again.
  const deletedPhotos = retro.body.photos.map(p => p.url);
  const removed = await api(`${diary}/${retro.body.id}`,'DELETE',t1);
  const bytesGone = await media(deletedPhotos[0], t1);
  const repost = await post(trip.id, t1, { activityId: retroActivity.id, caption:'Second time', fromDump:[] }, 1);
  check('AC10: deleting an entry removes its bytes and frees the activity',
    removed.status===204 && bytesGone.status===404 && repost.status===201,
    `${removed.status}/${bytesGone.status}/${repost.status}`);

  // AC9's other half: the fence stops writes while the author keeps reading.
  await api(`/v1/itineraries/${trip.id}/archive`,'POST',t1);
  const archivedEdit = await api(`${diary}/${entry.id}`,'PATCH',t1,{ caption:'after the fence' });
  const archivedRead = await api(diary,'GET',t1);
  const archivedTrips = await api('/v1/me/diary/trips','GET',t1);
  const stillListed = (archivedTrips.body?.items ?? []).some(t => t.itineraryId === trip.id);
  check('AC9: an ARCHIVED trip refuses new writes while its entries stay readable',
    archivedEdit.status===409 && archivedRead.status===200 &&
    archivedRead.body.items.some(e => e.caption==='Second thoughts') && stillListed,
    `${archivedEdit.status}/${archivedRead.status}/listed=${stillListed}`);

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
