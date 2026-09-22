package com.largata.chat.exception;

import com.largata.common.error.ValidationException;


public final class ChatExceptions {

    private ChatExceptions() {}


    public static final class MessageBodyMissingException extends ValidationException {
        public MessageBodyMissingException() {
            super("CHAT_MESSAGE_BODY_MISSING", "A message needs something in it.");
        }
    }


    public static final class MessageBodyTooLongException extends ValidationException {
        public MessageBodyTooLongException(int limit) {
            super(
                    "CHAT_MESSAGE_BODY_TOO_LONG",
                    "A message can be at most " + limit + " characters.");
        }
    }
}
