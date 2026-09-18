package com.largata.trip.editing.controller;

import com.largata.trip.api.AuthorizationGuard;
import com.largata.trip.api.Membership;
import com.largata.trip.api.TripFence;
import com.largata.identity.Traveler;
import com.largata.common.security.CurrentTraveler;
import com.largata.trip.editing.dto.EditLeaseResponse;
import com.largata.trip.editing.dto.LeaseSubjectRequest;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import com.largata.trip.editing.service.EditLeaseService;


@RestController
@RequestMapping("/v1/trips/{itineraryId}/edit-lock")
class EditLeaseController {

    private final EditLeaseService leases;
    private final AuthorizationGuard guard;
    private final TripFence fence;

    EditLeaseController(EditLeaseService leases, AuthorizationGuard guard, TripFence fence) {
        this.leases = leases;
        this.guard = guard;
        this.fence = fence;
    }


    @PostMapping
    EditLeaseResponse acquire(
            @CurrentTraveler Traveler traveler,
            @PathVariable UUID itineraryId,
            @RequestBody(required = false) LeaseSubjectRequest request) {
        Membership member = guard.requireMember(traveler.id(), itineraryId);
        return EditLeaseResponse.of(leases.acquire(fence.editable(member), LeaseSubjectRequest.resolve(request, itineraryId)));
    }


    @PostMapping("/renew")
    EditLeaseResponse renew(
            @CurrentTraveler Traveler traveler,
            @PathVariable UUID itineraryId,
            @RequestBody(required = false) LeaseSubjectRequest request) {
        Membership member = guard.requireMember(traveler.id(), itineraryId);
        return EditLeaseResponse.of(leases.renew(fence.editable(member), LeaseSubjectRequest.resolve(request, itineraryId)));
    }


    @DeleteMapping
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void release(
            @CurrentTraveler Traveler traveler,
            @PathVariable UUID itineraryId,
            @RequestBody(required = false) LeaseSubjectRequest request) {
        Membership member = guard.requireMember(traveler.id(), itineraryId);
        leases.release(member, LeaseSubjectRequest.resolve(request, itineraryId));
    }
}
