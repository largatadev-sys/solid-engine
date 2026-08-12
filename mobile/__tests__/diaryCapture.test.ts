import {
  addPhotosLabel,
  canSubmit,
  captureLabel,
  capturesAreOpen,

  entryForActivity,
  MAX_DIARY_PHOTOS,
  roomLeft,
  savedMessage,
  successMessage,
  togglePick,
} from '../src/diary/diaryCapture';
import { DIARY_PRIVACY_NOTE } from '../src/diary/diaryCopy';
import {
  inTripDayOrder,
  snapshotEyebrow,
  tripEntryCountLabel,
} from '../src/diary/postcardAnatomy';
import type { DiaryEntryResponse } from '../src/types/api';


function entry(overrides: Partial<DiaryEntryResponse> = {}): DiaryEntryResponse {
  return {
    id: 'e1',
    itineraryId: 'i1',
    activityId: 'a1',
    activityTitle: 'Sunset at Las Cabanas',
    dayLabel: 'Day 1',
    timeOfDay: null,
    caption: null,
    photos: [],
    sharedAt: null,
    createdAt: '2026-08-11T10:00:00Z',
    updatedAt: '2026-08-11T10:00:00Z',
    ...overrides,
  };
}


describe('capturesAreOpen', () => {
  it('opens once the trip has started, and stays open for the retro case', () => {
    expect(capturesAreOpen('ongoing')).toBe(true);
    expect(capturesAreOpen('completed')).toBe(true);
  });

  it('stays shut before the trip happens — a diary of a trip that has not happened is fiction', () => {
    expect(capturesAreOpen('draft')).toBe(false);
    expect(capturesAreOpen('upcoming')).toBe(false);
  });
});


describe('entryForActivity and captureLabel', () => {
  it('reads the link from the viewers own entries, never anybody elses', () => {
    const mine = entry({ activityId: 'a1' });

    expect(captureLabel(entryForActivity([mine], 'a1'))).toBe('Added ✓');
    expect(captureLabel(entryForActivity([mine], 'a2'))).toBe('Add to Diary');
    expect(captureLabel(entryForActivity([], 'a1'))).toBe('Add to Diary');
  });

  it('ignores an entry whose activity has been deleted rather than matching it to nothing', () => {
    const orphaned = entry({ activityId: null });

    expect(entryForActivity([orphaned], 'a1')).toBeNull();
  });
});


describe('the photo floor and cap', () => {
  it('needs at least one photo — a postcard IS a photo', () => {
    expect(canSubmit(0)).toBe(false);
    expect(canSubmit(1)).toBe(true);
  });

  it('holds five and refuses the sixth', () => {
    expect(canSubmit(MAX_DIARY_PHOTOS)).toBe(true);
    expect(canSubmit(MAX_DIARY_PHOTOS + 1)).toBe(false);
    expect(roomLeft(MAX_DIARY_PHOTOS)).toBe(0);
    expect(roomLeft(2)).toBe(3);
  });
});


describe('picking from the dump', () => {
  it('adds a photo, and tapping it again takes it back out', () => {
    expect(togglePick([], 'p1', 5)).toEqual(['p1']);
    expect(togglePick(['p1', 'p2'], 'p1', 3)).toEqual(['p2']);
  });

  it('refuses a new pick with no room left, but still lets you deselect', () => {
    expect(togglePick(['p1'], 'p2', 0)).toEqual(['p1']);
    expect(togglePick(['p1'], 'p1', 0)).toEqual([]);
  });

  it('never mutates the array it was handed', () => {
    const picked = ['p1'];

    togglePick(picked, 'p2', 5);

    expect(picked).toEqual(['p1']);
  });

  it('counts the selection in the confirm button, in words', () => {
    expect(addPhotosLabel(0)).toBe('Select photos');
    expect(addPhotosLabel(1)).toBe('Add 1 photo');
    expect(addPhotosLabel(3)).toBe('Add 3 photos');
  });
});


describe('the copy the founder pinned', () => {
  it('reads exactly as approved at the grilling', () => {
    expect(DIARY_PRIVACY_NOTE).toBe('Only you can see your diary. It shows up on your profile.');
  });

  it('names the activity on the success screen', () => {
    expect(successMessage('Sunset at Las Cabanas')).toBe(
      'Sunset at Las Cabanas is now part of your Diary.',
    );
  });

  it('tells an edit apart from a first post — a save never claims the entry is new', () => {
    expect(savedMessage('Sunset at Las Cabanas')).toBe(
      'Your entry for Sunset at Las Cabanas is up to date.',
    );
    expect(savedMessage('Sunset at Las Cabanas')).not.toContain('is now part of');
  });
});


describe('snapshotEyebrow', () => {
  it('reads the day and the time the postcard recorded, in the mocks 12-hour clock', () => {
    expect(snapshotEyebrow({ dayLabel: 'Day 2: Lagoon', timeOfDay: '14:30' })).toBe(
      'Day 2: Lagoon • 2:30 PM',
    );
  });

  it('falls back to the day alone when the activity carried no time', () => {
    expect(snapshotEyebrow({ dayLabel: 'Day 1', timeOfDay: null })).toBe('Day 1');
  });

  it('drops the leading zero the mock does not draw, without moving the TimePickers padded clock', () => {
    expect(snapshotEyebrow({ dayLabel: 'Day 1', timeOfDay: '09:00' })).toBe('Day 1 • 9:00 AM');
    expect(snapshotEyebrow({ dayLabel: 'Day 1', timeOfDay: '12:00' })).toBe('Day 1 • 12:00 PM');
  });
});


describe('inTripDayOrder', () => {
  it('reads the trip as it was lived, not as it was posted', () => {
    const dayThree = entry({ id: 'a', dayLabel: 'Day 3', timeOfDay: '09:00' });
    const dayOneMorning = entry({ id: 'b', dayLabel: 'Day 1', timeOfDay: '08:00' });
    const dayOneEvening = entry({ id: 'c', dayLabel: 'Day 1', timeOfDay: '19:00' });

    expect(inTripDayOrder([dayThree, dayOneEvening, dayOneMorning]).map((e) => e.id)).toEqual([
      'b',
      'c',
      'a',
    ]);
  });

  it('sorts Day 10 after Day 9 — the label is text, so a string compare would invert them', () => {
    const nine = entry({ id: 'a', dayLabel: 'Day 9' });
    const ten = entry({ id: 'b', dayLabel: 'Day 10' });

    expect(inTripDayOrder([ten, nine]).map((e) => e.id)).toEqual(['a', 'b']);
  });

  it('keeps a titled day with its ordinal, and puts an unparseable label last', () => {
    const titled = entry({ id: 'a', dayLabel: 'Day 2: Lagoon Exploration' });
    const first = entry({ id: 'b', dayLabel: 'Day 1' });
    const strange = entry({ id: 'c', dayLabel: 'Somewhere' });

    expect(inTripDayOrder([strange, titled, first]).map((e) => e.id)).toEqual(['b', 'a', 'c']);
  });

  it('leaves the caller\'s array untouched', () => {
    const given = [entry({ id: 'a', dayLabel: 'Day 2' }), entry({ id: 'b', dayLabel: 'Day 1' })];

    inTripDayOrder(given);

    expect(given.map((e) => e.id)).toEqual(['a', 'b']);
  });
});


describe('tripEntryCountLabel', () => {
  it('counts entries in words a traveler reads', () => {
    expect(tripEntryCountLabel(1)).toBe('1 entry');
    expect(tripEntryCountLabel(4)).toBe('4 entries');
  });
});
