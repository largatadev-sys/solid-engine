package com.largata.trip.workspace.adapter;

import com.largata.trip.room.ArchiveState;
import com.largata.trip.room.PublicationState;
import com.largata.trip.room.TripFence;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;


@Configuration
class TripFenceConfig {

    @Bean
    TripFence tripFence(ArchiveState room, PublicationState publication) {
        return new TripFence(room, publication);
    }
}
