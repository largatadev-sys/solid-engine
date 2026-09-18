package com.largata.trip.workspace.adapter;

import com.largata.trip.api.ArchiveState;
import com.largata.trip.api.PublicationState;
import com.largata.trip.api.TripFence;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;


@Configuration
class TripFenceConfig {

    @Bean
    TripFence tripFence(ArchiveState room, PublicationState publication) {
        return new TripFence(room, publication);
    }
}
