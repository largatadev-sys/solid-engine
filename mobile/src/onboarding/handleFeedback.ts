import type { HandleAvailabilityResponse } from '../types/api';
import { HANDLE_MIN_LENGTH } from '../query/travelerQueries';


export type FeedbackTone = 'neutral' | 'good' | 'bad';

export interface HandleFeedback {
  readonly text: string;
  readonly tone: FeedbackTone;
  readonly submittable: boolean;
}


export function handleFeedbackFor(
  typed: string,
  checking: boolean,
  result: HandleAvailabilityResponse | undefined,
  stored: string | null = null,
): HandleFeedback {
  if (stored !== null && typed === stored) {
    return { text: `@${typed} is yours.`, tone: 'neutral', submittable: true };
  }
  if (typed.length === 0) {
    return { text: 'Pick a handle people can find you by.', tone: 'neutral', submittable: false };
  }
  if (typed.length < HANDLE_MIN_LENGTH) {
    return { text: `At least ${HANDLE_MIN_LENGTH} characters.`, tone: 'neutral', submittable: false };
  }
  if (checking || result === undefined || result.handle !== typed) {
    return { text: 'Checking...', tone: 'neutral', submittable: false };
  }

  switch (result.status) {
    case 'FREE':
      return { text: `@${typed} is available.`, tone: 'good', submittable: true };
    case 'TAKEN':
      return { text: `@${typed} is already taken.`, tone: 'bad', submittable: false };
    case 'RESERVED':
      return { text: 'That handle is reserved. Pick another.', tone: 'bad', submittable: false };
    case 'MALFORMED':
      return {
        text: 'Letters, numbers and underscores only.',
        tone: 'bad',
        submittable: false,
      };
  }
}


export function normalizeHandleInput(raw: string): string {
  return raw.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, HANDLE_MAX_LENGTH);
}


export const HANDLE_MAX_LENGTH = 20;
