import { File, Paths } from 'expo-file-system';
import {
  DEFAULT_FEEDBACK_STATE,
  feedbackStateFromStorage,
  feedbackStateToStorage,
  type FeedbackState,
} from './dockPosition';


const FEEDBACK_FILE = 'feedback-dock.json';


export async function loadFeedbackState(): Promise<FeedbackState> {
  try {
    const file = new File(Paths.document, FEEDBACK_FILE);
    if (!file.exists) {
      return DEFAULT_FEEDBACK_STATE;
    }
    return feedbackStateFromStorage(file.textSync());
  } catch {
    return DEFAULT_FEEDBACK_STATE;
  }
}


export async function saveFeedbackState(state: FeedbackState): Promise<void> {
  try {
    const file = new File(Paths.document, FEEDBACK_FILE);
    file.write(feedbackStateToStorage(state));
  } catch {
    return;
  }
}
