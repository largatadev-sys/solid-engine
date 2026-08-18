export type PoolTag =
  | 't1' | 't2' | 't3' | 't4' | 't5' | 't6' | 't7' | 't8' | 't9' | 't10';

export interface SpecIdentities {
  readonly tags: readonly PoolTag[];
  readonly exclusive: boolean;
}

export const IDENTITY_MAP = {
  'api/discovery': { tags: ['t1', 't2'], exclusive: false },
  'api/lifecycle': { tags: ['t1', 't2'], exclusive: false },
  'api/create-flow': { tags: ['t1'], exclusive: false },
  'api/publish': { tags: ['t1', 't2', 't3'], exclusive: false },
  'api/media': { tags: ['t1', 't2'], exclusive: false },
  'api/diary': { tags: ['t1', 't2', 't3'], exclusive: false },
  'api/photo-dump': { tags: ['t1', 't2', 't3'], exclusive: false },
  'api/buffered-plan': { tags: ['t1', 't2'], exclusive: false },
  'api/ownership-transfer': { tags: ['t4', 't5'], exclusive: true },
  'api/archive-posture': { tags: ['t1', 't2'], exclusive: false },
  'api/api-surface': { tags: ['t1', 't2', 't3'], exclusive: false },

  'web/discovery': { tags: ['t1', 't2'], exclusive: false },
  'web/create-flow': { tags: ['t4'], exclusive: false },
  'web/workspace': { tags: ['t1', 't2'], exclusive: false },
  'web/drag-reorder': { tags: ['t2'], exclusive: false },
  'web/publish': { tags: ['t3', 't1'], exclusive: false },
  'web/diary': { tags: ['t3'], exclusive: false },
  'web/photo-dump': { tags: ['t3'], exclusive: false },
  'web/home': { tags: ['t1', 't2'], exclusive: false },
  'web/profile': { tags: ['t5'], exclusive: true },
  'web/tab-bar': { tags: ['t4'], exclusive: false },
  'web/ownership-transfer': { tags: ['t1', 't2'], exclusive: true },
  'web/archive': { tags: ['t1', 't2'], exclusive: false },
} as const satisfies Record<string, SpecIdentities>;

export type SpecKey = keyof typeof IDENTITY_MAP;

export const VERIFIED_TAGS: readonly PoolTag[] = ['t1', 't2', 't3', 't4', 't5'];

export const STRANGER_TAG: PoolTag = 't3';

export const SPARE_TAG: PoolTag = STRANGER_TAG;

export function assertVerified(tag: PoolTag, spec: string): void {
  if (!VERIFIED_TAGS.includes(tag)) {
    throw new Error(
      `${spec} signs in as ${tag}, which is not in VERIFIED_TAGS. `
        + 'An unverified account lands on the verify screen, which issues an OTP and SPENDS A REAL '
        + 'EMAIL against the shared Resend quota. Use a verified tag, or verify this one by hand '
        + '(node scripts/test-pool.js create, then click the link) and add it to VERIFIED_TAGS.',
    );
  }
}

export function identitiesFor(spec: SpecKey): SpecIdentities {
  return IDENTITY_MAP[spec];
}

export function ownerTagFor(spec: SpecKey): PoolTag {
  const first = IDENTITY_MAP[spec].tags[0];
  if (first === undefined) throw new Error(`identity map: ${spec} lists no tags`);
  return first;
}
