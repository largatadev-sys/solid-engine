package com.largata.itinerary;

import com.largata.common.authz.ItineraryNotFoundException;
import java.time.LocalDate;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;


@Service
public class ShareCardVersionService {

    private final ItineraryRepository itineraries;

    ShareCardVersionService(ItineraryRepository itineraries) {
        this.itineraries = itineraries;
    }


    @Transactional(propagation = Propagation.MANDATORY)
    public void bump(UUID itineraryId) {
        itineraries.bumpShareCardVersion(itineraryId);
    }


    @Transactional(readOnly = true)
    public long currentVersion(UUID itineraryId) {
        Long version = itineraries.shareCardVersionOf(itineraryId);
        if (version == null) {
            throw new ItineraryNotFoundException();
        }
        return version;
    }


    public record CardInputs(String title, String destination, LocalDate startDate, LocalDate endDate) {

        public static CardInputs of(Itinerary itinerary) {
            return new CardInputs(
                    itinerary.title(),
                    itinerary.destination(),
                    itinerary.startDate(),
                    itinerary.endDate());
        }
    }
}
