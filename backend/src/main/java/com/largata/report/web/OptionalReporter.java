package com.largata.report.web;

import com.largata.identity.Traveler;
import com.largata.identity.TravelerClaims;
import com.largata.identity.TravelerService;
import com.largata.report.Reporter;
import java.util.Optional;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;


@Component
class OptionalReporter {

    private final TravelerService travelers;

    OptionalReporter(TravelerService travelers) {
        this.travelers = travelers;
    }


    Reporter fromVerifiedTokenOnly() {
        return token().map(this::reporterOf).orElse(null);
    }


    private Reporter reporterOf(Jwt jwt) {
        Traveler traveler =
                travelers.getOrProvision(
                        TravelerClaims.of(
                                jwt.getSubject(),
                                jwt.getClaimAsString("email"),
                                jwt.getClaimAsString("name"),
                                jwt.getClaimAsString("picture")));
        return Reporter.of(traveler.id(), traveler.displayName());
    }


    private Optional<Jwt> token() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof Jwt jwt)) {
            return Optional.empty();
        }
        return Optional.of(jwt);
    }
}
