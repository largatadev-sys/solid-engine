export const MAX_DESCRIPTION_LENGTH = 2000;

export const COUNTER_VISIBLE_FROM = 1800;

export type FeedbackPhase = 'editing' | 'sending' | 'failed' | 'sent';

export type FieldAtFault = 'description' | 'screenshots' | null;

export type FailedAttempt = {
  readonly description: string;
  readonly screenshotCount: number;
};


export function counterState(length: number): {
  readonly visible: boolean;
  readonly atCap: boolean;
  readonly label: string;
} {
  return {
    visible: length >= COUNTER_VISIBLE_FROM,
    atCap: length >= MAX_DESCRIPTION_LENGTH,
    label: `${withThousands(length)} / ${withThousands(MAX_DESCRIPTION_LENGTH)}`,
  };
}


export function clampToCap(description: string): string {
  return [...description].slice(0, MAX_DESCRIPTION_LENGTH).join('');
}


export function hasDescription(description: string): boolean {
  return description.trim().length > 0;
}


export function fieldAtFault(status: number | null): FieldAtFault {
  if (status === 413) return 'screenshots';
  if (status === 400) return 'description';
  return null;
}


export function sendEnabled(
  phase: FeedbackPhase,
  description: string,
  screenshotCount: number,
  retryable: boolean,
  failedAt: FailedAttempt | null,
): boolean {
  if (phase === 'sending' || phase === 'sent') return false;
  if (!hasDescription(description)) return false;
  if (phase !== 'failed') return true;
  if (retryable) return true;
  if (failedAt === null) return true;
  return description !== failedAt.description || screenshotCount !== failedAt.screenshotCount;
}


export function sendLabelFor(
  phase: FeedbackPhase,
  retryable: boolean,
  sendLabel: string,
  retryLabel: string,
): string {
  return phase === 'failed' && retryable ? retryLabel : sendLabel;
}


export function guardsDismiss(phase: FeedbackPhase, description: string): boolean {
  if (phase === 'sent') return false;
  return hasDescription(description);
}


function withThousands(value: number): string {
  return value.toLocaleString('en-US');
}
