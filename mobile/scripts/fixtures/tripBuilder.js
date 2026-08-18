
const path = require('path');
const { landmarkAt } = require('./landmark');

const PHOTOS = require('../photoPool').CACHE_DIR;

const seededRandom = (text) => {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return ((hash >>> 0) % 100000) / 100000;
};

const pick = (pool, roll) => pool[Math.floor(roll * pool.length) % pool.length];

function pickDistinct(pool, roll, render, used) {
  const start = Math.floor(roll * pool.length) % pool.length;
  for (let i = 0; i < pool.length; i += 1) {
    const candidate = render(pool[(start + i) % pool.length]);
    if (!used.has(candidate)) return candidate;
  }
  return render(pool[start]);
}

const shortPlace = (place) => place.split(',')[0].trim();

const broadPhase = (phase) => (phase === 'early' || phase === 'evening' ? phase : 'day');

function activityCount(totalDays, roll) {
  if (totalDays <= 3) return 3 + Math.floor(roll * 3);
  if (totalDays <= 5) return 2 + Math.floor(roll * 2);
  if (totalDays <= 7) return 1 + Math.floor(roll * 2);
  if (totalDays <= 14) return roll < 0.15 ? 0 : 1;
  return roll < 0.3 ? 0 : 1;
}

const SLOTS = [
  { from: 5.5, to: 7.5, phase: 'early' },
  { from: 8.5, to: 11, phase: 'morning' },
  { from: 11.5, to: 14, phase: 'midday' },
  { from: 14.5, to: 17, phase: 'afternoon' },
  { from: 17.5, to: 21, phase: 'evening' },
];

const KINDS = {
  city: {
    early: ['First coffee in {p}', 'Empty streets of {p} before seven', 'Early train into {p}'],
    morning: ['Walking the old quarter of {p}', 'Market morning in {p}', 'Museum hour in {p}',
      'Bakery and a long sit in {p}'],
    midday: ['Long lunch in {p}', 'Street food crawl through {p}', 'Tram to the far side of {p}'],
    afternoon: ['Second-hand bookshops of {p}', 'Afternoon off in {p}', 'Wandering {p} with no plan'],
    evening: ['Dinner in {p}', 'Night market in {p}', 'Rooftop drinks over {p}', 'Live music in {p}'],
    titles: ['{p} on foot', 'Around {p}', 'A day in {p}', '{p}, no plan'],
  },
  town: {
    early: ['Bakery run in {p}', 'Quiet hour in {p}', 'Morning bells over {p}'],
    morning: ['Walking {p} end to end', 'The square in {p}', 'Cycling out of {p}'],
    midday: ['Long lunch in {p}', 'Shade and a book in {p}'],
    afternoon: ['Nothing much in {p}', 'The far end of {p}', 'A second coffee in {p}'],
    evening: ['Dinner in {p}', 'Sunset from the edge of {p}', 'One more drink in {p}'],
    titles: ['Around {p}', '{p}, slowly', 'A day in {p}', 'Nothing scheduled in {p}'],
  },
  coast: {
    early: ['Sunrise swim at {p}', 'First boat out from {p}', 'Empty sand at {p}'],
    morning: ['Snorkelling off {p}', 'Beach walk at {p}', 'Paddling out at {p}'],
    midday: ['Boat around {p}', 'Lunch above the water at {p}'],
    afternoon: ['Swimming and not much else at {p}', 'The far cove at {p}'],
    evening: ['Sunset at {p}', 'Grilled fish at {p}', 'Last swim at {p}'],
    titles: ['On the water at {p}', '{p} and the sea', 'A day at {p}', 'Boat day out of {p}'],
  },
  mountain: {
    early: ['Cold start above {p}', 'First light on {p}', 'Early ascent from {p}'],
    morning: ['Hiking above {p}', 'Ridge walk at {p}', 'Viewpoint climb at {p}'],
    midday: ['Lunch on the ridge at {p}', 'Slow descent into {p}'],
    afternoon: ['Down the long way from {p}', 'Legs up in {p}'],
    evening: ['Sunset from the ridge at {p}', 'Hut dinner near {p}', 'Stars above {p}'],
    titles: ['Up above {p}', '{p}, the long climb', 'High over {p}', 'Ridge day at {p}'],
  },
  nature: {
    early: ['Still water at {p} before the boats', 'Dawn paddle at {p}'],
    morning: ['Kayaking {p}', 'Walking the trail around {p}', 'Wildlife hour at {p}'],
    midday: ['Swimming at {p}', 'Lunch by the water at {p}'],
    afternoon: ['The long loop at {p}', 'The quiet end of {p}'],
    evening: ['Golden hour at {p}', 'Camp dinner near {p}'],
    titles: ['Out at {p}', '{p} all day', 'Into {p}', 'Trails around {p}'],
  },
  desert: {
    early: ['Sunrise over the dunes at {p}', 'Cold morning at {p}'],
    morning: ['Driving the track past {p}', 'Dune walk at {p}'],
    midday: ['Shade and water at {p}', 'Waiting out the heat at {p}'],
    afternoon: ['Out to the far dunes at {p}', 'The long track from {p}'],
    evening: ['Sunset on the dunes at {p}', 'Stars over {p}', 'Fire and dinner at {p}'],
    titles: ['Into the dunes at {p}', '{p} and the heat', 'Out past {p}', 'Stars over {p}'],
  },
  heritage: {
    early: ['Gates open at {p}', 'First in at {p}'],
    morning: ['Walking {p} slowly', 'Guided hour at {p}'],
    midday: ['The far end of {p}', 'Shade inside {p}'],
    afternoon: ['A second pass through {p}', 'The quiet corners of {p}'],
    evening: ['Last light on {p}', 'Dinner below {p}'],
    titles: ['{p} before the buses', 'A day at {p}', 'Old stones at {p}', '{p}, slowly'],
  },
  road: {
    early: ['Early start out of {p}', 'Loading up in {p}'],
    morning: ['Driving to {p}', 'Long road into {p}'],
    midday: ['Roadside lunch before {p}', 'Fuel and coffee at {p}'],
    afternoon: ['The last stretch into {p}', 'Pulling in at {p}'],
    evening: ['Arriving in {p} after dark', 'First dinner in {p}'],
    titles: ['The road to {p}', 'Driving to {p}', 'Moving on to {p}', 'All road into {p}'],
  },
};

