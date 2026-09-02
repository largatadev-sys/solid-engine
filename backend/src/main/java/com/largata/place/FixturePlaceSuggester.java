package com.largata.place;

import com.largata.place.api.PlaceCandidate;
import com.largata.place.api.PlaceSuggester;
import java.math.BigDecimal;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;


class FixturePlaceSuggester implements PlaceSuggester {

    private static final List<PlaceCandidate> WORLD =
            List.of(
                    candidate("Big Lagoon", "El Nido, Palawan", "11.1949", "119.4013", "water"),
                    candidate("Small Lagoon", "El Nido, Palawan", "11.1836", "119.3921", "water"),
                    candidate("Nacpan Beach", "El Nido, Palawan", "11.3167", "119.4167", "beach"),
                    candidate("Las Cabanas Beach", "El Nido, Palawan", "11.1697", "119.3897", "beach"),
                    candidate("Shimizu Island", "El Nido, Palawan", "11.1583", "119.3417", "island"),
                    candidate("Rizal Park", "Manila, Metro Manila", "14.5825", "120.9789", "park"),
                    candidate("Sapporo Clock Tower", "Sapporo, Hokkaido", "43.0625", "141.3536", "attraction"),
                    candidate("Kamppi", "Helsinki, Uusimaa", "60.1689", "24.9317", "suburb"));

    @Override
    public List<PlaceCandidate> suggest(String query, BigDecimal biasLatitude, BigDecimal biasLongitude) {
        String needle = query.strip().toLowerCase(Locale.ROOT);

        List<PlaceCandidate> matches =
                WORLD.stream()
                        .filter(candidate -> matches(candidate, needle))
                        .sorted(nearest(biasLatitude, biasLongitude))
                        .toList();

        return matches.size() > PhotonPlaceSuggester.MAX_RESULTS
                ? matches.subList(0, PhotonPlaceSuggester.MAX_RESULTS)
                : matches;
    }


    private static boolean matches(PlaceCandidate candidate, String needle) {
        return candidate.name().toLowerCase(Locale.ROOT).contains(needle)
                || (candidate.context() != null && candidate.context().toLowerCase(Locale.ROOT).contains(needle));
    }


    private static Comparator<PlaceCandidate> nearest(BigDecimal biasLatitude, BigDecimal biasLongitude) {
        if (biasLatitude == null || biasLongitude == null) {
            return Comparator.comparing(PlaceCandidate::name);
        }
        return Comparator.comparingDouble(candidate -> squaredDistance(candidate, biasLatitude, biasLongitude));
    }


    private static double squaredDistance(PlaceCandidate candidate, BigDecimal lat, BigDecimal lng) {
        double dLat = candidate.latitude().doubleValue() - lat.doubleValue();
        double dLng = candidate.longitude().doubleValue() - lng.doubleValue();
        return dLat * dLat + dLng * dLng;
    }


    private static PlaceCandidate candidate(String name, String context, String lat, String lng, String kind) {
        return new PlaceCandidate(name, context, new BigDecimal(lat), new BigDecimal(lng), kind);
    }
}
