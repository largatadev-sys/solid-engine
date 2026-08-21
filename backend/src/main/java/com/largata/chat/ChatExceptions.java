package com.largata.chat;

import com.largata.common.error.ConflictException;
import com.largata.common.error.ValidationException;


final class ChatExceptions {

    private ChatExceptions() {}


    static final class ChatClosedException extends ConflictException {
        ChatClosedException() {
            super(
                    "CHAT_CLOSED",
                    "This trip is published, so its chat is closed. Unpublish the trip to talk here again.");
        }
    }


    static final class MessageBodyMissingException extends ValidationException {
        MessageBodyMissingException() {
            super("CHAT_MESSAGE_BODY_MISSING", "A message needs something in it.");
        }
    }


    static final class MessageBodyTooLongException extends ValidationException {
        MessageBodyTooLongException(int limit) {
            super(
                    "CHAT_MESSAGE_BODY_TOO_LONG",
                    "A message can be at most " + limit + " characters.");
        }
    }
}
