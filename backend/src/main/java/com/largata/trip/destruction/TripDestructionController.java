package com.largata.trip.destruction;

import com.largata.common.authz.AuthorizationGuard;
import com.largata.common.authz.Membership;
import com.largata.identity.Traveler;
import com.largata.identity.web.CurrentTraveler;
import com.largata.trip.exception.TripNotFoundException;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1/trips")
class TripDestructionController {

    private final TripDestructionService trips;
    private final AuthorizationGuard guard;

    TripDestructionController(TripDestructionService trips, AuthorizationGuard guard) {
        this.trips = trips;
        this.guard = guard;
    }


    @DeleteMapping("/{tripId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void destroy(@CurrentTraveler Traveler traveler, @PathVariable UUID tripId) {
        trips.destroy(requireMember(traveler, tripId));
    }


    private Membership requireMember(Traveler traveler, UUID tripId) {
        return guard.membershipOf(traveler.id(), tripId).orElseThrow(TripNotFoundException::new);
    }
}
