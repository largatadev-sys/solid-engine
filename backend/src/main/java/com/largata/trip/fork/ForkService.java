package com.largata.trip.fork;

import com.largata.trip.api.ForkApi;
import com.largata.trip.api.ForkApi.ForkProvenanceView;
import com.largata.identity.TravelerService;
import com.largata.identity.TravelerSummary;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ForkService implements ForkApi {


    private final ForkRelationshipRepository relationships;
    private final ForkApi.SourceVisibility sourceVisibility;
    private final TravelerService travelers;

    ForkService(
            ForkRelationshipRepository relationships,
            ForkApi.SourceVisibility sourceVisibility,
            TravelerService travelers) {
        this.relationships = relationships;
        this.sourceVisibility = sourceVisibility;
        this.travelers = travelers;
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<ForkProvenanceView> provenanceOf(UUID itineraryId, UUID readerId) {
        return relationships
                .findByForkedItineraryId(itineraryId)
                .map(ForkRelationship::sourceItineraryId)
                .map(
                        sourceId -> new ForkProvenanceView(
                                sourceId,
                                handleOfOwnerOf(sourceId),
                                sourceVisibility.stillLive(sourceId)));
    }

    private String handleOfOwnerOf(UUID sourceId) {
        return sourceVisibility
                .ownerOf(sourceId)
                .flatMap(travelers::summaryById)
                .map(TravelerSummary::handle)
                .orElse(null);
    }

    @Override
    @Transactional(readOnly = true)
    public long forkCountOf(UUID sourceItineraryId) {
        return relationships.countBySourceItineraryId(sourceItineraryId);
    }

    @Override
    @Transactional
    public void recordFork(UUID sourceId, UUID forkedTripId) {
        relationships.save(ForkRelationship.recording(sourceId, forkedTripId, Instant.now()));
    }

}
