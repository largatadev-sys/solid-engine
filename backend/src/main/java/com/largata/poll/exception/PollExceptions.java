package com.largata.poll.exception;

import com.largata.common.error.ConflictException;
import com.largata.common.error.ForbiddenException;
import com.largata.common.error.NotFoundException;
import com.largata.common.error.ValidationException;


public final class PollExceptions {

    private PollExceptions() {}


    public static final class PollNotFoundException extends NotFoundException {
        public PollNotFoundException() {
            super("POLL_NOT_FOUND", "That poll could not be found.");
        }
    }


    public static final class PollOptionNotFoundException extends NotFoundException {
        public PollOptionNotFoundException() {
            super("POLL_OPTION_NOT_FOUND", "That option is not on this poll.");
        }
    }


    public static final class PollClosedException extends ConflictException {
        public PollClosedException() {
            super("POLL_CLOSED", "This poll has closed. Votes can no longer be changed.");
        }
    }


    public static final class NotThePollsAuthorException extends ForbiddenException {
        public NotThePollsAuthorException() {
            super("NOT_PERMITTED", "Only the traveler who started this poll, or the trip owner, can do that.");
        }
    }


    public static final class QuestionMissingException extends ValidationException {
        public QuestionMissingException() {
            super("POLL_QUESTION_MISSING", "A poll needs a question.");
        }
    }


    public static final class QuestionTooLongException extends ValidationException {
        public QuestionTooLongException(int limit) {
            super("POLL_QUESTION_TOO_LONG", "A poll question is at most " + limit + " characters.");
        }
    }


    public static final class OptionTooLongException extends ValidationException {
        public OptionTooLongException(int limit) {
            super("POLL_OPTION_TOO_LONG", "A poll option is at most " + limit + " characters.");
        }
    }


    public static final class OptionCountOutOfRangeException extends ValidationException {
        public OptionCountOutOfRangeException(int min, int max) {
            super("POLL_OPTION_COUNT", "A poll needs between " + min + " and " + max + " options.");
        }
    }


    public static final class DeadlineNotInFutureException extends ValidationException {
        public DeadlineNotInFutureException() {
            super("POLL_DEADLINE_NOT_FUTURE", "A poll has to close at some point in the future.");
        }
    }


    public static final class TooManyOpenPollsException extends ValidationException {
        public TooManyOpenPollsException(int limit) {
            super(
                    "TOO_MANY_OPEN_POLLS",
                    "This trip already has " + limit + " open polls. Close one before starting another.");
        }
    }
}
