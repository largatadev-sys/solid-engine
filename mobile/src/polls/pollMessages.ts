import { ApiError } from '../api/ApiError';


export const POLLS_EMPTY_TITLE = 'No polls yet';

export const POLLS_EMPTY_BODY =
  "Can't decide on an activity? Put it to a vote. Anyone in the trip can start a poll.";

export const POLLS_CREATE_CTA = 'Create a Poll';

export const POLLS_ACTIVE_SECTION = 'Active Polls';

export const POLLS_COMPLETED_SECTION = 'Completed Polls';

export const POLL_OPEN_BADGE = 'Voting Open';

export const POLL_CLOSED_BADGE = 'Closed';

export const POLL_PROGRESS_LABEL = 'Voting Progress';

export const POLL_CHANGE_HINT = 'Tap another option to change your vote.';

export const POLL_NO_VOTES_BODY = 'Nobody voted before this poll closed.';

export const POLLS_LOAD_FAILURE = 'Could not load this trip’s polls.';

export const POLLS_ARCHIVED_NOTE = 'This trip is archived, so its polls are read-only.';

export const POLL_CLOSE_NOW_LABEL = 'Close Poll Now';

export const POLL_DELETE_LABEL = 'Delete Poll';

export const POLL_DELETE_KEEP_LABEL = 'Keep Poll';

export const POLL_DELETE_CONFIRM_LABEL = 'Delete Poll, confirm';

export const POLL_QUESTION_LABEL = 'Poll Question';

export const POLL_QUESTION_PLACEHOLDER = 'What are you deciding?';

export const POLL_OPTIONS_LABEL = 'Options';

export const POLL_OPTIONS_HELPER = '2–10 · single choice';

export const POLL_OPTION_PLACEHOLDER = 'Option';

export const POLL_ADD_OPTION_LABEL = 'Add Option';

export const POLL_CLOSES_LABEL = 'Poll closes';

export const POLL_CLOSES_HELPER = 'Required · defaults to 24 hours from now';

export const POLL_CREATE_SUBMIT_LABEL = 'Create Poll';

export const POLL_CREATE_CANCEL_LABEL = 'Cancel';

export const POLL_REMOVE_OPTION_LABEL = 'Remove option';


export function pollDeleteWording(question: string, voteCount: number) {
  return {
    title: 'Delete this poll?',
    body: `"${question}" and its ${voteCount} ${
      voteCount === 1 ? 'vote' : 'votes'
    } will be gone for everyone. This can't be undone.`,
  };
}


export function pollErrorMessage(error: Error): string {
  if (error instanceof ApiError) {
    switch (error.code) {
      case 'POLL_CLOSED':
        return 'This poll has closed. Votes can no longer be changed.';
      case 'POLL_NOT_FOUND':
        return 'That poll is no longer on this board.';
      case 'POLL_OPTION_NOT_FOUND':
        return 'That option is no longer on this poll.';
      case 'NOT_PERMITTED':
        return 'Only the traveler who started this poll, or the trip owner, can do that.';
      case 'TOO_MANY_OPEN_POLLS':
        return 'This trip already has 25 open polls. Close one before starting another.';
      case 'POLL_QUESTION_TOO_LONG':
        return 'A poll question is at most 120 characters.';
      case 'POLL_OPTION_TOO_LONG':
        return 'A poll option is at most 80 characters.';
      case 'POLL_OPTION_COUNT':
        return 'A poll needs between 2 and 10 options.';
      case 'POLL_QUESTION_MISSING':
        return 'A poll needs a question.';
      case 'POLL_DEADLINE_NOT_FUTURE':
        return 'A poll has to close at some point in the future.';
      case 'TRIP_ARCHIVED':
        return 'This trip is archived, so its polls are read-only.';
      case 'ITINERARY_NOT_FOUND':
        return 'This trip is no longer available to you.';
      default:
        return error.message;
    }
  }
  return 'Could not complete that. Try again.';
}
