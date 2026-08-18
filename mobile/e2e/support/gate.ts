import { test } from '@playwright/test';
import { authenticatedReadiness, backendReachable, missingPoolEnv } from './pool';
import { IDENTITY_MAP, assertVerified, type PoolTag, type SpecKey } from './identities';

export function requireStack(tag: PoolTag): void {
  test.beforeAll(async () => {
    const missing = missingPoolEnv();
    if (missing.length > 0) {
      test.skip(
        true,
        `pool environment absent (${missing.join(', ')}) — run: cd mobile && set -a && . ./.env && set +a`,
      );
    }
    if (!(await backendReachable())) {
      test.skip(true, 'backend unreachable — this spec never ran; it is not a product failure');
    }
    if (!(await authenticatedReadiness(tag))) {
      test.skip(
        true,
        `backend is up but rejecting ${tag}'s token — this spec never ran; it is not a product failure`,
      );
    }
  });
}

export function sharersOf(spec: SpecKey): SpecKey[] {
  const claim = IDENTITY_MAP[spec];
  return (Object.keys(IDENTITY_MAP) as SpecKey[])
    .filter((other) => other !== spec)
    .filter((other) =>
      IDENTITY_MAP[other].tags.some((tag) => (claim.tags as readonly PoolTag[]).includes(tag)));
}

export function unmetExclusivity(): Array<{ spec: SpecKey; sharedWith: SpecKey[] }> {
  return (Object.keys(IDENTITY_MAP) as SpecKey[])
    .filter((spec) => IDENTITY_MAP[spec].sharesWith === 'wants-exclusive')
    .map((spec) => ({ spec, sharedWith: sharersOf(spec) }))
    .filter((row) => row.sharedWith.length > 0);
}
