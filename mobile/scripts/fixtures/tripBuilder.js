// Expands a compact trip spec — a title, its destinations and an ordered list of day places — into
// the full shape seed-travelers.js consumes. The places are authored because the destination
// distribution is a design input: Discovery's trending rail groups by destination and caps at 12, so
// a hundred trips naming a hundred different places produces a ranking of ties.
//
// EVERY PLACE CARRIES A KIND, and that is the difference between mock data and nonsense. A
// place-agnostic template pool cheerfully produced "Museum hour in Magpupungko" for a rock pool and
// "Night market in Cloud 9" for a surf break. The kind selects the vocabulary, so a lagoon gets
// paddled and a city gets walked.
//
// DETERMINISTIC BY CONSTRUCTION. Every choice is keyed on the trip title plus a coordinate, so a
// rebuilt dataset is the same dataset — a screenshot, a walk assertion and a bug report all stay
// reproducible. Math.random() would make each reseed a different app.

const path = require('path');
const { landmarkAt } = require('./landmark');

const PHOTOS = path.join(__dirname, 'photos');

const seededRandom = (text) => {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return ((hash >>> 0) % 100000) / 100000;
};

const pick = (pool, roll) => pool[Math.floor(roll * pool.length) % pool.length];

const shortPlace = (place) => place.split(',')[0].trim();

function activityCount(totalDays, roll) {
  if (totalDays <= 3) return 3 + Math.floor(roll * 3);
  if (totalDays <= 5) return 2 + Math.floor(roll * 2);
  if (totalDays <= 7) return 1 + Math.floor(roll * 2);
  if (totalDays <= 14) return roll < 0.15 ? 0 : 1;
  return roll < 0.3 ? 0 : 1;
}

const SLOTS = [
  { from: 5.5, to: 7.5, phase: 'early' },
  { from: 8.5, to: 11, phase: 'day' },
  { from: 11.5, to: 14, phase: 'day' },
  { from: 14.5, to: 17, phase: 'day' },
  { from: 17.5, to: 21, phase: 'evening' },
];

