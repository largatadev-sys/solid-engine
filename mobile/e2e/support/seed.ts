import { readFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { api, profileFor, request, tokenFor, API } from './pool';
import type { PoolTag } from './identities';

export const FIXTURE_PHOTO = join(__dirname, '../../scripts/fixtures/photo.jpg');

export interface SeededTrip {
  id: string;
  title: string;
  ownerTag: PoolTag;
  ownerToken: string;
}

export class SeedFailure extends Error {
  constructor(what: string, detail: unknown) {
    super(`could not seed ${what}: ${typeof detail === 'string' ? detail : JSON.stringify(detail)}`);
    this.name = 'SeedFailure';
  }
}

export function stamp(prefix: string): string {
  const unique = `${process.pid.toString(36)}${Math.floor(performance.now() * 1000).toString(36)}`;
  return `${prefix} ${unique}`;
}

export async function seedTrip(options: {
  ownerTag: PoolTag;
  title: string;
  destinations?: string[];
  members?: PoolTag[];
}): Promise<SeededTrip> {
  const ownerToken = await tokenFor(options.ownerTag);
  await profileFor(options.ownerTag);

  const created = await api('/v1/itineraries', 'POST', ownerToken, {
    title: options.title,
    destinations: options.destinations ?? ['Palawan'],
  });
  if (created.status !== 201) throw new SeedFailure('a trip', created.body);

  const trip: SeededTrip = {
    id: created.body.id,
    title: options.title,
    ownerTag: options.ownerTag,
    ownerToken,
  };

  for (const tag of options.members ?? []) {
    await joinTrip(trip, tag);
  }
  return trip;
}

export async function joinTrip(trip: SeededTrip, tag: PoolTag): Promise<void> {
  const memberToken = await tokenFor(tag);
  const memberProfile = await profileFor(tag);

  const invited = await api(
    `/v1/itineraries/${trip.id}/invitations/by-handle`,
    'POST',
    trip.ownerToken,
    { handle: memberProfile.handle },
  );
  if (invited.status !== 201) throw new SeedFailure(`an invitation for ${tag}`, invited.body);

  const accepted = await api(`/v1/invitations/${invited.body.id}/accept`, 'POST', memberToken, {});
  if (accepted.status !== 200) throw new SeedFailure(`${tag}'s acceptance`, accepted.body);
}

export async function seedDay(trip: SeededTrip, position: number): Promise<string> {
  const created = await api(`/v1/itineraries/${trip.id}/days`, 'POST', trip.ownerToken, { position });
  if (created.status !== 201) throw new SeedFailure('a day', created.body);
  return created.body.id;
}

export async function seedActivity(
  trip: SeededTrip,
  dayId: string,
  fields: Record<string, unknown>,
): Promise<string> {
  const created = await api(
    `/v1/itineraries/${trip.id}/days/${dayId}/activities`,
    'POST',
    trip.ownerToken,
    fields,
  );
  if (created.status !== 201) throw new SeedFailure('an activity', created.body);
  return created.body.id;
}

export async function uploadPhoto(
  route: string,
  token: string,
  file: string = FIXTURE_PHOTO,
): Promise<{ status: number; body: any }> {
  const boundary = `----largatae2e${process.hrtime.bigint().toString(36)}`;
  const payload = Buffer.concat([
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="photo"; `
        + `filename="${basename(file)}"\r\nContent-Type: image/jpeg\r\n\r\n`,
    ),
    readFileSync(file),
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ]);
  return request(API + route, 'POST', payload, {
    Authorization: `Bearer ${token}`,
    'Content-Type': `multipart/form-data; boundary=${boundary}`,
  });
}

export async function seedCover(trip: SeededTrip): Promise<void> {
  const header = { subjectType: 'header' };
  const lease = await api(`/v1/itineraries/${trip.id}/edit-lock`, 'POST', trip.ownerToken, header);
  if (lease.status !== 200 && lease.status !== 201) {
    throw new SeedFailure('the header lease a cover upload requires', lease.body);
  }
  const uploaded = await uploadPhoto(`/v1/itineraries/${trip.id}/cover`, trip.ownerToken);
  await api(`/v1/itineraries/${trip.id}/edit-lock`, 'DELETE', trip.ownerToken, header);
  if (uploaded.status !== 200 && uploaded.status !== 201) {
    throw new SeedFailure('the cover image', uploaded.body);
  }
}

export async function climbTo(
  trip: SeededTrip,
  state: 'upcoming' | 'ongoing' | 'completed',
): Promise<void> {
  const ladder: Record<string, string> = {
    upcoming: '/finish-planning',
    ongoing: '/start',
    completed: '/complete',
  };
  const rungs: Array<'upcoming' | 'ongoing' | 'completed'> = ['upcoming', 'ongoing', 'completed'];
  for (const rung of rungs) {
    const moved = await api(`/v1/itineraries/${trip.id}${ladder[rung]}`, 'POST', trip.ownerToken, {});
    if (moved.status !== 200) throw new SeedFailure(`the climb to ${rung}`, moved.body);
    if (rung === state) return;
  }
}
