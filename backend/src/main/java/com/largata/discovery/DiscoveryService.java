package com.largata.discovery;

import com.largata.common.api.Cursor;
import com.largata.common.api.InstantCursor;
import com.largata.common.api.Page;
import com.largata.discovery.api.DiscoveryCardResponse;
import com.largata.discovery.api.DiscoveryCountResponse;
import com.largata.discovery.api.DiscoverySuggestionsResponse;
import com.largata.discovery.api.PeoplePageResponse;
import com.largata.discovery.api.TrendingDestinationResponse;
import com.largata.identity.TravelerService;
import com.largata.identity.api.TravelerCardResponse;
import com.largata.itinerary.api.ItineraryDiscoveryApi;
import com.largata.itinerary.api.ItineraryDiscoveryApi.DiscoverableItinerary;
import com.largata.itinerary.api.ItineraryDiscoveryApi.DiscoveryQuery;
import com.largata.trip.api.MembershipApi;
import java.time.Duration;
import java.time.Instant;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;


@Service
public class DiscoveryService {

    private static final int RECOMMENDED_CAP = 8;
    private static final int RECOMMENDED_PROBE = 200;
    private static final int TRENDING_CAP = 12;
    private static final int SUGGESTIONS_PER_GROUP = 3;
    private static final int DEFAULT_PAGE_SIZE = 20;
    private static final int MAX_PAGE_SIZE = 50;

    private static final Duration TRENDING_WINDOW = Duration.ofDays(30);

    private final ItineraryDiscoveryApi itineraries;
    private final TravelerService travelers;
    private final MembershipApi workspaces;

    DiscoveryService(
            ItineraryDiscoveryApi itineraries,
            TravelerService travelers,
            MembershipApi workspaces) {
        this.itineraries = itineraries;
        this.travelers = travelers;
        this.workspaces = workspaces;
    }


    @Transactional(readOnly = true)
    public Page<DiscoveryCardResponse> browse(
            DiscoveryFilters filters, String cursor, Integer requestedLimit) {
        int limit = clamp(requestedLimit);
        InstantCursor from = cursor == null ? null : InstantCursor.decode(cursor);

        List<DiscoverableItinerary> found =
                itineraries.page(
                        queryOf(filters),
                        from == null ? null : from.at(),
                        from == null ? null : from.id(),
                        limit + 1);

        boolean more = found.size() > limit;
        List<DiscoverableItinerary> rows = more ? found.subList(0, limit) : found;
        List<DiscoveryCardResponse> cards = project(rows);

        if (!more) {
            return Page.exhausted(cards);
        }
        DiscoverableItinerary last = rows.getLast();
        return Page.of(cards, InstantCursor.encode(last.publishedAt(), last.id()));
    }


    @Transactional(readOnly = true)
    public DiscoveryCountResponse count(DiscoveryFilters filters) {
        return new DiscoveryCountResponse(itineraries.count(queryOf(filters)));
    }


    @Transactional(readOnly = true)
    public List<DiscoveryCardResponse> recommended() {
        List<DiscoverableItinerary> candidates =
                itineraries.mostRecent(queryOf(DiscoveryFilters.none()), RECOMMENDED_PROBE);

        Set<UUID> authorsSeen = new HashSet<>();
        return project(
                candidates.stream()
                        .filter(itinerary -> itinerary.coverImageUrl() != null)
                        .filter(itinerary -> authorsSeen.add(itinerary.ownerId()))
                        .limit(RECOMMENDED_CAP)
                        .toList());
    }


    @Transactional(readOnly = true)
    public List<TrendingDestinationResponse> trending() {
        DiscoveryQuery query = queryOf(DiscoveryFilters.none());
        List<String> destinations =
                itineraries.destinationsPublishedSince(
                        query, Instant.now().minus(TRENDING_WINDOW), TRENDING_CAP);

        return destinations.stream()
                .map(
                        destination -> {
                            List<DiscoverableItinerary> matching =
                                    itineraries.mostRecent(withDestination(query, destination), 1);
                            return new TrendingDestinationResponse(
                                    destination,
                                    itineraries.count(withDestination(query, destination)),
                                    matching.isEmpty() ? null : matching.getFirst().coverImageUrl());
                        })
                .toList();
    }


