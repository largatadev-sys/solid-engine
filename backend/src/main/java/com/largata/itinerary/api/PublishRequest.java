package com.largata.itinerary.api;

import com.largata.itinerary.ItineraryStatus;


public record PublishRequest(String audience) {


    public ItineraryStatus toAudience() {
        return ItineraryStatus.audience(audience);
    }


    public static ItineraryStatus audienceOf(PublishRequest request) {
        return request == null ? ItineraryStatus.PUBLIC : request.toAudience();
    }
}
