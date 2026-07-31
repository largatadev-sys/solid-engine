import {
  attributionLine,
  holderLabel,
  leaseNotice,
  relativeTime,
} from '../src/itineraries/leaseIndicator';
import type { LeaseHolderResponse } from '../src/types/api';


function holder(overrides: Partial<LeaseHolderResponse> = {}): LeaseHolderResponse {
  return {
    travelerId: 'traveler-2',
    handle: 'largata_dev_t2',
    displayName: 'largata.dev+t2',
    avatarUrl: null,
    expiresAt: '2026-07-31T10:03:00Z',
    ...overrides,
  };
}

describe('who the lock indicator names (ADR-014 as amended: handle first)', () => {
  it('prefers the @handle, which is what the mock renders', () => {
    expect(holderLabel(holder())).toBe('@largata_dev_t2');
  });

  it('falls back to the display name for an account that never claimed a handle', () => {
    expect(holderLabel(holder({ handle: null }))).toBe('largata.dev+t2');
  });

  it('says something rather than nothing when it knows neither', () => {
    expect(holderLabel(holder({ handle: null, displayName: null }))).toBe('another member');
  });
});

describe('the advisory lock indicator', () => {
  it('names the holder when somebody else holds the subject', () => {
    expect(leaseNotice(holder(), 'traveler-1')).toBe('Being edited by @largata_dev_t2');
  });

  it('says nothing about a lease you hold yourself — you are not blocked by you', () => {
    expect(leaseNotice(holder(), 'traveler-2')).toBeNull();
  });

  it('says nothing when no lease is in the payload — an expired one is simply absent', () => {
    expect(leaseNotice(null, 'traveler-1')).toBeNull();
    expect(leaseNotice(undefined, 'traveler-1')).toBeNull();
  });

  it('still names a holder when the reader is unknown, rather than hiding the border', () => {
    expect(leaseNotice(holder(), undefined)).toBe('Being edited by @largata_dev_t2');
  });
});

describe('relative time, for the attribution chip', () => {
  const now = Date.parse('2026-07-31T12:00:00Z');

  it('reads "just now" inside the first minute', () => {
    expect(relativeTime('2026-07-31T11:59:30Z', now)).toBe('just now');
  });

  it('counts minutes, then hours, then days', () => {
    expect(relativeTime('2026-07-31T11:58:00Z', now)).toBe('2m ago');
    expect(relativeTime('2026-07-31T09:00:00Z', now)).toBe('3h ago');
    expect(relativeTime('2026-07-29T12:00:00Z', now)).toBe('2d ago');
  });

  it('never renders a negative age from a clock that is slightly ahead', () => {
    expect(relativeTime('2026-07-31T12:00:30Z', now)).toBe('just now');
  });

  it('degrades to a word rather than NaN on an unparseable instant', () => {
    expect(relativeTime('not a timestamp', now)).toBe('recently');
  });
});

describe('the attribution chip (spec AC 14)', () => {
  const now = Date.parse('2026-07-31T12:00:00Z');

  it('renders "@handle · relative time" from the additive payload fields', () => {
    expect(
      attributionLine(
        { lastEditedByHandle: 'largata_dev_t2', lastEditedByName: 'ignored', lastEditedAt: '2026-07-31T11:58:00Z' },
        now,
      ),
    ).toBe('Updated 2m ago by @largata_dev_t2');
  });

  it('falls back to the display name when the editor has no handle', () => {
    expect(
      attributionLine(
        { lastEditedByHandle: null, lastEditedByName: 'Ana', lastEditedAt: '2026-07-31T11:58:00Z' },
        now,
      ),
    ).toBe('Updated 2m ago by Ana');
  });

  it('still attributes when the server sent neither name', () => {
    expect(attributionLine({ lastEditedAt: '2026-07-31T11:58:00Z' }, now)).toBe(
      'Updated 2m ago by a member',
    );
  });
});
