package com.largata.join.web;

import com.largata.identity.Traveler;
import com.largata.identity.TravelerClaims;
import com.largata.identity.TravelerService;
import com.largata.identity.web.VerifiedContact;
import java.util.Optional;
import java.util.UUID;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;


@Component
class OptionalViewer {

    private final TravelerService travelers;

    OptionalViewer(TravelerService travelers) {
        this.travelers = travelers;
    }


    Optional<UUID> id() {
        return token().map(this::travelerOf).map(Traveler::id);
    }


    Traveler travelerOf(Jwt jwt) {
        return travelers.getOrProvision(
                TravelerClaims.of(
                        jwt.getSubject(),
                        jwt.getClaimAsString("email"),
                        jwt.getClaimAsString("name"),
                        jwt.getClaimAsString("picture")));
    }


    VerifiedContact contactOf(Jwt jwt) {
        return new VerifiedContact(
                jwt.getClaimAsString("email"), Boolean.TRUE.equals(jwt.getClaimAsBoolean("email_verified")));
    }


    Optional<Jwt> token() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof Jwt jwt)) {
            return Optional.empty();
        }
        return Optional.of(jwt);
    }
}
