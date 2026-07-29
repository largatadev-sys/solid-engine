package com.largata.itinerary.web;

import com.largata.common.authz.AuthorizationGuard;
import com.largata.common.authz.Membership;
import com.largata.identity.Traveler;
import com.largata.identity.web.CurrentTraveler;
import com.largata.itinerary.DayService;
import com.largata.itinerary.api.DayRequest;
import com.largata.itinerary.api.DayResponse;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;


@RestController
@RequestMapping("/v1/itineraries/{itineraryId}/days")
class DayController {

    private final DayService days;
    private final AuthorizationGuard guard;

    DayController(DayService days, AuthorizationGuard guard) {
        this.days = days;
        this.guard = guard;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    DayResponse append(
            @CurrentTraveler Traveler traveler,
            @PathVariable UUID itineraryId,
            @Valid @RequestBody DayRequest request) {
        Membership member = guard.requireMember(traveler.id(), itineraryId);
        return DayResponse.of(days.appendDay(member, request.title()));
    }

    @PatchMapping("/{dayId}")
    DayResponse rename(
            @CurrentTraveler Traveler traveler,
            @PathVariable UUID itineraryId,
            @PathVariable UUID dayId,
            @Valid @RequestBody DayRequest request) {
        Membership member = guard.requireMember(traveler.id(), itineraryId);
        return DayResponse.of(days.renameDay(member, dayId, request.title()));
    }

    @DeleteMapping("/{dayId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void delete(
            @CurrentTraveler Traveler traveler, @PathVariable UUID itineraryId, @PathVariable UUID dayId) {
        Membership member = guard.requireMember(traveler.id(), itineraryId);
        days.deleteDay(member, dayId);
    }
}
