import { SCREEN_LABELS } from './screenLabels';

export const MAX_SCREEN_CHARS = 200;

const SEPARATOR = ' · ';


export function screenKeyOf(segments: readonly string[]): string {
  return segments.join('/');
}


export function screenStringOf(segments: readonly string[]): string {
  return pairedScreenString(screenKeyOf(segments), SCREEN_LABELS);
}


export function pairedScreenString(
  key: string,
  labels: Readonly<Record<string, string>>,
): string {
  const label = labels[key];

  if (label === undefined) return key.slice(0, MAX_SCREEN_CHARS);
  if (key === '') return label.slice(0, MAX_SCREEN_CHARS);

  const whole = `${label}${SEPARATOR}${key}`;
  if (whole.length <= MAX_SCREEN_CHARS) return whole;

  const roomForSegments = MAX_SCREEN_CHARS - label.length - SEPARATOR.length;
  if (roomForSegments <= 0) return label.slice(0, MAX_SCREEN_CHARS);

  return `${label}${SEPARATOR}${key.slice(0, roomForSegments)}`;
}
