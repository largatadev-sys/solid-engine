import {
  DEFAULT_FEEDBACK_STATE,
  feedbackStateFromStorage,
  feedbackStateToStorage,
  type FeedbackState,
} from '../src/feedback/dockPosition';

describe('feedbackStateFromStorage', () => {
  it('round-trips both persisted facts', () => {
    const state: FeedbackState = { visibility: 'revealed', position: { edge: 'left', y: 0.25 } };

    expect(feedbackStateFromStorage(feedbackStateToStorage(state))).toEqual(state);
  });

  it.each([
    ['nothing stored', null],
    ['an empty string', ''],
    ['unparseable text', '{not json'],
    ['a bare string', '"revealed"'],
    ['a null document', 'null'],
  ])('yields the defaults for %s', (_case, raw) => {
    expect(feedbackStateFromStorage(raw)).toEqual(DEFAULT_FEEDBACK_STATE);
  });

  it('keeps a good visibility when the position is corrupt', () => {
    const raw = JSON.stringify({ visibility: 'hidden', position: { edge: 'up', y: 0.5 } });

    expect(feedbackStateFromStorage(raw)).toEqual({ visibility: 'hidden', position: null });
  });

  it('drops a position whose fraction is not a finite number', () => {
    const raw = JSON.stringify({ visibility: 'default', position: { edge: 'right', y: 'low' } });

    expect(feedbackStateFromStorage(raw).position).toBeNull();
  });

  it('clamps a stored fraction into the unit range', () => {
    const above = JSON.stringify({ visibility: 'default', position: { edge: 'right', y: 4 } });
    const below = JSON.stringify({ visibility: 'default', position: { edge: 'left', y: -2 } });

    expect(feedbackStateFromStorage(above).position).toEqual({ edge: 'right', y: 1 });
    expect(feedbackStateFromStorage(below).position).toEqual({ edge: 'left', y: 0 });
  });
});