const LANDMARK_TITLES = {
  city: {
    early: ['{l} before it wakes up', 'First light at {l}'],
    day: ['Walking to {l}', '{l} on foot', 'An hour at {l}'],
    evening: ['{l} after dark', 'Last stop at {l}'],
  },
  town: {
    early: ['Early at {l}', '{l} before anyone else'],
    day: ['Around {l}', 'An hour at {l}', 'Wandering out to {l}'],
    evening: ['{l} at dusk', 'Dinner near {l}'],
  },
  coast: {
    early: ['Sunrise at {l}', 'First boat to {l}'],
    day: ['Down to {l}', 'Swimming at {l}', 'The boat out to {l}'],
    evening: ['Sunset at {l}', 'Last swim at {l}'],
  },
  mountain: {
    early: ['Cold start for {l}', 'First light on {l}'],
    day: ['Up to {l}', 'Climbing {l}', 'The trail up {l}'],
    evening: ['{l} at last light', 'Watching the cloud come over {l}'],
  },
  nature: {
    early: ['{l} before the boats', 'Dawn at {l}'],
    day: ['Out to {l}', 'Paddling at {l}', 'Walking {l}'],
    evening: ['Golden hour at {l}'],
  },
  desert: {
    early: ['Sunrise over {l}', 'Cold morning at {l}'],
    day: ['Out to {l}', 'Driving as far as {l}'],
    evening: ['Sunset over {l}', 'Stars over {l}'],
  },
  heritage: {
    early: ['Gates open at {l}', 'First in at {l}'],
    day: ['Walking up to {l}', 'An hour at {l}', '{l} before the buses'],
    evening: ['Last light on {l}'],
  },
  road: {
    early: ['Early start for {l}'],
    day: ['Driving to {l}', 'The road to {l}'],
    evening: ['Into {l} after dark'],
  },
};

