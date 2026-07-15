package com.largata.common.security;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;

/**
 * Answers "who are you?" — no credentials, or credentials we cannot trust — with 401 in the
 * Artifact 05 envelope.
 *
 * <p><strong>One code for every flavor.</strong> Missing, expired, malformed, and forged tokens all
 * render {@code UNAUTHENTICATED}. The client's reaction is the same in every case (refresh, or go
 * to sign-in), so distinctions it will never branch on would exist only to tell a prober which of
 * their guesses was warmer.
 *
 * <p>Its counterpart is {@link EnvelopeAccessDeniedHandler}, which answers the different question
 * "you are known, but you may not do this" with 403. Two questions, two answers, two classes —
 * an earlier version of this code wired the deny handler to <em>this</em> class and every future
 * 403 would have shipped as a 401 (see that class's note).
 */
@Component
class EnvelopeAuthenticationEntryPoint implements AuthenticationEntryPoint {

    static final String CODE = "UNAUTHENTICATED";
    private static final String MESSAGE = "Authentication required.";

    private final SecurityErrorResponder responder;

    EnvelopeAuthenticationEntryPoint(SecurityErrorResponder responder) {
        this.responder = responder;
    }

    @Override
    public void commence(
            HttpServletRequest request, HttpServletResponse response, AuthenticationException authException)
            throws IOException {
        responder.respond(response, HttpStatus.UNAUTHORIZED, CODE, MESSAGE);
    }
}
