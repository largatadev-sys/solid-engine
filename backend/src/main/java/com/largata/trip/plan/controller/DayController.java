package com.largata.trip.plan.controller;

import com.largata.trip.api.AuthorizationGuard;
import com.largata.trip.api.Membership;
import com.largata.trip.api.Owner;
import com.largata.trip.api.TripFence;
import com.largata.trip.exception.NotTheTripOwnerException;
import com.largata.identity.Traveler;
import com.largata.common.security.CurrentTraveler;
import com.largata.trip.plan.dto.DayRequest;
import com.largata.trip.plan.dto.DayResponse;
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
import com.largata.trip.plan.service.DayService;


@RestController
@RequestMapping("/v1/trips/{itineraryId}/days")
class DayController {

    private final DayService days;
    private final AuthorizationGuard guard;
    private final TripFence fence;

    DayController(DayService days, AuthorizationGuard guard, TripFence fence) {
        this.days = days;
        this.guard = guard;
        this.fence = fence;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    DayResponse append(
            @CurrentTraveler Traveler traveler,
            @PathVariable UUID itineraryId,
            @Valid @RequestBody DayRequest request) {
        return DayResponse.of(days.appendDay(theOwnerEditing(traveler, itineraryId), request.title()));
    }

    @PatchMapping("/{dayId}")
    DayResponse rename(
            @CurrentTraveler Traveler traveler,
            @PathVariable UUID itineraryId,
            @PathVariable UUID dayId,
            @Valid @RequestBody DayRequest request) {
        Membership member = guard.requireMember(traveler.id(), itineraryId);
        return DayResponse.of(days.renameDay(fence.editable(member), dayId, request.title()));
    }

    @DeleteMapping("/{dayId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void delete(
            @CurrentTraveler Traveler traveler, @PathVariable UUID itineraryId, @PathVariable UUID dayId) {
        days.deleteDay(theOwnerEditing(traveler, itineraryId), dayId);
    }


    private TripFence.Editable<Owner> theOwnerEditing(Traveler traveler, UUID itineraryId) {
        Membership member = guard.requireMember(traveler.id(), itineraryId);
        return fence.editable(fence.owner(member, NotTheTripOwnerException::toAddOrRemoveDays));
    }
}
