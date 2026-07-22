package com.largata.identity.web;

import org.springframework.core.MethodParameter;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;
import org.springframework.web.bind.support.WebDataBinderFactory;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.method.support.ModelAndViewContainer;

/**
 * Resolves {@link AuthEmail} to the verified token's email claims (S1.2).
 *
 * <p>Reads {@code email} and {@code email_verified} off the JWT Spring Security has already validated
 * — never off the raw header, which would be trusting whatever the caller typed. The same guarantee
 * as {@link CurrentTravelerArgumentResolver}: this only runs for a handler behind {@code
 * authenticated()}, so an absent token is unreachable and the throw is a loud tripwire rather than a
 * silent null.
 *
 * <p>{@code email_verified} is treated as false unless explicitly {@code true}: a token that omits the
 * claim, or carries it as anything but boolean true, is not a verification we act on.
 */
@Component
public class AuthEmailArgumentResolver implements HandlerMethodArgumentResolver {

    @Override
    public boolean supportsParameter(MethodParameter parameter) {
        return parameter.hasParameterAnnotation(AuthEmail.class)
                && VerifiedContact.class.isAssignableFrom(parameter.getParameterType());
    }

    @Override
    public Object resolveArgument(
            MethodParameter parameter,
            ModelAndViewContainer mavContainer,
            NativeWebRequest webRequest,
            WebDataBinderFactory binderFactory) {
        Jwt jwt = verifiedToken();
        Boolean verified = jwt.getClaimAsBoolean("email_verified");
        return new VerifiedContact(jwt.getClaimAsString("email"), Boolean.TRUE.equals(verified));
    }

    private static Jwt verifiedToken() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof Jwt jwt)) {
            throw new IllegalStateException(
                    "No verified token on an @AuthEmail handler — the endpoint is not authenticated()");
        }
        return jwt;
    }
}
