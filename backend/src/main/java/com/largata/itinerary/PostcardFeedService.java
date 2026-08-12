package com.largata.itinerary;

import com.largata.common.api.InstantCursor;
import com.largata.common.api.Page;
import com.largata.identity.TravelerService;
import com.largata.identity.TravelerSummary;
import com.largata.identity.api.TravelerCardResponse;
import com.largata.itinerary.api.DiaryPhotoResponse;
import com.largata.itinerary.api.FeedPostcardResponse;
import com.largata.media.Photo;
import com.largata.media.PhotoService;
import com.largata.media.PhotoSubject;
import com.largata.workspace.WorkspaceService;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Limit;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;


@Service
public class PostcardFeedService {

    private static final int DEFAULT_PAGE_SIZE = 10;
    private static final int MAX_PAGE_SIZE = 50;

    private static final Logger log = LoggerFactory.getLogger(PostcardFeedService.class);

    private final DiaryEntryRepository entries;
    private final ItineraryRepository itineraries;
    private final WorkspaceService workspaces;
    private final TravelerService travelers;
    private final PhotoService photos;

    PostcardFeedService(
            DiaryEntryRepository entries,
            ItineraryRepository itineraries,
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
    public Page<FeedPostcardResponse> page(String cursor, Integer requestedLimit) {
        int limit = clamp(requestedLimit);
        Limit probe = Limit.of(limit + 1);

        List<DiaryEntry> found;
        if (cursor == null) {
            found = entries.findFirstFeedPage(probe);
        } else {
            InstantCursor from = InstantCursor.decode(cursor);
            found = entries.findFeedPageAfter(from.at(), from.id(), probe);
        }

        boolean more = found.size() > limit;
        List<DiaryEntry> rows = more ? found.subList(0, limit) : found;
        List<FeedPostcardResponse> cards = project(rows);

        if (!more) {
            return Page.exhausted(cards);
        }
        DiaryEntry last = rows.getLast();
        return Page.of(cards, InstantCursor.encode(last.sharedAt(), last.id()));
    }


    private List<FeedPostcardResponse> project(List<DiaryEntry> rows) {
        if (rows.isEmpty()) {
            return List.of();
        }
        Map<UUID, List<Photo>> photosByEntry =
                photos.allOfEach(PhotoSubject.DIARY_ENTRY, rows.stream().map(DiaryEntry::id).toList());
        Map<UUID, TravelerCardResponse> authors = authorsOf(rows);
        Map<UUID, Itinerary> trips = tripsOf(rows);

        return rows.stream()
                .map(entry -> cardOf(entry, authors, trips, photosByEntry))
                .filter(card -> card != null)
                .toList();
    }


    private FeedPostcardResponse cardOf(
            DiaryEntry entry,
            Map<UUID, TravelerCardResponse> authors,
            Map<UUID, Itinerary> trips,
            Map<UUID, List<Photo>> photosByEntry) {
        TravelerCardResponse author = authors.get(entry.travelerId());
        Itinerary trip = trips.get(entry.itineraryId());
        if (author == null || trip == null) {
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
                trip.title(),
                navigableTripOf(trip),
                entry.dayLabel(),
                entry.activityTitle(),
                entry.place(),
                entry.caption(),
                entry.sharedAt(),
                photosByEntry.getOrDefault(entry.id(), List.of()).stream()
                        .map(DiaryPhotoResponse::of)
                        .toList());
    }


    private UUID navigableTripOf(Itinerary trip) {
        if (!trip.isPublished() || !trip.visibility().isVisibleToEveryone()) {
            return null;
        }
        return workspaces.isArchived(trip.id()) ? null : trip.id();
    }


    private Map<UUID, TravelerCardResponse> authorsOf(List<DiaryEntry> rows) {
        List<UUID> ids = rows.stream().map(DiaryEntry::travelerId).distinct().toList();
        return travelers.summariesByIds(ids).stream()
                .collect(Collectors.toMap(TravelerSummary::id, TravelerCardResponse::of));
    }


    private Map<UUID, Itinerary> tripsOf(List<DiaryEntry> rows) {
        List<UUID> ids = rows.stream().map(DiaryEntry::itineraryId).distinct().toList();
        return itineraries.findAllById(ids).stream()
                .collect(Collectors.toMap(Itinerary::id, Function.identity()));
    }


    private static int clamp(Integer requestedLimit) {
        if (requestedLimit == null || requestedLimit < 1) {
            return DEFAULT_PAGE_SIZE;
        }
        return Math.min(requestedLimit, MAX_PAGE_SIZE);
    }
}