const SUBPLACES = {
  city: ['Old Town, {p}', '{p} Station', 'the market district, {p}', 'the riverfront, {p}',
    'the museum quarter, {p}', 'the back streets of {p}', 'the cathedral square, {p}',
    'the food hall, {p}', 'the north end of {p}', 'the university quarter, {p}'],
  town: ['the main square, {p}', 'the old street, {p}', 'the top of the village, {p}',
    'the church steps, {p}', 'the bridge at {p}', 'the lane behind {p}',
    'the mill road, {p}', 'the lookout above {p}', 'the old wall, {p}', 'the orchard edge of {p}'],
  coast: ['{p} beach', 'the north shore, {p}', 'the boat landing, {p}', 'the point, {p}',
    'the reef off {p}', 'the far cove, {p}', 'the south beach, {p}', 'the jetty, {p}',
    'the tide pools, {p}', 'the dunes behind {p}'],
  mountain: ['the trailhead, {p}', 'the ridge above {p}', 'the pass, {p}', 'the saddle, {p}',
    'the hut below {p}', 'the summit track, {p}', 'the col above {p}', 'the scree field, {p}',
    'the alpine meadow, {p}', 'the lower falls, {p}'],
  nature: ['the boat landing, {p}', 'the north shore, {p}', 'the visitor centre, {p}',
    'the far bank, {p}', 'the boardwalk, {p}', 'the upper falls, {p}', 'the reed beds, {p}',
    'the island in {p}', 'the southern trail, {p}', 'the overlook, {p}'],
  desert: ['the dune camp, {p}', 'the crossing at {p}', 'the well, {p}', 'the escarpment, {p}',
    'the salt flat, {p}', 'the ridge camp, {p}', 'the dry riverbed, {p}', 'the far waterhole, {p}',
    'the black dunes, {p}'],
  heritage: ['the main gate, {p}', 'the upper terrace, {p}', 'the museum at {p}',
    'the outer wall, {p}', 'the ticket gate, {p}', 'the lower court, {p}', 'the eastern gate, {p}',
    'the carved terrace, {p}', 'the processional way, {p}'],
  road: ['the roadhouse before {p}', 'the junction, {p}', 'the lookout above {p}',
    'the fuel stop, {p}', 'the last pass before {p}', 'the halfway market, {p}',
    'the river crossing, {p}', 'the old toll house, {p}', 'the ridge road above {p}'],
};

const TYPICAL_COST = {
  USD: 25, EUR: 20, GBP: 18, CHF: 25, CAD: 30, AUD: 30, NZD: 30, FJD: 50, VUV: 2000,
  PHP: 300, IDR: 60000, VND: 200000, MYR: 60, LAK: 150000, MMK: 30000,
  JPY: 2000, KRW: 20000, TWD: 500, MNT: 50000, UZS: 200000,
  INR: 800, NPR: 1500, LKR: 3000, BTN: 800, MVR: 300,
  TRY: 500, JOD: 12, OMR: 8,
  EGP: 500, MAD: 150, XOF: 8000, GHS: 150, ETB: 1000, TZS: 30000, NAD: 300, ZAR: 300,
  MXN: 300, BRL: 80, ARS: 8000, CLP: 12000, PEN: 60, COP: 60000, BOB: 100, UYU: 600,
  GTQ: 120, CRC: 8000, CUP: 500,
  ISK: 3000, NOK: 250, SEK: 250, DKK: 150, PLN: 80, HUF: 7000,
};

function costFor(currency, roll) {
  const typical = TYPICAL_COST[currency];
  if (typical === undefined) {
    throw new Error(`no typical cost recorded for currency "${currency}" — add it to TYPICAL_COST`);
  }
  const raw = typical * (0.15 + (roll ** 1.7) * 3.0);
  const step = raw >= 50000 ? 5000 : raw >= 5000 ? 500 : raw >= 500 ? 50 : raw >= 50 ? 5 : 1;
  return String(Math.max(step, Math.round(raw / step) * step));
}

