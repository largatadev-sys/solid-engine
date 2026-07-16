package com.largata.itinerary.web;

import com.largata.common.api.Page;
import com.largata.common.authz.AuthorizationGuard;
import com.largata.common.authz.Membership;
import com.largata.identity.Traveler;
import com.largata.identity.web.CurrentTraveler;
import com.largata.itinerary.ItineraryService;
import com.largata.itinerary.api.CreateItineraryRequest;
import com.largata.itinerary.api.ItineraryResponse;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * The itinerary endpoints — the first domain surface in the product, and the first behind the
 * authorization guard (Artifact 03).
 *
 * <p><strong>What this class does not contain</strong> is the point of the story: no ownership
 * check, no {@code if (!itinerary.ownerId().equals(traveler.id()))}, no status decision, no error
 * response. Authority is resolved by the guard and carried as a {@link Membership}; failures become
 * envelopes at the one translation boundary. A controller is transport — it maps HTTP to a service
 * call and back (P6).
 */
@RestController
@RequestMapping("/v1/itineraries")
class ItineraryController {

    private final ItineraryService itineraries;
    private final AuthorizationGuard guard;

    ItineraryController(ItineraryService itineraries, AuthorizationGuard guard) {
        this.itineraries = itineraries;
        this.guard = guard;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    ItineraryResponse create(@CurrentTraveler Traveler traveler, @Valid @RequestBody CreateItineraryRequest request) {
        return ItineraryResponse.of(
                itineraries.create(
                        traveler.id(),
                        request.title(),
                        request.destinations(),
                        request.startDate(),
                        request.endDate()));
    }

    /**
     * One itinerary — 404 for both "no such itinerary" and "not yours", indistinguishably (the
     * guard's rejection; Artifact 03's masking rule).
     *
     * <p>The two lines below are the shape every workspace-scoped read copies: guard first, then a
     * service call that cannot happen without what the guard returned.
     */
    @GetMapping("/{id}")
    ItineraryResponse view(@CurrentTraveler Traveler traveler, @PathVariable UUID id) {
        Membership membership = guard.requireMember(traveler.id(), id);
        return ItineraryResponse.of(itineraries.view(membership));
    }

    /**
     * The caller's own itineraries, newest first — Artifact 05's one pagination shape, and the
     * reference implementation every later list follows.
     *
     * <p>No guard call: a list has no single object to authorize, and the owner filter inside the
     * query is the authorization (see {@link ItineraryService#listMine}). Never 404s — an empty list
     * is a result, not an absence.
     */
    @GetMapping
    Page<ItineraryResponse> listMine(
            @CurrentTraveler Traveler traveler,
            @RequestParam(required = false) String cursor,
            @RequestParam(required = false) Integer limit) {
        return itineraries.listMine(traveler.id(), cursor, limit).map(ItineraryResponse::of);
    }
}
