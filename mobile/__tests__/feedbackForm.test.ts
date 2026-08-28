import {
  clampToCap,
  counterState,
  COUNTER_VISIBLE_FROM,
  fieldAtFault,
  guardsDismiss,
  hasDescription,
  MAX_DESCRIPTION_LENGTH,
  sendEnabled,
  sendLabelFor,
} from '../src/feedback/feedbackForm';
import { RETRY_LABEL, SEND_LABEL, screenshotsNote } from '../src/feedback/feedbackCopy';

const filled = (length: number) => 'x'.repeat(length);

describe('counterState', () => {
  it('stays hidden below the reveal threshold', () => {
    expect(counterState(COUNTER_VISIBLE_FROM - 1).visible).toBe(false);
  });

  it('appears at the threshold', () => {
    expect(counterState(COUNTER_VISIBLE_FROM).visible).toBe(true);
  });

  it('crosses to the cap colour only at the cap', () => {
    expect(counterState(MAX_DESCRIPTION_LENGTH - 1).atCap).toBe(false);
    expect(counterState(MAX_DESCRIPTION_LENGTH).atCap).toBe(true);
  });

  it('labels the count against the cap', () => {
    expect(counterState(1850).label).toBe('1,850 / 2,000');
  });
});

describe('clampToCap', () => {
  it('leaves a description under the cap alone', () => {
    expect(clampToCap(filled(10))).toHaveLength(10);
  });

  it('hard-caps a longer one', () => {
    expect(clampToCap(filled(MAX_DESCRIPTION_LENGTH + 500))).toHaveLength(MAX_DESCRIPTION_LENGTH);
  });

  it('counts an astral character once', () => {
    expect(clampToCap('👍'.repeat(MAX_DESCRIPTION_LENGTH + 1))).toHaveLength(
      MAX_DESCRIPTION_LENGTH * 2,
    );
  });
});

describe('hasDescription', () => {
  it.each([
    ['empty', '', false],
    ['whitespace only', '   \n ', false],
    ['a single character', 'x', true],
  ])('%s', (_case, description, expected) => {
    expect(hasDescription(description)).toBe(expected);
  });
});

describe('sendEnabled', () => {
  it('is inert until the description has a character', () => {
    expect(sendEnabled('editing', '', 0, true, null)).toBe(false);
    expect(sendEnabled('editing', 'it broke', 0, true, null)).toBe(true);
  });

  it.each(['sending', 'sent'] as const)('is inert while %s', (phase) => {
    expect(sendEnabled(phase, 'it broke', 0, true, null)).toBe(false);
  });

  it('stays live after a retryable failure', () => {
    expect(
      sendEnabled('failed', 'it broke', 0, true, { description: 'it broke', screenshotCount: 0 }),
    ).toBe(true);
  });

  it('holds inert after a non-retryable failure until something changes', () => {
    const failedAt = { description: 'it broke', screenshotCount: 2 };

    expect(sendEnabled('failed', 'it broke', 2, false, failedAt)).toBe(false);
    expect(sendEnabled('failed', 'it broke badly', 2, false, failedAt)).toBe(true);
    expect(sendEnabled('failed', 'it broke', 1, false, failedAt)).toBe(true);
  });
});

describe('sendLabelFor', () => {
  it('relabels only for a retryable failure', () => {
    expect(sendLabelFor('failed', true, SEND_LABEL, RETRY_LABEL)).toBe(RETRY_LABEL);
    expect(sendLabelFor('failed', false, SEND_LABEL, RETRY_LABEL)).toBe(SEND_LABEL);
    expect(sendLabelFor('editing', true, SEND_LABEL, RETRY_LABEL)).toBe(SEND_LABEL);
  });
});

describe('fieldAtFault', () => {
  it.each([
    [413, 'screenshots'],
    [400, 'description'],
    [429, null],
    [500, null],
    [0, null],
    [null, null],
  ])('marks %s as %s', (status, expected) => {
    expect(fieldAtFault(status)).toBe(expected);
  });
});

describe('guardsDismiss', () => {
  it('blocks a dismiss while the description is dirty', () => {
    expect(guardsDismiss('editing', 'half a paragraph')).toBe(true);
  });

  it('lets a clean form close', () => {
    expect(guardsDismiss('editing', '   ')).toBe(false);
  });

  it('never blocks once sent', () => {
    expect(guardsDismiss('sent', 'half a paragraph')).toBe(false);
  });
});

describe('screenshotsNote', () => {
  it('reads as optional while empty, then counts', () => {
    expect(screenshotsNote(0, 3)).toBe('Optional · up to 3');
    expect(screenshotsNote(2, 3)).toBe('2 of 3');
  });
});
