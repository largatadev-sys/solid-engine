import { useEffect, useState } from 'react';
import {
  DEFAULT_FEEDBACK_STATE,
  type DockPosition,
  type FeedbackState,
} from './dockPosition';
import { loadFeedbackState, saveFeedbackState } from './feedbackStore';
import type { DockVisibility } from './feedbackVisibility';


let current: FeedbackState = DEFAULT_FEEDBACK_STATE;
let loaded = false;
const listeners = new Set<(state: FeedbackState) => void>();


export function useFeedbackState(): FeedbackState {
  const [state, setState] = useState(current);

  useEffect(() => {
    listeners.add(setState);
    if (!loaded) {
      loaded = true;
      void loadFeedbackState().then(publish);
    } else {
      setState(current);
    }
    return () => {
      listeners.delete(setState);
    };
  }, []);

  return state;
}


export function setDockVisibility(visibility: DockVisibility): void {
  write({ ...current, visibility });
}


export function setDockPosition(position: DockPosition): void {
  write({ ...current, position });
}


export function resetFeedbackStateForTests(): void {
  current = DEFAULT_FEEDBACK_STATE;
  loaded = false;
  listeners.clear();
}


function write(next: FeedbackState): void {
  publish(next);
  void saveFeedbackState(next);
}


function publish(next: FeedbackState): void {
  current = next;
  listeners.forEach((listener) => listener(next));
}
