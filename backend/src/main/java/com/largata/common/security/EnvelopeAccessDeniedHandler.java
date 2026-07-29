package com.largata.common.security;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.stereotype.Component;


@Component
class EnvelopeAccessDeniedHandler implements AccessDeniedHandler {

    static final String CODE = "FORBIDDEN";
    private static final String MESSAGE = "You may not do that.";

    private final SecurityErrorResponder responder;

    EnvelopeAccessDeniedHandler(SecurityErrorResponder responder) {
        this.responder = responder;
    }

    @Override
    public void handle(
            HttpServletRequest request, HttpServletResponse response, AccessDeniedException deniedException)
            throws IOException {
        responder.respond(response, HttpStatus.FORBIDDEN, CODE, MESSAGE);
    }
}
