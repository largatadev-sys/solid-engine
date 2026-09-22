package com.largata.invitation.controller;

import static com.largata.trip.room.Door.Rule.MEMBERSHIP_MUTABLE;

import com.largata.common.api.Page;
import com.largata.trip.room.CurrentMember;
import com.largata.trip.room.Door;
import com.largata.trip.room.Membership;
import com.largata.invitation.dto.CreateInvitationRequest;
import com.largata.invitation.dto.InvitationResponse;
import com.largata.invitation.dto.InviteByHandleRequest;
import com.largata.invitation.service.InvitationService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1/trips/{itineraryId}")
class TripInvitationController {

    private final InvitationService invitations;

    TripInvitationController(InvitationService invitations) {
        this.invitations = invitations;
    }

    @PostMapping("/invitations")
    @Door(MEMBERSHIP_MUTABLE)
    @ResponseStatus(HttpStatus.CREATED)
    InvitationResponse invite(@CurrentMember Membership member, @Valid @RequestBody CreateInvitationRequest request) {
        return InvitationResponse.of(invitations.invite(member, request.email()));
    }

    @PostMapping("/invitations/by-handle")
    @Door(MEMBERSHIP_MUTABLE)
    @ResponseStatus(HttpStatus.CREATED)
    InvitationResponse inviteByHandle(
            @CurrentMember Membership member, @Valid @RequestBody InviteByHandleRequest request) {
        return InvitationResponse.of(invitations.inviteByHandle(member, request.handle()));
    }

    @GetMapping("/invitations")
    Page<InvitationResponse> pendingInvitations(@CurrentMember Membership member) {
        return Page.exhausted(
                invitations.pendingInvitations(member).stream().map(InvitationResponse::of).toList());
    }
}
