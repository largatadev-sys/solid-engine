package com.largata.itinerary;

import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;


interface ActivityHistoryRepository extends JpaRepository<ActivityHistoryEntry, UUID> {}
