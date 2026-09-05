package com.largata.trip.web;

import com.largata.common.authz.AuthorizationGuard;
import com.largata.common.authz.Membership;
import com.largata.identity.Traveler;
import com.largata.identity.web.CurrentTraveler;
import com.largata.trip.TripExceptions.TripNotFoundException;
import com.largata.trip.TripService;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;


@RestController
@RequestMapping("/v1/trips")
class TripController {

    private final TripService trips;
    private final AuthorizationGuard guard;

    TripController(TripService trips, AuthorizationGuard guard) {
        this.trips = trips;
        this.guard = guard;
    }


    @GetMapping("/{tripId}")
    TripResponse read(@CurrentTraveler Traveler traveler, @PathVariable UUID tripId) {
        Membership member = requireMember(traveler, tripId);
        return TripResponse.of(trips.read(member), member.role());
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
