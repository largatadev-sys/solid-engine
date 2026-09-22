package com.largata.identity.web;

import com.largata.identity.Traveler;
import com.largata.identity.TravelerClaims;
import com.largata.identity.TravelerService;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;


@Component
class JwtCurrentTravelers implements CurrentTravelers {

    private final TravelerService travelers;

    JwtCurrentTravelers(TravelerService travelers) {
        this.travelers = travelers;
    }

    @Override
    public Traveler current() {
        Jwt jwt = verifiedToken();
        return travelers.getOrProvision(
                TravelerClaims.of(
                        jwt.getSubject(),
                        jwt.getClaimAsString("email"),
                        jwt.getClaimAsString("name"),
                        jwt.getClaimAsString("picture")));
    }


    private static Jwt verifiedToken() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof Jwt jwt)) {
            throw new IllegalStateException(
                    "No verified token on an authenticated route — the endpoint is not authenticated()");
        }
        return jwt;
    }
}
