package com.largata.trip.trip;



public record PublishRequest(String audience) {


    public Visibility toAudience() {
        return Visibility.audience(audience);
    }


    public static Visibility audienceOf(PublishRequest request) {
        return request == null ? Visibility.PUBLIC : request.toAudience();
    }


    public static void requirePublicAudience(PublishRequest request) {
        audienceOf(request);
    }
}
