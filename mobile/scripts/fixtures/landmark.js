const fs = require('fs');
const path = require('path');
const { photoForSlot } = require('../photoPool');


const CREDITS = 'CREDITS.json';

const FRAMING = new RegExp(
  '^(?:a|an|the)\\s+'
  + '|^(?:stunning|beautiful|breathtaking|gorgeous|vibrant|serene|scenic|amazing|majestic|dramatic'
  + '|picturesque|charming|peaceful|tranquil|striking|spectacular|colorful|colourful|iconic|historic'
  + '|idyllic|lush|impressive|panoramic|wide|close-up|high angle|low angle|aerial|overhead|elevated'
  + '|captivating|traditional|bustling|famous|popular)\\s+',
  'i',
);

const LENS = /^(?:aerial\s+|drone\s+|overhead\s+|panoramic\s+)?(?:view|shot|photo|image|photograph|capture|scene|panorama|glimpse|snapshot)\s+(?:of|over|from|across|along)\s+/i;

const TAIL = /\s+(?:with|in|on|under|along|near|surrounded|featuring|during|framed|against|amid|amidst|beneath|beside|at)\b.*$/i;

const CAMERA = new Set([
  'view', 'views', 'shot', 'photo', 'image', 'scene', 'panorama', 'landscape', 'cityscape',
  'skyline', 'nightlife', 'capture', 'glimpse', 'backdrop', 'silhouette', 'sunset', 'sunrise',
  'architecture', 'buildings', 'scenery', 'vista', 'closeup', 'portrait', 'wallpaper',
  'signage', 'sign', 'signs', 'street', 'streets', 'district', 'area', 'region', 'landmark',
]);

const NOT_A_NAME = new Set([
  'Explore', 'Discover', 'Visit', 'Enjoy', 'Experience', 'Capture', 'Aerial', 'Stunning',
  'Beautiful', 'Scenic', 'Panoramic', 'Serene', 'Peaceful', 'Breathtaking', 'Gorgeous', 'Vibrant',
  'Colorful', 'Colourful', 'Majestic', 'Dramatic', 'Picturesque', 'Charming', 'Historic', 'Iconic',
  'Traditional', 'Bustling', 'Tranquil', 'Captivating', 'High', 'Low', 'Wide', 'Close', 'Idyllic',
  'Lush', 'Striking', 'Spectacular', 'Amazing', 'Famous', 'Popular', 'Ideal', 'Perfect',
]);

const CONNECTORS = new Set(['de', 'del', 'della', 'di', 'da', 'do', 'dos', 'la', 'le', 'les', 'el', 'los', 'van', 'von', 'du', 'al']);

function subjectOf(alt) {
  let text = alt.trim();
  for (let i = 0; i < 6; i += 1) {
    const before = text;
    text = text.replace(FRAMING, '').replace(LENS, '');
    if (text === before) break;
  }
  text = text.split(/[,.;:!?]/)[0].replace(TAIL, '');
  for (let i = 0; i < 4; i += 1) text = text.replace(FRAMING, '');
  return text.replace(/['’]s\b.*$/, '').replace(/["'`]/g, '').trim();
}

function namedLandmark(alt) {
  if (alt === undefined || alt === null) return null;
  const subject = subjectOf(alt);
  if (subject.length < 4 || subject.length > 34) return null;

  const words = subject.split(/\s+/);
  if (words.length === 0 || words.length > 4) return null;

  for (const word of words) {
    const bare = word.replace(/[^A-Za-zÀ-ÿ']/g, '');
    if (bare === '') return null;
    if (CAMERA.has(bare.toLowerCase())) return null;
    if (NOT_A_NAME.has(bare)) return null;
    if (CONNECTORS.has(bare.toLowerCase())) continue;
    if (!/^[A-ZÀ-ÖØ-Þ]/.test(bare)) return null;
  }
  if (words.length === 1 && subject.length < 6) return null;
  return subject;
}

let cache;
function creditsIn(dir) {
  if (cache === undefined) {
    const file = path.join(dir, CREDITS);
    cache = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
  }
  return cache;
}

function landmarkAt(dir, place, slot) {
  const file = photoForSlot(dir, place, slot);
  if (file === undefined) return null;
  const entry = creditsIn(dir)[path.basename(file)];
  if (entry === undefined) return null;
  const landmark = namedLandmark(entry.alt);
  if (landmark === null) return null;

  const here = place.split(',')[0].trim().toLowerCase();
  if (landmark.toLowerCase() === here) return null;
  return landmark;
}

module.exports = { landmarkAt, namedLandmark, subjectOf };
