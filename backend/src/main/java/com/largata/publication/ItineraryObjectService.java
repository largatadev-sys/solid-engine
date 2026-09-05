package com.largata.publication;

import com.largata.common.analytics.Analytics;
import com.largata.common.analytics.AnalyticsEvent;
import com.largata.common.authz.Membership;
import com.largata.common.tx.AfterCommit;
import com.largata.publication.PublicationExceptions.PublicationNotFoundException;
import com.largata.publication.PublicationExceptions.TripNotCompleteException;
import com.largata.trip.TripExceptions.NotTheTripOwnerException;
import com.largata.trip.TripExceptions.TripNotFoundException;
import com.largata.trip.TripPlan;
import com.largata.trip.TripService;
import java.time.Clock;
import java.time.Instant;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;


@Service
public class ItineraryObjectService {

    private static final Logger log = LoggerFactory.getLogger(ItineraryObjectService.class);

    private final ItineraryObjectRepository objects;
    private final TripService trips;
    private final ObjectMapper json;
    private final Analytics analytics;
    private final Clock clock;

    ItineraryObjectService(
            ItineraryObjectRepository objects,
            TripService trips,
            ObjectMapper json,
            Analytics analytics,
            Clock clock) {
        this.objects = objects;
        this.trips = trips;
        this.json = json;
        this.analytics = analytics;
        this.clock = clock;
    }


    @Transactional
    public ItineraryObject publish(Membership member) {
        if (!member.isOwner()) {
            throw new NotTheTripOwnerException("Only the trip owner can publish this trip.");
        }
        TripPlan plan = trips.planOf(member.itineraryId()).orElseThrow(TripNotFoundException::new);
        if (!plan.lifecycle().admitsPublishing()) {
            throw new TripNotCompleteException(plan.lifecycle());
        }

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
        trips.markPublished(member.itineraryId(), at);

        log.info("Itinerary object published: id={} tripId={}", saved.id(), saved.tripId());
        emit(saved, "itinerary_object_published");
        return saved;
    }


    @Transactional
    public void unpublish(Membership member) {
        if (!member.isOwner()) {
            throw new NotTheTripOwnerException("Only the trip owner can unpublish this trip.");
        }
        ItineraryObject object =
                objects.findByTripId(member.itineraryId())
                        .filter(candidate -> !candidate.isRetired())
                        .orElseThrow(PublicationNotFoundException::new);

        object.retire(Instant.now(clock));
        objects.saveAndFlush(object);
        trips.markUnpublished(member.itineraryId());

        log.info("Itinerary object retired: id={} tripId={}", object.id(), object.tripId());
        emit(object, "itinerary_object_retired");
    }


    @Transactional(readOnly = true)
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
        trips.markUnpublished(object.tripId());

        log.info("Itinerary object destroyed: id={} tripId={}", objectId, object.tripId());
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