    @Transactional(readOnly = true)
    public DiscoverySuggestionsResponse suggestions(DiscoveryFilters filters, UUID callerId) {
        if (filters.query() == null) {
            return new DiscoverySuggestionsResponse(List.of(), List.of(), List.of(), false);
        }
        List<TravelerCardResponse> probed =
                peopleCards(filters.query(), callerId, null, SUGGESTIONS_PER_GROUP + 1);
        boolean morePeople = probed.size() > SUGGESTIONS_PER_GROUP;

        DiscoveryQuery query = queryOf(filters);
        return new DiscoverySuggestionsResponse(
                distinctDestinations(query),
                itineraries.titlesMatching(query, SUGGESTIONS_PER_GROUP),
                morePeople ? probed.subList(0, SUGGESTIONS_PER_GROUP) : probed,
                morePeople);
    }


    @Transactional(readOnly = true)
    public PeoplePageResponse people(
            String query, UUID callerId, String cursor, Integer requestedLimit) {
        int limit = clamp(requestedLimit);
        UUID from = cursor == null ? null : Cursor.decode(cursor);

        List<TravelerCardResponse> found = peopleCards(query, callerId, from, limit + 1);

        boolean more = found.size() > limit;
        List<TravelerCardResponse> rows = more ? found.subList(0, limit) : found;
        Page<TravelerCardResponse> page =
                more ? Page.of(rows, Cursor.encode(rows.getLast().id())) : Page.exhausted(rows);

        return PeoplePageResponse.of(page, travelers.countPeople(query, callerId));
    }


    private List<String> distinctDestinations(DiscoveryQuery query) {
        return itineraries.destinationsPublishedSince(query, Instant.EPOCH, SUGGESTIONS_PER_GROUP);
    }


    private DiscoveryQuery queryOf(DiscoveryFilters filters) {
        return new DiscoveryQuery(
                filters.query(),
                filters.destination(),
                filters.minDays(),
                filters.maxDays(),
                workspaces.allArchivedTripIds(),
                Set.of());
    }


    private static DiscoveryQuery withDestination(DiscoveryQuery query, String destination) {
        return new DiscoveryQuery(
                query.text(),
                destination,
                query.minDays(),
                query.maxDays(),
                query.excludedTripIds(),
                query.excludedOwnerIds());
    }


    private List<DiscoveryCardResponse> project(List<DiscoverableItinerary> rows) {
        if (rows.isEmpty()) {
            return List.of();
        }
        Map<UUID, TravelerCardResponse> authors =
                travelers
                        .summariesByIds(rows.stream().map(DiscoverableItinerary::ownerId).distinct().toList())
                        .stream()
                        .map(TravelerCardResponse::of)
                        .collect(Collectors.toMap(TravelerCardResponse::id, Function.identity()));

        return rows.stream()
                .map(
                        itinerary ->
                                new DiscoveryCardResponse(
                                        itinerary.id(),
                                        itinerary.title(),
                                        itinerary.destination(),
                                        itinerary.durationDays() == null ? 0 : itinerary.durationDays(),
                                        itinerary.coverImageUrl(),
                                        authors.get(itinerary.ownerId()),
                                        itinerary.publishedAt()))
                .toList();
    }


    private List<TravelerCardResponse> peopleCards(
            String query, UUID callerId, UUID cursorId, int pageSize) {
        return travelers.searchPeople(query, callerId, cursorId, pageSize).stream()
                .map(TravelerCardResponse::of)
                .toList();
    }


    private static int clamp(Integer requestedLimit) {
        if (requestedLimit == null || requestedLimit < 1) {
            return DEFAULT_PAGE_SIZE;
        }
        return Math.min(requestedLimit, MAX_PAGE_SIZE);
    }
}
