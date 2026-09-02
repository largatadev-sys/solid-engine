package com.largata.place.api;

import java.math.BigDecimal;
import java.util.List;


public interface PlaceSuggester {

    List<PlaceCandidate> suggest(String query, BigDecimal biasLatitude, BigDecimal biasLongitude);
}