const KIND_NOTES = {
  city: ['Cheaper two streets back from the main square in {p}.', 'The metro beats a taxi in {p}.'],
  town: ['Ask about the back route out of {p} — quieter, barely longer.', 'Ask for the back terrace in {p}.'],
  coast: ['Wear something you can swim in around {p}.', 'Reef shoes help at {p}.',
    'The afternoon wind gets up at {p}.'],
  mountain: ['Start earlier than you think for {p}.', 'Colder at the top of {p} than it looks.',
    'Poles help on the way down from {p}.'],
  nature: ['Bring water — nothing sells any past {p}.', 'Insect repellent, seriously, at {p}.'],
  desert: ['Bring more water than you think for {p}.', 'Nothing sells fuel past {p}.'],
  heritage: ['Shoes off at the entrance here in {p}.', 'Cover your shoulders at {p}.'],
  road: ['Parking in {p} is hopeless after nine.', 'Fill up before {p} — nothing after.'],
};

const NOTES = [
  'Cheaper two streets back from the main square in {p}.',
  'Get there before the first bus reaches {p}.',
  'The ticket office in {p} is cash only.',
  'Nothing opens in {p} before eight.',
  'Ask about the back route out of {p} — quieter, barely longer.',
  'Book the {p} leg the day before, not on the day.',
  'Half the guides in {p} quote double at first. Walk away once.',
  'The last bus out of {p} leaves earlier than posted.',
  'Skip the guided version of {p} and just walk it.',
  'Bring water — nothing sells any past {p}.',
  '{p} closes Mondays. Learned that the hard way.',
  'Worth a second night in {p} if you can move things around.',
  'The queue at {p} moves faster than it looks.',
  'Everything in {p} shuts for two hours after lunch.',
  'Cash only anywhere outside {p}.',
  'The far side of {p} is worth the extra hour.',
  'Do not bother with the organised tour from {p}.',
  'Early is the whole trick at {p}.',
  'Ask for the back terrace in {p}.',
  'Cash only.', 'Book the day before.', 'Worth the detour, barely.',
  'Bring water.', 'Closed Mondays.', 'Sunscreen, obviously.',
];

const CAPTIONS = [
  'Stood here an hour longer than planned. {p} does not hurry anyone.',
  'Every photo of {p} looks the same until you are standing in it.',
  'The kind of morning you plan a whole trip around, and {p} delivered.',
  'Nobody told us {p} would be this quiet at this hour.',
  'Third attempt at this shot. {p} finally cooperated.',
  'Ate too much, walked it off, ate again. {p} is dangerous that way.',
  'Missed the boat and found this instead. {p} owes us nothing.',
  'Rain the whole way up. Cleared for about four minutes over {p}.',
  'Would come back to {p} for this alone.',
  'Not on any list we read beforehand, which is exactly why {p} worked.',
];

const DESCRIPTIONS = [
  'A slow loop through {d}, planned loosely and rearranged twice on the road.',
  'Everything we wanted out of {d}, plus a few days we did not plan at all.',
  '{d} at walking pace, rearranged twice on the road.',
  'Went to {d} for the coast and stayed for everything behind it.',
  'The version of {d} we would do again, with two fewer travel days.',
];

const STANDOUTS = [
  'The stretch between {a} and {b}, which nobody warned us about',
  'Getting to {a} before the first bus',
  'An unplanned second night in {a}',
  'The food, consistently, everywhere around {a}',
  'Watching the weather turn over {a}',
];

function timeAt(slot, roll) {
  const hour = slot.from + roll * (slot.to - slot.from);
  const whole = Math.floor(hour);
  const minute = Math.round(((hour - whole) * 60) / 5) * 5;
  const carry = minute === 60;
  return `${String(carry ? whole + 1 : whole).padStart(2, '0')}:${String(carry ? 0 : minute).padStart(2, '0')}`;
}

function parsePlace(raw) {
  const [place, kind] = raw.split('|');
  if (KINDS[kind] === undefined) {
    throw new Error(`place "${raw}" has kind "${kind}", which is not one of: ${Object.keys(KINDS).join(', ')}`);
  }
  return { place: place.trim(), kind };
}

