package com.largata.trip.history;

import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;


interface ActivityHistoryRepository extends JpaRepository<ActivityHistoryEntry, UUID> {}
