package com.largata.itinerary.service;

import com.largata.common.analytics.Analytics;
import com.largata.common.analytics.AnalyticsEvent;
import com.largata.common.tx.AfterCommit;
import com.largata.itinerary.entity.ItineraryObject;
import com.largata.trip.api.ForkApi;
import com.largata.trip.api.TripCreationApi;
import com.largata.trip.api.TripCreationApi.BlueprintActivity;
import com.largata.trip.api.TripCreationApi.BlueprintDay;
import com.largata.trip.api.TripCreationApi.PlanBlueprint;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;


@Service
public class ItineraryForkService {

    private static final Logger log = LoggerFactory.getLogger(ItineraryForkService.class);

    private final ItineraryObjectService itineraries;
    private final TripCreationApi trips;
    private final ForkApi forks;
    private final ObjectMapper json;
    private final Analytics analytics;

    ItineraryForkService(
            ItineraryObjectService itineraries,
            TripCreationApi trips,
            ForkApi forks,
            ObjectMapper json,
            Analytics analytics) {
        this.itineraries = itineraries;
        this.trips = trips;
        this.forks = forks;
        this.json = json;
        this.analytics = analytics;
    }


    @Transactional
    public UUID fork(UUID objectId, UUID forkerId) {
        ItineraryObject source = itineraries.readFor(forkerId, objectId);
        PlanSnapshot snapshot = json.readValue(source.plan(), PlanSnapshot.class);

        UUID forked = trips.createFrom(blueprintOf(snapshot), forkerId);
        forks.recordFork(source.id(), forked);

        log.info(
                "Itinerary forked: itineraryId={} forkedTripId={} forkerId={}",
                source.id(),
                forked,
                forkerId);
        AfterCommit.run(
                () ->
                        analytics.emit(
                                AnalyticsEvent.named("itinerary_forked")
                                        .with("itineraryId", forked)
                                        .with("sourceItineraryId", source.id())
                                        .with("travelerId", forkerId)
                                        .build()));
        return forked;
    }


    private static PlanBlueprint blueprintOf(PlanSnapshot snapshot) {
        return new PlanBlueprint(
                snapshot.title(),
                snapshot.destination(),
                snapshot.currency(),
                snapshot.description(),
                snapshot.standouts(),
                snapshot.bestTimeOfYear(),
                snapshot.pin(),
                snapshot.days().stream().map(ItineraryForkService::dayOf).toList());
    }


    private static BlueprintDay dayOf(PlanSnapshot.Day day) {
        return new BlueprintDay(
                day.ordinal(),
                day.title(),
                day.activities().stream().map(ItineraryForkService::activityOf).toList());
    }


    private static BlueprintActivity activityOf(PlanSnapshot.Activity activity) {
        return new BlueprintActivity(
                activity.sortOrder(),
                activity.title(),
                activity.timeOfDay(),
                activity.costAmount(),
                activity.costCurrency(),
                activity.place(),
                activity.pin(),
                activity.description(),
                activity.notes(),
                activity.externalUrl(),
                activity.bookingPurpose(),
                activity.bookingProvider(),
                activity.bookingPriceAmount(),
                activity.bookingPriceCurrency());
    }
}