function buildDay(trip, raw, dayIndex, totalDays, currency, used) {
  const { place, kind } = parsePlace(raw);
  const key = `${trip}/${dayIndex}`;
  const count = activityCount(totalDays, seededRandom(`${key}/count`));
  const short = shortPlace(place);
  const vocab = KINDS[kind];

  const chosen = SLOTS.map((slot, index) => ({ slot, index, roll: seededRandom(`${key}/slot/${index}`) }))
    .sort((one, other) => other.roll - one.roll)
    .slice(0, count)
    .sort((one, other) => one.index - other.index);

  const { usedTitles, usedNotes, usedCaptions, usedPlaces } = used;

  const activities = chosen.map(({ slot, index }, position) => {
    const seed = `${key}/${index}`;
    const landmark = landmarkAt(PHOTOS, place, position);
    const title = landmark === null
      ? pickDistinct(vocab[slot.phase], seededRandom(`${seed}/title`), (t) => t.replace('{p}', short), usedTitles)
      : pickDistinct(LANDMARK_TITLES[kind][broadPhase(slot.phase)], seededRandom(`${seed}/landmark`), (t) => t.replace('{l}', landmark), usedTitles);
    usedTitles.add(title);

    const notes = seededRandom(`${seed}/notes`) < 0.78
      ? pickDistinct([...NOTES, ...KIND_NOTES[kind]], seededRandom(`${seed}/note`), (t) => t.replace('{p}', short), usedNotes)
      : null;
    if (notes !== null) usedNotes.add(notes);

    const where = landmark !== null && !usedPlaces.has(landmark)
      ? landmark
      : pickDistinct(
        SUBPLACES[kind], seededRandom(`${seed}/where`), (s) => s.replace('{p}', short), usedPlaces,
      );
    usedPlaces.add(where);

    const activity = {
      title,
      timeOfDay: timeAt(slot, seededRandom(`${seed}/time`)),
      place: where,
      notes,
    };
    if (seededRandom(`${seed}/cost`) < 0.85) {
      activity.costAmount = costFor(currency, seededRandom(`${seed}/amount`));
      activity.costCurrency = currency;
    }
    if (seededRandom(`${seed}/post`) < 0.3) {
      const caption = pickDistinct(
        CAPTIONS, seededRandom(`${seed}/caption`), (c) => c.replace('{p}', short), usedCaptions,
      );
      usedCaptions.add(caption);
      activity.post = { caption, photos: 1 + Math.floor(seededRandom(`${seed}/frames`) * 4) };
    }
    return activity;
  });

  const restTitles = ['A day off in {p}', 'Another slow one in {p}', 'Still in {p}, resting'];
  const dayTitle = pickDistinct(
    count === 0 ? restTitles : vocab.titles,
    seededRandom(`${key}/title`),
    (t) => t.replace('{p}', short),
    used.usedDayTitles,
  );
  used.usedDayTitles.add(dayTitle);

  return { at: place, title: dayTitle, activities };
}

function buildTrip(spec) {
  const { title, destination, days, currency, lifecycle, publish, bestTimeOfYear } = spec;
  const first = shortPlace(parsePlace(days[0]).place);
  const last = shortPlace(parsePlace(days[days.length - 1]).place);
  return {
    title,
    destination,
    description: pick(DESCRIPTIONS, seededRandom(`${title}/desc`)).replace('{d}', destination),
    standouts: [
      pick(STANDOUTS, seededRandom(`${title}/s1`)).replace('{a}', first).replace('{b}', last),
      pick(STANDOUTS, seededRandom(`${title}/s2`)).replace('{a}', last).replace('{b}', first),
    ],
    bestTimeOfYear,
    lifecycle,
    publish,
    days: (() => {
      const used = {
        usedTitles: new Set(),
        usedNotes: new Set(),
        usedCaptions: new Set(),
        usedPlaces: new Set(),
        usedDayTitles: new Set(),
      };
      return days.map((raw, index) => buildDay(title, raw, index, days.length, currency, used));
    })(),
  };
}

module.exports = { buildTrip, seededRandom, activityCount, shortPlace, KINDS };
