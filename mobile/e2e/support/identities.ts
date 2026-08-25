export type PoolTag =
  | 't1' | 't2' | 't3' | 't4' | 't5' | 't6' | 't7' | 't8' | 't9' | 't10';

export type SharingPosture = 'shared' | 'wants-exclusive';

export interface SpecIdentities {
  readonly tags: readonly PoolTag[];
  readonly sharesWith: SharingPosture;
}

export const IDENTITY_MAP = {
  'api/discovery': { tags: ['t1', 't2'], sharesWith: 'shared' },
  'api/lifecycle': { tags: ['t1', 't2'], sharesWith: 'shared' },
  'api/create-flow': { tags: ['t1'], sharesWith: 'shared' },
  'api/publish': { tags: ['t1', 't2', 't3'], sharesWith: 'shared' },
  'api/media': { tags: ['t1', 't2'], sharesWith: 'shared' },
  'api/diary': { tags: ['t1', 't2', 't3'], sharesWith: 'shared' },
  'api/photo-dump': { tags: ['t1', 't2', 't3'], sharesWith: 'shared' },
  'api/buffered-plan': { tags: ['t1', 't2'], sharesWith: 'shared' },
  'api/ownership-transfer': { tags: ['t4', 't5'], sharesWith: 'wants-exclusive' },
  'api/archive-posture': { tags: ['t1', 't2'], sharesWith: 'shared' },
  'api/api-surface': { tags: ['t1', 't2', 't3'], sharesWith: 'shared' },
  'api/polls': { tags: ['t1', 't2'], sharesWith: 'shared' },
  'api/join-link': { tags: ['t1', 't2', 't3'], sharesWith: 'shared' },

  'web/discovery': { tags: ['t1', 't2'], sharesWith: 'shared' },
  'web/create-flow': { tags: ['t4'], sharesWith: 'shared' },
  'web/workspace': { tags: ['t1', 't2'], sharesWith: 'shared' },
  'web/drag-reorder': { tags: ['t2'], sharesWith: 'shared' },
  'web/publish': { tags: ['t3', 't1'], sharesWith: 'shared' },
  'web/diary': { tags: ['t3'], sharesWith: 'shared' },
  'web/photo-dump': { tags: ['t3'], sharesWith: 'shared' },
  'web/home': { tags: ['t1', 't2'], sharesWith: 'shared' },
  'web/profile': { tags: ['t5'], sharesWith: 'wants-exclusive' },
  'web/tab-bar': { tags: ['t4'], sharesWith: 'shared' },
  'web/ownership-transfer': { tags: ['t1', 't2'], sharesWith: 'wants-exclusive' },
  'web/archive': { tags: ['t1', 't2'], sharesWith: 'shared' },
  'web/trip-details': { tags: ['t1', 't2'], sharesWith: 'shared' },
  'web/fork': { tags: ['t3', 't4'], sharesWith: 'shared' },
  'web/polls': { tags: ['t1', 't2'], sharesWith: 'shared' },
  'web/trips-tabs': { tags: ['t4'], sharesWith: 'shared' },
  'web/socket-echo': { tags: ['t1', 't2'], sharesWith: 'shared' },
  'web/chat': { tags: ['t1', 't2'], sharesWith: 'shared' },
  'api/chat': { tags: ['t1', 't2'], sharesWith: 'shared' },
  'web/travelers': { tags: ['t1', 't2', 't4'], sharesWith: 'shared' },
  'web/join-landing': { tags: ['t3', 't4'], sharesWith: 'shared' },
  'web/invitation-inbox': { tags: ['t5', 't3'], sharesWith: 'shared' },
  'web/pending-request-card': { tags: ['t2', 't5'], sharesWith: 'shared' },
  'web/focus-freshness': { tags: ['t3'], sharesWith: 'shared' },
  'web/live-trips': { tags: ['t1', 't2'], sharesWith: 'shared' },
} as const satisfies Record<string, SpecIdentities>;

export type SpecKey = keyof typeof IDENTITY_MAP;

export const VERIFIED_TAGS: readonly PoolTag[] = ['t1', 't2', 't3', 't4', 't5'];

export const STRANGER_TAG: PoolTag = 't3';


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
