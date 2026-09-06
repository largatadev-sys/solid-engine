package com.largata.diary.controller;

import com.largata.diary.dto.DiarySectionsResponse;
import com.largata.diary.service.DiaryService;
import com.largata.identity.AuthoredContentAudience;
import com.largata.identity.IdentityExceptions.NoSuchHandleException;
import com.largata.identity.Traveler;
import com.largata.identity.TravelerService;
import com.largata.identity.TravelerSummary;
import com.largata.identity.web.CurrentTraveler;
import com.largata.publication.ItineraryObjectService;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1/travelers/{handle}/diaries")
class ProfileDiariesController {

    private final DiaryService diaries;
    private final TravelerService travelers;
    private final ItineraryObjectService publications;
    private final AuthoredContentAudience audience;

    ProfileDiariesController(
            DiaryService diaries,
            TravelerService travelers,
            ItineraryObjectService publications,
            AuthoredContentAudience audience) {
        this.diaries = diaries;
        this.travelers = travelers;
        this.publications = publications;
        this.audience = audience;
    }


    @GetMapping
    DiarySectionsResponse sections(@CurrentTraveler Traveler viewer, @PathVariable String handle) {
        TravelerSummary subject =
                travelers.onboardedByExactHandle(handle).orElseThrow(NoSuchHandleException::new);
        audience.requireReadable(viewer.id(), subject.id());

        DiaryService.Sections sections = diaries.sectionsOf(subject.id());
        List<UUID> tripIds =
                sections.diaries().stream()
                        .map(view -> view.diary().tripId())
                        .filter(tripId -> tripId != null)
                        .toList();
        Map<UUID, UUID> publishedAs = publications.objectIdsByTrip(tripIds);

        return DiarySectionsResponse.of(sections, publishedAs);
    }
}