const KINDS = {
  city: {
    early: ['First coffee in {p}', 'Empty streets of {p} before seven', 'Early train into {p}'],
    day: ['Walking the old quarter of {p}', 'Market morning in {p}', 'Museum hour in {p}',
      'Long lunch in {p}', 'Second-hand bookshops of {p}', 'Tram to the far side of {p}'],
    evening: ['Dinner in {p}', 'Night market in {p}', 'Rooftop drinks over {p}', 'Live music in {p}'],
    titles: ['{p} on foot', 'Around {p}', 'A day in {p}', '{p}, no plan'],
  },
  town: {
    early: ['Bakery run in {p}', 'Quiet hour in {p}', 'Morning bells over {p}'],
    day: ['Walking {p} end to end', 'The square in {p}', 'Cycling out of {p}', 'Long lunch in {p}'],
    evening: ['Dinner in {p}', 'Sunset from the edge of {p}', 'One more drink in {p}'],
    titles: ['Around {p}', '{p}, slowly', 'A day in {p}', 'Nothing scheduled in {p}'],
  },
  coast: {
    early: ['Sunrise swim at {p}', 'First boat out from {p}', 'Empty sand at {p}'],
    day: ['Snorkelling off {p}', 'Boat around {p}', 'Swimming and not much else at {p}',
      'Beach walk at {p}', 'Paddling out at {p}'],
    evening: ['Sunset at {p}', 'Grilled fish at {p}', 'Last swim at {p}'],
    titles: ['On the water at {p}', '{p} and the sea', 'A day at {p}', 'Boat day out of {p}'],
  },
  mountain: {
    early: ['Cold start above {p}', 'First light on {p}', 'Early ascent from {p}'],
    day: ['Hiking above {p}', 'Ridge walk at {p}', 'Viewpoint climb at {p}', 'Slow descent into {p}'],
    evening: ['Sunset from the ridge at {p}', 'Hut dinner near {p}', 'Stars above {p}'],
    titles: ['Up above {p}', '{p}, the long climb', 'High over {p}', 'Ridge day at {p}'],
  },
  nature: {
    early: ['Still water at {p} before the boats', 'Dawn paddle at {p}'],
    day: ['Kayaking {p}', 'Swimming at {p}', 'Walking the trail around {p}', 'Wildlife hour at {p}'],
    evening: ['Golden hour at {p}', 'Camp dinner near {p}'],
    titles: ['Out at {p}', '{p} all day', 'Into {p}', 'Trails around {p}'],
  },
  desert: {
    early: ['Sunrise over the dunes at {p}', 'Cold morning at {p}'],
    day: ['Driving the track past {p}', 'Dune walk at {p}', 'Shade and water at {p}'],
    evening: ['Sunset on the dunes at {p}', 'Stars over {p}', 'Fire and dinner at {p}'],
    titles: ['Into the dunes at {p}', '{p} and the heat', 'Out past {p}', 'Stars over {p}'],
  },
  heritage: {
    early: ['Gates open at {p}', 'First in at {p}'],
    day: ['Walking {p} slowly', 'Guided hour at {p}', 'The far end of {p}'],
    evening: ['Last light on {p}', 'Dinner below {p}'],
    titles: ['{p} before the buses', 'A day at {p}', 'Old stones at {p}', '{p}, slowly'],
  },
  road: {
    early: ['Early start out of {p}', 'Loading up in {p}'],
    day: ['Driving to {p}', 'Roadside lunch before {p}', 'Fuel and coffee at {p}', 'Long road into {p}'],
    evening: ['Arriving in {p} after dark', 'First dinner in {p}'],
    titles: ['The road to {p}', 'Driving to {p}', 'Moving on to {p}', 'All road into {p}'],
  },
};

// Most of these carry {p}, and that is the whole point. An eleven-string pool with no place in it
// produced 826 notes from 11 distinct strings — each one appearing about seventy-five times, which
// is far louder than the generic day titles it sat beside. Captions never had the problem because
// they always substituted the place. A handful stay generic so not every line name-drops.
// Used only when the activity's own photo names a landmark the place string does not already carry.
// About a fifth of activities get one; the rest fall back to KINDS above.
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

