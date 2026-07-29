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


    private static Jwt verifiedToken() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof Jwt jwt)) {
            throw new IllegalStateException(
                    "No verified token on a @CurrentTraveler handler — the endpoint is not authenticated()");
        }
        return jwt;
    }
}
