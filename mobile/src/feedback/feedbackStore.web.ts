import {
  DEFAULT_FEEDBACK_STATE,
  FEEDBACK_STORAGE_KEY,
  feedbackStateFromStorage,
  feedbackStateToStorage,
  type FeedbackState,
} from './dockPosition';


export async function loadFeedbackState(): Promise<FeedbackState> {
  if (typeof window === 'undefined' || window.localStorage === undefined) {
    return DEFAULT_FEEDBACK_STATE;
  }
  try {
    return feedbackStateFromStorage(window.localStorage.getItem(FEEDBACK_STORAGE_KEY));
  } catch {
    return DEFAULT_FEEDBACK_STATE;
  }
}


export async function saveFeedbackState(state: FeedbackState): Promise<void> {
  if (typeof window === 'undefined' || window.localStorage === undefined) {
    return;
  }
  try {
    window.localStorage.setItem(FEEDBACK_STORAGE_KEY, feedbackStateToStorage(state));
  } catch {
    return;
  }
}
