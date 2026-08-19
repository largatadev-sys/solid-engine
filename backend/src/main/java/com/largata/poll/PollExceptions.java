package com.largata.poll;

import com.largata.common.error.ConflictException;
import com.largata.common.error.ForbiddenException;
import com.largata.common.error.NotFoundException;
import com.largata.common.error.ValidationException;


final class PollExceptions {

    private PollExceptions() {}


    static final class PollNotFoundException extends NotFoundException {
        PollNotFoundException() {
            super("POLL_NOT_FOUND", "That poll could not be found.");
        }
    }


    static final class PollOptionNotFoundException extends NotFoundException {
        PollOptionNotFoundException() {
            super("POLL_OPTION_NOT_FOUND", "That option is not on this poll.");
        }
    }


    static final class PollClosedException extends ConflictException {
        PollClosedException() {
            super("POLL_CLOSED", "This poll has closed. Votes can no longer be changed.");
        }
    }


    static final class NotThePollsAuthorException extends ForbiddenException {
        NotThePollsAuthorException() {
            super("NOT_PERMITTED", "Only the traveler who started this poll, or the trip owner, can do that.");
        }
    }


    static final class QuestionMissingException extends ValidationException {
        QuestionMissingException() {
            super("POLL_QUESTION_MISSING", "A poll needs a question.");
        }
    }


    static final class QuestionTooLongException extends ValidationException {
        QuestionTooLongException(int limit) {
            super("POLL_QUESTION_TOO_LONG", "A poll question is at most " + limit + " characters.");
        }
    }


    static final class OptionTooLongException extends ValidationException {
        OptionTooLongException(int limit) {
            super("POLL_OPTION_TOO_LONG", "A poll option is at most " + limit + " characters.");
        }
    }


    static final class OptionCountOutOfRangeException extends ValidationException {
        OptionCountOutOfRangeException(int min, int max) {
            super("POLL_OPTION_COUNT", "A poll needs between " + min + " and " + max + " options.");
        }
    }


    static final class DeadlineNotInFutureException extends ValidationException {
        DeadlineNotInFutureException() {
            super("POLL_DEADLINE_NOT_FUTURE", "A poll has to close at some point in the future.");
        }
    }


    static final class TooManyOpenPollsException extends ValidationException {
        TooManyOpenPollsException(int limit) {
            super(
                    "TOO_MANY_OPEN_POLLS",
                    "This trip already has " + limit + " open polls. Close one before starting another.");
        }
    }
}
