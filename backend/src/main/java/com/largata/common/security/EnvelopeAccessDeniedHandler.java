package com.largata.common.security;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.stereotype.Component;

/**
 * Answers "you are known, but you may not do this" with 403 in the Artifact 05 envelope.
 *
 * <p>The distinction from 401 is the contract, not pedantry: Artifact 05 defines 401 as
 * <em>missing/invalid credentials</em> and 403 as <em>authenticated but not permitted</em>, and the
 * client branches on the code. A traveler told {@code UNAUTHENTICATED} is sent to sign in again —
 * which fixes nothing when the real answer is "your account cannot do that", and loses them their
 * session for no reason.
 *
 * <p><strong>Why this class exists as its own file.</strong> The first cut of this code wired the
 * deny handler to {@link EnvelopeAuthenticationEntryPoint}, which hardcodes 401 — so every future
 * 403 would have rendered as {@code 401 UNAUTHENTICATED}, while a comment above it claimed the two
 * hooks answered different statuses. Nothing would have caught it: no rule grants authorities yet,
 * so nothing can produce a 403 today. The first 403 rule (Artifact 03's guard, S0.3) would have
 * inherited the wrong status, and ADR-008 freezes shipped semantics — the bug would have been
 * permanent before it was ever reachable. Caught in review; the fix is that "401" and "403" are now
 * two classes that cannot be confused for each other.
 *
 * <p>Nothing routes here yet, by design. It is wired so that when the guard lands, the correct
 * status is what it inherits.
 */
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
