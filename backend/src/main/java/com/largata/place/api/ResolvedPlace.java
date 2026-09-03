package com.largata.place.api;


public record ResolvedPlace(PlaceCandidate place, boolean nearby) {

    public static final ResolvedPlace NOWHERE = new ResolvedPlace(null, false);


    public static ResolvedPlace at(PlaceCandidate place) {
        return place == null ? NOWHERE : new ResolvedPlace(place, false);
    }


    public static ResolvedPlace near(PlaceCandidate place) {
        return place == null ? NOWHERE : new ResolvedPlace(place, true);
    }
}
