const { precompleteProfile } = require('./precomplete-profile');
const http = require('http');
const API = 'http://localhost:8080';
const KEY = process.env.EXPO_PUBLIC_FIREBASE_API_KEY;
const BASE = process.env.LARGATA_TEST_POOL_EMAIL_BASE;
const PASSWORD = process.env.LARGATA_TEST_POOL_PASSWORD;
let pass = 0, fail = 0;
const check = (n, ok, d='') => { ok ? pass++ : fail++; console.log(`${ok?'  ok  ':' FAIL '} ${n}${d?'  — '+d:''}`); };
function req(url, method, body, headers={}) {
  return new Promise((res, rej) => {
    const data = body === undefined ? undefined : JSON.stringify(body);
    const o = { method, headers: {...headers} };
    if (data) { o.headers['Content-Type']='application/json'; o.headers['Content-Length']=Buffer.byteLength(data); }
    const lib = url.startsWith('https') ? require('https') : http;
    const r = lib.request(new URL(url), o, (rs) => { let b=''; rs.on('data',c=>b+=c); rs.on('end',()=>{ let p; try{p=b?JSON.parse(b):undefined}catch{p=b} res({status:rs.statusCode, body:p}); }); });
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
(async () => {
  const t1 = await token('t1');
  const created = await api('/v1/itineraries','POST',t1,{ title:'Island Hopping in El Nido', destinations:['Palawan'], durationDays:5, bestTimeOfYear:'Dec - Apr', standouts:['Big Lagoon Kayaking','Local Seafood Dinners'] });
  check('create carries standouts + best time in one act', created.status===201 && created.body.standouts.length===2 && created.body.bestTimeOfYear==='Dec - Apr', `${created.status} ${JSON.stringify(created.body.standouts)}`);
  check('duration mints the days', created.body.days.length===5, `days=${created.body.days.length}`);
  const trip = created.body.id, day1 = created.body.days[0].id;
  const act = await api(`/v1/itineraries/${trip}/days/${day1}/activities`,'POST',t1,{ title:'Airport Transfer', timeOfDay:'14:00', costAmount:'500', costCurrency:'PHP', place:'Lio Airport', bookingPurpose:'Van transfer', bookingProvider:'Klook', externalUrl:'https://klook.com/x', bookingPriceAmount:'1800', bookingPriceCurrency:'PHP' });
  check('the booking card round-trips whole', act.status===201 && act.body.bookingProvider==='Klook' && act.body.bookingPurpose==='Van transfer' && (act.body.bookingPriceAmount==='1800.00'||act.body.bookingPriceAmount==='1800'), `${act.status} ${act.body?.bookingProvider}/${act.body?.bookingPriceAmount}`);
  check('the booking price does not disturb the activity cost', (act.body.costAmount==='500.00'||act.body.costAmount==='500'), `cost=${act.body?.costAmount}`);
  const bad = await api(`/v1/itineraries/${trip}/days/${day1}/activities`,'POST',t1,{ title:'X', bookingPriceAmount:'1800' });
  check('a booking price with no currency is refused', bad.status===400, String(bad.status));
  await api(`/v1/itineraries/${trip}/finish-planning`,'POST',t1);
  const list = await api('/v1/itineraries?category=upcoming','GET',t1);
  check('the upcoming section filter finds it', list.body.items.some(i=>i.id===trip), `n=${list.body.items.length}`);
  const legacy = await api('/v1/itineraries?category=active','GET',t1);
  check('the retired word is refused, not silently understood', legacy.status===400 && legacy.body.code==='UNKNOWN_TRIP_CATEGORY', `${legacy.status} ${legacy.body?.code}`);
  const all = await api('/v1/itineraries','GET',t1);
  check('every row carries beingEdited for the card status slot', all.body.items.every(i=>typeof i.beingEdited==='boolean'), `sample=${all.body.items[0]?.beingEdited}`);
  await api(`/v1/itineraries/${trip}/edit-lock`,'POST',t1,{ subjectType:'day', subjectId: day1 });
  const held = await api('/v1/itineraries','GET',t1);
  check('a held trip reports beingEdited true', held.body.items.find(i=>i.id===trip)?.beingEdited===true);
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
