package com.largata.trip.plan;

import com.largata.common.authz.AuthorizationGuard;
import com.largata.common.authz.Membership;
import com.largata.identity.Traveler;
import com.largata.identity.web.CurrentTraveler;
import com.largata.trip.trip.TripService;
import com.largata.trip.plan.PlanSaveService;
import com.largata.trip.trip.TripResponse;
import com.largata.trip.plan.SavePlanRequest;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;


@RestController
@RequestMapping({"/v1/itineraries/{itineraryId}/plan", "/v1/trips/{itineraryId}/plan"})
class PlanController {

    private final PlanSaveService plans;
    private final TripService itineraries;
    private final AuthorizationGuard guard;

    PlanController(PlanSaveService plans, TripService itineraries, AuthorizationGuard guard) {
        this.plans = plans;
        this.itineraries = itineraries;
        this.guard = guard;
    }

    @PutMapping
    TripResponse save(
            @CurrentTraveler Traveler traveler,
            @PathVariable UUID itineraryId,
            @Valid @RequestBody SavePlanRequest request) {
        Membership member = guard.requireMember(traveler.id(), itineraryId);
        plans.save(member, request);
        return TripResponse.of(itineraries.viewPlan(member));
    }
}
