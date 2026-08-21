package com.largata.chat;

import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Limit;
import org.springframework.data.jpa.repository.JpaRepository;


interface ChatMessageRepository extends JpaRepository<ChatMessage, UUID> {

    List<ChatMessage> findByItineraryIdOrderByIdDesc(UUID itineraryId, Limit limit);


    List<ChatMessage> findByItineraryIdAndIdLessThanOrderByIdDesc(UUID itineraryId, UUID cursor, Limit limit);
}
