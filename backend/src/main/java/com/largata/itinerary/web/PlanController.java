package com.largata.itinerary.web;

import com.largata.common.authz.AuthorizationGuard;
import com.largata.common.authz.Membership;
import com.largata.identity.Traveler;
import com.largata.identity.web.CurrentTraveler;
import com.largata.itinerary.ItineraryService;
import com.largata.itinerary.PlanSaveService;
import com.largata.itinerary.api.ItineraryResponse;
import com.largata.itinerary.api.SavePlanRequest;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;


@RestController
@RequestMapping("/v1/itineraries/{itineraryId}/plan")
class PlanController {

    private final PlanSaveService plans;
    private final ItineraryService itineraries;
    private final AuthorizationGuard guard;

    PlanController(PlanSaveService plans, ItineraryService itineraries, AuthorizationGuard guard) {
        this.plans = plans;
        this.itineraries = itineraries;
        this.guard = guard;
    }

    @PutMapping
    ItineraryResponse save(
            @CurrentTraveler Traveler traveler,
            @PathVariable UUID itineraryId,
            @Valid @RequestBody SavePlanRequest request) {
        Membership member = guard.requireMember(traveler.id(), itineraryId);
        plans.save(member, request);
        return ItineraryResponse.of(itineraries.viewPlan(member));
    }
}
