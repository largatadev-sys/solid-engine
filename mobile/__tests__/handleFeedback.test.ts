import {
  HANDLE_MAX_LENGTH,
  handleFeedbackFor,
  normalizeHandleInput,
} from '../src/onboarding/handleFeedback';
import type { HandleAvailabilityResponse } from '../src/types/api';

function verdict(
  handle: string,
  status: HandleAvailabilityResponse['status'],
): HandleAvailabilityResponse {
  return { handle, available: status === 'FREE', status };
}

describe('a handle the traveler already holds', () => {
  it('is submittable however short it is, so a planted 2-character handle never locks Save', () => {
    const feedback = handleFeedbackFor('ea', false, undefined, 'ea');

    expect(feedback.submittable).toBe(true);
    expect(feedback.tone).toBe('neutral');
  });

  it('needs no availability verdict, because nothing is being claimed', () => {
    expect(handleFeedbackFor('ea', true, undefined, 'ea').submittable).toBe(true);
  });

  it('stops being exempt the moment it is edited away from the stored value', () => {
    expect(handleFeedbackFor('e', false, undefined, 'ea').submittable).toBe(false);
    expect(handleFeedbackFor('eab', false, undefined, 'ea').submittable).toBe(false);
  });

  it('leaves the ordinary rules alone for a traveler who holds no handle yet', () => {
    expect(handleFeedbackFor('a', false, undefined, null).submittable).toBe(false);
    expect(handleFeedbackFor('anasilva', false, verdict('anasilva', 'FREE'), null).submittable).toBe(
      true,
    );
  });
});

describe('what the traveler is allowed to type', () => {
  it('uppercase is folded as they type, so what they see is what is stored', () => {
    expect(normalizeHandleInput('AnaSilva')).toBe('anasilva');
  });

  it('characters outside the alphabet are dropped rather than silently rejected on submit', () => {
    expect(normalizeHandleInput('ana.silva!')).toBe('anasilva');
    expect(normalizeHandleInput('ana silva')).toBe('anasilva');
    expect(normalizeHandleInput('ana_silva_9')).toBe('ana_silva_9');
  });

  it('the field cannot exceed the handle length the backend accepts', () => {
    expect(normalizeHandleInput('a'.repeat(50))).toHaveLength(HANDLE_MAX_LENGTH);
  });
});

describe('the live availability feedback', () => {
  it('says nothing accusatory before anything is typed', () => {
    const feedback = handleFeedbackFor('', false, undefined);

    expect(feedback.tone).toBe('neutral');
    expect(feedback.submittable).toBe(false);
  });

  it('a too-short handle is guidance, not an error', () => {
    expect(handleFeedbackFor('a', false, undefined).tone).toBe('neutral');
  });

  it('a two-character handle is below the minimum, so it never reaches the backend', () => {
    const feedback = handleFeedbackFor('cj', false, undefined);

    expect(feedback.submittable).toBe(false);
    expect(feedback.text).toBe('At least 3 characters.');
  });

  it('three characters is the shortest handle anyone can claim', () => {
    expect(handleFeedbackFor('abc', false, verdict('abc', 'FREE')).submittable).toBe(true);
  });

  it('is never submittable while a check is in flight', () => {
    expect(handleFeedbackFor('anasilva', true, undefined).submittable).toBe(false);
  });

  it('ignores a verdict about a handle the traveler has since edited', () => {
    const stale = verdict('anasilv', 'FREE');

    const feedback = handleFeedbackFor('anasilva', false, stale);

    expect(feedback.submittable).toBe(false);
    expect(feedback.text).toContain('Checking');
  });

  it('reports each backend verdict in its own words', () => {
    expect(handleFeedbackFor('anasilva', false, verdict('anasilva', 'FREE'))).toMatchObject({
      tone: 'good',
      submittable: true,
    });
    expect(handleFeedbackFor('anasilva', false, verdict('anasilva', 'TAKEN'))).toMatchObject({
      tone: 'bad',
      submittable: false,
    });
    expect(handleFeedbackFor('admin', false, verdict('admin', 'RESERVED'))).toMatchObject({
      tone: 'bad',
      submittable: false,
    });
    expect(handleFeedbackFor('ana silva', false, verdict('ana silva', 'MALFORMED'))).toMatchObject({
      tone: 'bad',
      submittable: false,
    });
  });

  it('only a free handle is ever submittable', () => {
    const statuses: HandleAvailabilityResponse['status'][] = [
      'FREE',
      'TAKEN',
      'RESERVED',
      'MALFORMED',
    ];

    const submittable = statuses.filter(
      (status) => handleFeedbackFor('anasilva', false, verdict('anasilva', status)).submittable,
    );

    expect(submittable).toEqual(['FREE']);
  });
});
