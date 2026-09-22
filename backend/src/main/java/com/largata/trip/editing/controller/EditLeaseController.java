package com.largata.trip.editing.controller;

import static com.largata.trip.room.Door.Rule.EDITABLE;
import static com.largata.trip.room.Door.Rule.OPEN;

import com.largata.trip.room.CurrentMember;
import com.largata.trip.room.Door;
import com.largata.trip.room.Membership;
import com.largata.trip.room.ReachesClosedRoom;
import com.largata.trip.editing.dto.EditLeaseResponse;
import com.largata.trip.editing.dto.LeaseSubjectRequest;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
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

    EditLeaseController(EditLeaseService leases) {
        this.leases = leases;
    }


    @PostMapping
    @Door(EDITABLE)
    EditLeaseResponse acquire(
            @CurrentMember Membership member, @RequestBody(required = false) LeaseSubjectRequest request) {
        return EditLeaseResponse.of(
                leases.acquire(member, LeaseSubjectRequest.resolve(request, member.itineraryId())));
    }


    @PostMapping("/renew")
    @Door(EDITABLE)
    EditLeaseResponse renew(
            @CurrentMember Membership member, @RequestBody(required = false) LeaseSubjectRequest request) {
        return EditLeaseResponse.of(
                leases.renew(member, LeaseSubjectRequest.resolve(request, member.itineraryId())));
    }


    @DeleteMapping
    @Door(OPEN)
    @ReachesClosedRoom
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void release(@CurrentMember Membership member, @RequestBody(required = false) LeaseSubjectRequest request) {
        leases.release(member, LeaseSubjectRequest.resolve(request, member.itineraryId()));
    }
}
