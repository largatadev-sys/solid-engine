package com.largata.join.join.controller;

import com.largata.common.api.Page;
import com.largata.common.security.CurrentTraveler;
import com.largata.identity.Traveler;
import com.largata.join.join.dto.MyJoinRequestResponse;
import com.largata.join.join.service.JoinService;
import com.largata.media.web.PhotoBytes;
import java.util.UUID;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1/join-requests")
class MyJoinRequestController {

    private final JoinService join;
    private final PhotoBytes covers;

    MyJoinRequestController(JoinService join, PhotoBytes covers) {
        this.join = join;
        this.covers = covers;
    }


    @GetMapping
    Page<MyJoinRequestResponse> mine(@CurrentTraveler Traveler traveler) {
        return Page.exhausted(
                join.askedByMe(traveler.id()).stream().map(MyJoinRequestResponse::of).toList());
    }


    @GetMapping("/{requestId}/cover")
    ResponseEntity<InputStreamResource> cover(
            @CurrentTraveler Traveler traveler, @PathVariable UUID requestId) {
        return covers.thumbnailOfItinerary(join.itineraryOfMyRequest(traveler.id(), requestId));
    }


    @DeleteMapping("/{requestId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void withdraw(@CurrentTraveler Traveler traveler, @PathVariable UUID requestId) {
        join.withdraw(traveler.id(), requestId);
    }
}
