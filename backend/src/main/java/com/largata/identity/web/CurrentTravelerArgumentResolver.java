package com.largata.identity.web;

import com.largata.identity.Traveler;
import com.largata.identity.TravelerClaims;
import com.largata.identity.TravelerService;
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
 * Turns the verified token into the domain {@link Traveler}, provisioning on first contact.
 *
 * <p>This is the single translation point between the auth boundary and the domain (spec, decision
 * 6a): above it, a caller is a Firebase UID; below it, a Traveler. Controllers never see the former.
 *
 * <p>Because provisioning hangs off principal <em>resolution</em> rather than off one endpoint,
 * every authenticated handler — {@code /v1/me} today, S0.3's itinerary endpoints tomorrow — gets a
 * Traveler on first contact without asking. There is no bootstrap call for a client to skip.
 */
@Component
public class CurrentTravelerArgumentResolver implements HandlerMethodArgumentResolver {

    private final TravelerService travelers;

    CurrentTravelerArgumentResolver(TravelerService travelers) {
        this.travelers = travelers;
    }

    @Override
    public boolean supportsParameter(MethodParameter parameter) {
        return parameter.hasParameterAnnotation(CurrentTraveler.class)
                && Traveler.class.isAssignableFrom(parameter.getParameterType());
    }

    @Override
    public Object resolveArgument(
            MethodParameter parameter,
            ModelAndViewContainer mavContainer,
            NativeWebRequest webRequest,
            WebDataBinderFactory binderFactory) {
        Jwt jwt = verifiedToken();
        return travelers.getOrProvision(
                TravelerClaims.of(jwt.getSubject(), jwt.getClaimAsString("email"), jwt.getClaimAsString("name")));
    }

    /**
     * The token Spring Security has already validated — signature, expiry, issuer. Reading claims
     * off the raw Authorization header instead would be trusting whatever the caller typed.
     *
     * <p>The security chain makes the absent case unreachable: this resolver only ever runs for a
     * handler behind {@code authenticated()}. The throw is there so that if that ever stops being
     * true, it fails loudly here rather than provisioning a Traveler for nobody.
     */
    private static Jwt verifiedToken() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof Jwt jwt)) {
            throw new IllegalStateException(
                    "No verified token on a @CurrentTraveler handler — the endpoint is not authenticated()");
        }
        return jwt;
    }
}
