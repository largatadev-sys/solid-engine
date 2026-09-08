package com.largata.itinerary;

import com.largata.common.api.InstantCursor;
import com.largata.common.api.Page;
import com.largata.identity.TravelerService;
import com.largata.identity.TravelerSummary;
import com.largata.identity.api.TravelerCardResponse;
import com.largata.itinerary.api.DiaryPhotoResponse;
import com.largata.itinerary.api.FeedPostcardResponse;
import com.largata.itinerary.api.PublicTripDiaryResponse;
import com.largata.media.Photo;
import com.largata.media.PhotoService;
import com.largata.media.PhotoSubject;
import com.largata.postcard.api.LegacyEntries;
import com.largata.trip.workspace.WorkspaceService;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.largata.trip.trip.TripRepository;
import com.largata.trip.trip.Trip;


@Service
public class PostcardFeedService {

    private static final int DEFAULT_PAGE_SIZE = 10;
    private static final int MAX_PAGE_SIZE = 50;

    private static final Logger log = LoggerFactory.getLogger(PostcardFeedService.class);

    private final LegacyEntries entries;
    private final TripRepository itineraries;
    private final WorkspaceService workspaces;
    private final TravelerService travelers;
    private final PhotoService photos;

    PostcardFeedService(
            LegacyEntries entries,
            TripRepository itineraries,
            WorkspaceService workspaces,
            TravelerService travelers,
            PhotoService photos) {
        this.entries = entries;
        this.itineraries = itineraries;
        this.workspaces = workspaces;
        this.travelers = travelers;
        this.photos = photos;
    }


    @Transactional(readOnly = true)
    public Page<FeedPostcardResponse> page(
            String cursor, Integer requestedLimit, List<UUID> hiddenAuthors) {
        int limit = clamp(requestedLimit);
        InstantCursor from = cursor == null ? null : InstantCursor.decode(cursor);
        List<LegacyEntries.Entry> found =
                entries.feedPage(
                        hiddenAuthors,
                        from == null ? null : from.at(),
                        from == null ? null : from.id(),
                        limit + 1);

        return pageOf(found, limit);
    }


    @Transactional(readOnly = true)
    public Page<FeedPostcardResponse> pageOfAuthors(
            String cursor, Integer requestedLimit, List<UUID> onlyAuthors) {
        int limit = clamp(requestedLimit);

        if (onlyAuthors.isEmpty()) {
            return Page.exhausted(List.of());
        }

        InstantCursor from = cursor == null ? null : InstantCursor.decode(cursor);
        List<LegacyEntries.Entry> found =
                entries.feedPageOf(
                        onlyAuthors,
                        from == null ? null : from.at(),
                        from == null ? null : from.id(),
                        limit + 1);

        return pageOf(found, limit);
    }


    private Page<FeedPostcardResponse> pageOf(List<LegacyEntries.Entry> found, int limit) {
        boolean more = found.size() > limit;
        List<LegacyEntries.Entry> rows = more ? found.subList(0, limit) : found;
        List<FeedPostcardResponse> cards = project(rows);

        if (!more) {
            return Page.exhausted(cards);
        }
        LegacyEntries.Entry last = rows.getLast();
        return Page.of(cards, InstantCursor.encode(last.sharedAt(), last.id()));
    }


    @Transactional(readOnly = true)
    public PublicTripDiaryResponse tripDiary(UUID itineraryId, UUID authorId) {
        List<LegacyEntries.Entry> shared = entries.ofTrip(itineraryId, authorId);
        if (shared.isEmpty()) {
            throw new DiaryExceptions.DiaryEntryNotFoundException();
        }

        List<FeedPostcardResponse> postcards = project(shared);
        if (postcards.isEmpty()) {
            throw new DiaryExceptions.DiaryEntryNotFoundException();
        }

        FeedPostcardResponse first = postcards.getFirst();
        return new PublicTripDiaryResponse(
                itineraryId,
                first.author(),
                first.tripTitle(),
                first.publishedItineraryId(),
                postcards);
    }


    private List<FeedPostcardResponse> project(List<LegacyEntries.Entry> rows) {
        if (rows.isEmpty()) {
            return List.of();
        }
        Map<UUID, List<Photo>> photosByEntry =
                photos.allOfEach(
                        PhotoSubject.POSTCARD, rows.stream().map(LegacyEntries.Entry::id).toList());
        Map<UUID, TravelerCardResponse> authors = authorsOf(rows);
        Map<UUID, Trip> trips = tripsOf(rows);

        Set<UUID> archived = workspaces.archivedAmong(trips.keySet());

        return rows.stream()
                .filter(entry -> entry.tripId() == null || !archived.contains(entry.tripId()))
                .map(entry -> cardOf(entry, authors, trips, photosByEntry))
                .filter(card -> card != null)
                .toList();
    }


    private FeedPostcardResponse cardOf(
            LegacyEntries.Entry entry,
            Map<UUID, TravelerCardResponse> authors,
            Map<UUID, Trip> trips,
            Map<UUID, List<Photo>> photosByEntry) {
        TravelerCardResponse author = authors.get(entry.authorId());
        Trip trip = entry.tripId() == null ? null : trips.get(entry.tripId());
        if (author == null || (entry.tripId() != null && trip == null)) {
            log.warn(
                    "Shared postcard withheld from the feed: entryId={} authorFound={} tripFound={}",
                    entry.id(),
                    author != null,
                    trip != null);
            return null;
        }
        return new FeedPostcardResponse(
                entry.id(),
                author,
                entry.tripId(),
                trip == null ? null : trip.title(),
                trip == null ? null : trip.destination(),
                trip == null ? null : navigableTripOf(trip),
                entry.dayLabel(),
                entry.activityTitle(),
                entry.place(),
                entry.caption(),
                entry.sharedAt(),
                photosByEntry.getOrDefault(entry.id(), List.of()).stream()
                        .map(DiaryPhotoResponse::of)
                        .toList());
    }


    private UUID navigableTripOf(Trip trip) {
        return trip.isPublished() ? trip.id() : null;
    }


    private Map<UUID, TravelerCardResponse> authorsOf(List<LegacyEntries.Entry> rows) {
        List<UUID> ids = rows.stream().map(LegacyEntries.Entry::authorId).distinct().toList();
        return travelers.summariesByIds(ids).stream()
                .collect(Collectors.toMap(TravelerSummary::id, TravelerCardResponse::of));
    }


    private Map<UUID, Trip> tripsOf(List<LegacyEntries.Entry> rows) {
        List<UUID> ids =
                rows.stream()
                        .map(LegacyEntries.Entry::tripId)
                        .filter(id -> id != null)
                        .distinct()
                        .toList();
        return itineraries.findAllById(ids).stream()
                .collect(Collectors.toMap(Trip::id, Function.identity()));
    }


    private static int clamp(Integer requestedLimit) {
        if (requestedLimit == null || requestedLimit < 1) {
            return DEFAULT_PAGE_SIZE;
        }
        return Math.min(requestedLimit, MAX_PAGE_SIZE);
    }
}
