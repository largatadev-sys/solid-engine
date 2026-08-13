package com.largata.itinerary;

import com.largata.common.api.InstantCursor;
import com.largata.common.api.Page;
import com.largata.identity.TravelerService;
import com.largata.identity.TravelerSummary;
import com.largata.identity.api.TravelerCardResponse;
import com.largata.itinerary.api.DiscoveryCardResponse;
import com.largata.itinerary.api.DiscoveryCountResponse;
import com.largata.itinerary.api.DiscoverySuggestionsResponse;
import com.largata.itinerary.api.TrendingDestinationResponse;
import com.largata.workspace.WorkspaceService;
import java.time.Duration;
import java.time.Instant;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;


@Service
public class DiscoveryService {

    private static final int DEFAULT_PAGE_SIZE = 20;
    private static final int MAX_PAGE_SIZE = 50;
    private static final int RECOMMENDED_CAP = 8;
    private static final int RECOMMENDED_PROBE = 200;
    private static final int TRENDING_CAP = 12;
    private static final int SUGGESTIONS_PER_GROUP = 3;

    private static final Duration TRENDING_WINDOW = Duration.ofDays(30);

    private static final Logger log = LoggerFactory.getLogger(DiscoveryService.class);

    private final ItineraryRepository itineraries;
    private final DayService days;
    private final WorkspaceService workspaces;
    private final TravelerService travelers;

    DiscoveryService(
            ItineraryRepository itineraries,
            DayService days,
            WorkspaceService workspaces,
            TravelerService travelers) {
        this.itineraries = itineraries;
        this.days = days;
        this.workspaces = workspaces;
        this.travelers = travelers;
    }


    @Transactional(readOnly = true)
    public Page<DiscoveryCardResponse> browse(
            DiscoveryFilters filters, String cursor, Integer requestedLimit) {
        int limit = clamp(requestedLimit);
        InstantCursor from = cursor == null ? null : InstantCursor.decode(cursor);

        List<Itinerary> found =
                itineraries.findDiscoveryPage(
                        archivedArray(),
                        filters.query(),
                        filters.destination(),
                        filters.minDays(),
                        filters.maxDays(),
                        from == null ? null : from.at(),
                        from == null ? null : from.id(),
                        limit + 1);

        boolean more = found.size() > limit;
        List<Itinerary> rows = more ? found.subList(0, limit) : found;
        List<DiscoveryCardResponse> cards = project(rows);

        if (!more) {
            return Page.exhausted(cards);
        }
        Itinerary last = rows.getLast();
        return Page.of(cards, InstantCursor.encode(last.publishedAt(), last.id()));
    }


    @Transactional(readOnly = true)
    public DiscoveryCountResponse count(DiscoveryFilters filters) {
        return new DiscoveryCountResponse(
                itineraries.countDiscoverable(
                        archivedArray(),
                        filters.query(),
                        filters.destination(),
                        filters.minDays(),
                        filters.maxDays()));
    }


    @Transactional(readOnly = true)
    public List<DiscoveryCardResponse> recommended() {
        List<Itinerary> candidates = itineraries.findRecommendable(archivedArray(), RECOMMENDED_PROBE);

        Set<UUID> authorsSeen = new HashSet<>();
        List<Itinerary> distinct =
                candidates.stream()
                        .filter(itinerary -> authorsSeen.add(itinerary.ownerId()))
                        .limit(RECOMMENDED_CAP)
                        .toList();

        return project(distinct);
    }


    @Transactional(readOnly = true)
    public List<TrendingDestinationResponse> trending() {
        return itineraries
                .findTrendingDestinations(
                        Instant.now().minus(TRENDING_WINDOW), archivedArray(), TRENDING_CAP)
                .stream()
                .map(
                        row ->
                                new TrendingDestinationResponse(
                                        row.getDestination(), row.getTripCount(), row.getCoverImageUrl()))
                .toList();
    }


    @Transactional(readOnly = true)
    public DiscoverySuggestionsResponse suggestions(DiscoveryFilters filters) {
        if (filters.query() == null) {
            return new DiscoverySuggestionsResponse(List.of(), List.of());
        }
        return new DiscoverySuggestionsResponse(
                itineraries.suggestDestinations(
                        archivedArray(), filters.query(), SUGGESTIONS_PER_GROUP),
                itineraries.suggestTitles(archivedArray(), filters.query(), SUGGESTIONS_PER_GROUP));
    }


    private String archivedArray() {
        Set<UUID> archived = workspaces.allArchivedItineraryIds();
        return archived.isEmpty()
                ? "{}"
                : archived.stream().map(UUID::toString).collect(Collectors.joining(",", "{", "}"));
    }


    private List<DiscoveryCardResponse> project(List<Itinerary> rows) {
        if (rows.isEmpty()) {
            return List.of();
        }
        Map<UUID, Long> dayCounts = days.dayCountsOf(rows.stream().map(Itinerary::id).toList());
        Map<UUID, TravelerCardResponse> authors = authorsOf(rows);

        return rows.stream()
                .map(itinerary -> cardOf(itinerary, dayCounts, authors))
                .filter(card -> card != null)
                .toList();
    }


    private DiscoveryCardResponse cardOf(
            Itinerary itinerary,
            Map<UUID, Long> dayCounts,
            Map<UUID, TravelerCardResponse> authors) {
        TravelerCardResponse author = authors.get(itinerary.ownerId());
        if (author == null) {
            log.warn("Published itinerary withheld from discovery: id={} authorMissing", itinerary.id());
            return null;
        }
        return DiscoveryCardResponse.of(
                itinerary, dayCounts.getOrDefault(itinerary.id(), 0L).intValue(), author);
    }


    private Map<UUID, TravelerCardResponse> authorsOf(List<Itinerary> rows) {
        List<UUID> ids = rows.stream().map(Itinerary::ownerId).distinct().toList();
        return travelers.summariesByIds(ids).stream()
                .collect(Collectors.toMap(TravelerSummary::id, TravelerCardResponse::of));
    }


    private static int clamp(Integer requestedLimit) {
        if (requestedLimit == null || requestedLimit < 1) {
            return DEFAULT_PAGE_SIZE;
        }
        return Math.min(requestedLimit, MAX_PAGE_SIZE);
    }
}
