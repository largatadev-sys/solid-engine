export const DOCK_LABEL = 'Send feedback';

export const SHEET_TITLE = 'Send feedback';

export const SHEET_CLOSE_LABEL = 'Close';

export const TYPE_PROBLEM_LABEL = 'Problem';

export const TYPE_IDEA_LABEL = 'Idea';

export const DESCRIPTION_LABEL_PROBLEM = 'What happened?';

export const DESCRIPTION_LABEL_IDEA = "What's your idea?";

export const DESCRIPTION_PLACEHOLDER = 'Tell us what you were doing and what went wrong.';

export const SCREENSHOTS_LABEL = 'Screenshots';

export const SCREENSHOTS_NOTE_EMPTY = 'Optional · up to 3';

export const ADD_SCREENSHOT_LABEL = 'Add';

export const REMOVE_SCREENSHOT_LABEL = 'Remove screenshot';

export const SEND_LABEL = 'Send';

export const SENDING_LABEL = 'Sending…';

export const RETRY_LABEL = 'Try again';

export const THANK_YOU_TITLE = 'Thanks — that helps';

export const THANK_YOU_BODY =
  'A real person reads every one of these. There is nothing else for you to do.';

export const DONE_LABEL = 'Done';

export const DISMISS_ZONE_LABEL = 'Remove feedback button';


export function screenshotsNote(count: number, max: number): string {
  return count === 0 ? SCREENSHOTS_NOTE_EMPTY : `${count} of ${max}`;
}


export function descriptionLabel(type: 'problem' | 'idea'): string {
  return type === 'problem' ? DESCRIPTION_LABEL_PROBLEM : DESCRIPTION_LABEL_IDEA;
}
