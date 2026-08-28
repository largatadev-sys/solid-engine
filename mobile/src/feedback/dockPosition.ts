import { asVisibility, type DockVisibility } from './feedbackVisibility';

export type DockEdge = 'left' | 'right';

export type DockPosition = {
  readonly edge: DockEdge;
  readonly y: number;
};

export type FeedbackState = {
  readonly visibility: DockVisibility;
  readonly position: DockPosition | null;
};

export const FEEDBACK_STORAGE_KEY = 'feedback.dock';

export const DEFAULT_FEEDBACK_STATE: FeedbackState = { visibility: 'default', position: null };


export function feedbackStateFromStorage(raw: string | null): FeedbackState {
  if (raw === null || raw === '') return DEFAULT_FEEDBACK_STATE;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return DEFAULT_FEEDBACK_STATE;
  }

  if (typeof parsed !== 'object' || parsed === null) return DEFAULT_FEEDBACK_STATE;
  const candidate = parsed as Record<string, unknown>;

  return {
    visibility: asVisibility(candidate.visibility),
    position: asPosition(candidate.position),
  };
}


export function feedbackStateToStorage(state: FeedbackState): string {
  return JSON.stringify(state);
}


function asPosition(stored: unknown): DockPosition | null {
  if (typeof stored !== 'object' || stored === null) return null;
  const candidate = stored as Record<string, unknown>;

  const edge = candidate.edge;
  const y = candidate.y;
  if (edge !== 'left' && edge !== 'right') return null;
  if (typeof y !== 'number' || !Number.isFinite(y)) return null;

  return { edge, y: Math.min(1, Math.max(0, y)) };
}