const NOTES = [
  'Cheaper two streets back from the main square in {p}.',
  'Get there before the first bus reaches {p}.',
  'The ticket office in {p} is cash only.',
  'Nothing opens in {p} before eight.',
  'Ask about the back route out of {p} — quieter, barely longer.',
  'Book the {p} leg the day before, not on the day.',
  'Half the guides in {p} quote double at first. Walk away once.',
  'Shoes off at the entrance here in {p}.',
  'The last bus out of {p} leaves earlier than posted.',
  'Skip the guided version of {p} and just walk it.',
  'Bring water — nothing sells any past {p}.',
  '{p} closes Mondays. Learned that the hard way.',
  'Worth a second night in {p} if you can move things around.',
  'The queue at {p} moves faster than it looks.',
  'Everything in {p} shuts for two hours after lunch.',
  'Cash only anywhere outside {p}.',
  'Wear something you can swim in around {p}.',
  'The far side of {p} is worth the extra hour.',
  'Do not bother with the organised tour from {p}.',
  'Early is the whole trick at {p}.',
  'Parking in {p} is hopeless after nine.',
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
  '{d} at walking pace, with more ferries than expected.',
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

function buildDay(trip, raw, dayIndex, totalDays, currency) {
  const { place, kind } = parsePlace(raw);
  const key = `${trip}/${dayIndex}`;
  const count = activityCount(totalDays, seededRandom(`${key}/count`));
  const short = shortPlace(place);
  const vocab = KINDS[kind];

  // Slots are walked in index order after selection, so a day's times ascend. Activities sort by
  // sortOrder — creation order, not time — so an unsorted day would render 14:00 above 08:00 with
  // nothing failing anywhere.
  const chosen = SLOTS.map((slot, index) => ({ slot, index, roll: seededRandom(`${key}/slot/${index}`) }))
    .sort((one, other) => other.roll - one.roll)
    .slice(0, count)
    .sort((one, other) => one.index - other.index);

  const activities = chosen.map(({ slot, index }, position) => {
    const seed = `${key}/${index}`;
    // position, not index — the seeder assigns photos by an activity's place in the day's list, so
    // the title is derived from the same photo the traveler will actually see under it.
    const landmark = landmarkAt(PHOTOS, place, position);
    const title = landmark === null
      ? pick(vocab[slot.phase], seededRandom(`${seed}/title`)).replace('{p}', short)
      : pick(LANDMARK_TITLES[kind][slot.phase], seededRandom(`${seed}/landmark`)).replace('{l}', landmark);
    const activity = {
      title,
      timeOfDay: timeAt(slot, seededRandom(`${seed}/time`)),
      place,
      notes: seededRandom(`${seed}/notes`) < 0.78
        ? pick(NOTES, seededRandom(`${seed}/note`)).replace('{p}', short)
        : null,
    };
    if (seededRandom(`${seed}/cost`) < 0.85) {
      activity.costAmount = String(5 * (2 + Math.floor(seededRandom(`${seed}/amount`) * 24)));
      activity.costCurrency = currency;
    }
    if (seededRandom(`${seed}/post`) < 0.3) {
      activity.post = {
        caption: pick(CAPTIONS, seededRandom(`${seed}/caption`)).replace('{p}', short),
        photos: 1 + Math.floor(seededRandom(`${seed}/frames`) * 4),
      };
    }
    return activity;
  });

  return {
    at: place,
    title: count === 0
      ? `A day off in ${short}`
      : pick(vocab.titles, seededRandom(`${key}/title`)).replace('{p}', short),
    activities,
  };
}

// The country or region a trip's day places sit in, taken as the commonest trailing segment of
// "Somewhere, Country". Appended to destinations because trending groups by destination string and
// caps at 12: a hundred trips naming only their specific stops produced a top-twelve where the
// leader appeared three times and everything else tied, which is a ranking of nothing. A trip
// carrying both "Kanazawa" and "Japan" lets the hub accumulate the way it does in real travel.
function regionOf(days) {
  const tally = {};
  for (const raw of days) {
    const parts = parsePlace(raw).place.split(',');
    if (parts.length < 2) continue;
    const region = parts[parts.length - 1].trim();
    tally[region] = (tally[region] ?? 0) + 1;
  }
  const ranked = Object.entries(tally).sort((one, other) => other[1] - one[1] || one[0].localeCompare(other[0]));
  return ranked.length === 0 ? null : ranked[0][0];
}

function buildTrip(spec) {
  const { title, destinations, days, currency, lifecycle, publish, bestTimeOfYear } = spec;
  const first = shortPlace(parsePlace(days[0]).place);
  const last = shortPlace(parsePlace(days[days.length - 1]).place);
  const region = regionOf(days);
  const withRegion = region !== null && !destinations.includes(region)
    ? [...destinations, region]
    : destinations;
  return {
    title,
    destinations: withRegion,
    description: pick(DESCRIPTIONS, seededRandom(`${title}/desc`)).replace('{d}', destinations[0]),
    standouts: [
      pick(STANDOUTS, seededRandom(`${title}/s1`)).replace('{a}', first).replace('{b}', last),
      pick(STANDOUTS, seededRandom(`${title}/s2`)).replace('{a}', last).replace('{b}', first),
    ],
    bestTimeOfYear,
    lifecycle,
    publish,
    days: days.map((raw, index) => buildDay(title, raw, index, days.length, currency)),
  };
}

module.exports = { buildTrip, seededRandom, activityCount, shortPlace, KINDS };
