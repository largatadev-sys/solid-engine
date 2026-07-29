package com.largata.common.security;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;


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
