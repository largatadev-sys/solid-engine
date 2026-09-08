package com.largata.publication.service;

import com.largata.common.analytics.Analytics;
import com.largata.common.analytics.AnalyticsEvent;
import com.largata.common.authz.Membership;
import com.largata.common.authz.TripEditingSession;
import com.largata.common.tx.AfterCommit;
import com.largata.publication.api.PublicationApi;
import com.largata.publication.entity.ItineraryObject;
import com.largata.publication.exception.PublicationNotFoundException;
import com.largata.publication.exception.TripBeingEditedException;
import com.largata.publication.exception.TripNotCompleteException;
import com.largata.publication.repository.ItineraryObjectRepository;
import com.largata.trip.exception.NotTheTripOwnerException;
import com.largata.trip.exception.TripNotFoundException;
import com.largata.trip.api.TripPlan;
import com.largata.trip.api.PlanApi;
import java.time.Clock;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@Service
public class ItineraryObjectService implements PublicationApi {

    private static final Logger log = LoggerFactory.getLogger(ItineraryObjectService.class);

    private final ItineraryObjectRepository objects;
    private final PlanApi plans;
    private final TripEditingSession editingSession;
    private final ObjectMapper json;
    private final Analytics analytics;
    private final Clock clock;

    ItineraryObjectService(
            ItineraryObjectRepository objects,
            PlanApi plans,
            TripEditingSession editingSession,
            ObjectMapper json,
            Analytics analytics,
            Clock clock) {
        this.objects = objects;
        this.plans = plans;
        this.editingSession = editingSession;
        this.json = json;
        this.analytics = analytics;
        this.clock = clock;
    }


    @Transactional
    public ItineraryObject publish(Membership member) {
        if (!member.isOwner()) {
            throw new NotTheTripOwnerException("Only the trip owner can publish this trip.");
        }
        TripPlan plan = plans.planOf(member.itineraryId()).orElseThrow(TripNotFoundException::new);
        if (!plan.lifecycle().admitsPublishing()) {
            throw new TripNotCompleteException(plan.lifecycle());
        }

        editingSession.heldByAnotherTraveler(member).ifPresent(holder -> {
            throw new TripBeingEditedException(holder);
        });

        Instant at = Instant.now(clock);
        String snapshot = json.writeValueAsString(PlanSnapshot.of(plan));
        ItineraryObject object =
                objects.findByTripId(member.itineraryId())
                        .map(existing -> {
                            existing.refresh(snapshot, at);
                            return existing;
                        })
                        .orElseGet(() ->
                                ItineraryObject.mintedFrom(
                                        member.itineraryId(), plan.ownerId(), snapshot, at));
        ItineraryObject saved = objects.saveAndFlush(object);

        log.info("Trip object published: id={} tripId={}", saved.id(), saved.tripId());
        emit(saved, "itinerary_object_published");
        return saved;
    }


    @Transactional
    public void unpublish(Membership member) {
        if (!member.isOwner()) {
            throw new NotTheTripOwnerException("Only the trip owner can unpublish this trip.");
        }
        Optional<ItineraryObject> live =
                objects.findByTripId(member.itineraryId())
                        .filter(candidate -> !candidate.isRetired());

        live.ifPresent(object -> {
            object.retire(Instant.now(clock));
            objects.saveAndFlush(object);
        });

        live.ifPresentOrElse(
                object -> {
                    log.info("Trip object retired: id={} tripId={}", object.id(), object.tripId());
                    emit(object, "itinerary_object_retired");
                },
                () ->
                        log.info(
                                "Trip unpublished with no itinerary object to retire: tripId={}",
                                member.itineraryId()));
    }


    @Transactional(readOnly = true)
    public Map<UUID, UUID> objectIdsByTrip(List<UUID> tripIds) {
        Map<UUID, UUID> found = new HashMap<>();
        for (UUID tripId : tripIds) {
            objects.findByTripId(tripId).ifPresent(object -> found.put(tripId, object.id()));
        }
        return found;
    }


    public ItineraryObject read(UUID objectId) {
        return objects.findById(objectId)
                .filter(candidate -> !candidate.isRetired())
                .orElseThrow(PublicationNotFoundException::new);
    }


    @Transactional
    public void destroy(UUID travelerId, UUID objectId) {
        ItineraryObject object =
                objects.findById(objectId)
                        .filter(candidate -> candidate.isOwnedBy(travelerId))
                        .orElseThrow(PublicationNotFoundException::new);

        objects.delete(object);
        objects.flush();

        log.info("Trip object destroyed: id={} tripId={}", objectId, object.tripId());
        emit(object, "itinerary_object_destroyed");
    }


    public JsonNode planTreeOf(ItineraryObject object) {
        return json.readTree(object.plan());
    }


    private void emit(ItineraryObject object, String event) {
        AfterCommit.run(
                () ->
                        analytics.emit(
                                AnalyticsEvent.named(event)
                                        .with("itineraryObjectId", object.id())
                                        .with("tripId", object.tripId())
                                        .build()));
    }
}
