import {
  canRemovePhoto,
  canSubmit,
  captureLabel,
  capturesAreOpen,
  DIARY_PRIVACY_NOTE,
  entryForActivity,
  MAX_DIARY_PHOTOS,
  roomLeft,
  successMessage,
} from '../src/diary/diaryCapture';
import { snapshotEyebrow, tripEntryCountLabel } from '../src/diary/postcardAnatomy';
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

  it('never lets the last photo be removed', () => {
    expect(canRemovePhoto(1)).toBe(false);
    expect(canRemovePhoto(2)).toBe(true);
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


describe('tripEntryCountLabel', () => {
  it('counts entries in words a traveler reads', () => {
    expect(tripEntryCountLabel(1)).toBe('1 entry');
    expect(tripEntryCountLabel(4)).toBe('4 entries');
  });
});
