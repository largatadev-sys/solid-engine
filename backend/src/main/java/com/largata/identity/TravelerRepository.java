package com.largata.identity;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

/** Persistence for {@link Traveler}. Package-private surface: the module is reached via its service (ADR-002). */
interface TravelerRepository extends JpaRepository<Traveler, UUID> {

    Optional<Traveler> findByFirebaseUid(String firebaseUid);
}
