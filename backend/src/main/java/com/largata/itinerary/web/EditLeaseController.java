package com.largata.itinerary.web;

import com.largata.common.authz.AuthorizationGuard;
import com.largata.common.authz.Membership;
import com.largata.identity.Traveler;
import com.largata.identity.web.CurrentTraveler;
import com.largata.itinerary.EditLeaseService;
import com.largata.itinerary.api.EditLeaseResponse;
import com.largata.itinerary.api.LeaseSubjectRequest;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;


@RestController
@RequestMapping("/v1/itineraries/{itineraryId}/edit-lock")
class EditLeaseController {

    private final EditLeaseService leases;
    private final AuthorizationGuard guard;

    EditLeaseController(EditLeaseService leases, AuthorizationGuard guard) {
        this.leases = leases;
        this.guard = guard;
    }


    @PostMapping
    EditLeaseResponse acquire(
            @CurrentTraveler Traveler traveler,
            @PathVariable UUID itineraryId,
            @RequestBody(required = false) LeaseSubjectRequest request) {
        Membership member = guard.requireMember(traveler.id(), itineraryId);
        return EditLeaseResponse.of(leases.acquire(member, LeaseSubjectRequest.resolve(request, itineraryId)));
    }


    @PostMapping("/renew")
    EditLeaseResponse renew(
            @CurrentTraveler Traveler traveler,
            @PathVariable UUID itineraryId,
            @RequestBody(required = false) LeaseSubjectRequest request) {
        Membership member = guard.requireMember(traveler.id(), itineraryId);
        return EditLeaseResponse.of(leases.renew(member, LeaseSubjectRequest.resolve(request, itineraryId)));
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
