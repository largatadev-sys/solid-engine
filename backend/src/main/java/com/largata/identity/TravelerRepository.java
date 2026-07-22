package com.largata.identity;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/** Persistence for {@link Traveler}. Package-private surface: the module is reached via its service (ADR-002). */
interface TravelerRepository extends JpaRepository<Traveler, UUID> {

    Optional<Traveler> findByFirebaseUid(String firebaseUid);

    /**
     * Travelers whose snapshot email matches, case-insensitively (S1.2, the already-a-member check).
     *
     * <p>A list, not an {@code Optional}: {@code email} is a non-unique snapshot (only {@code
     * firebase_uid} is unique), so in principle two rows can share one address. The caller asks
     * whether <em>any</em> of them is a member — the honest shape for a column that carries no
     * uniqueness guarantee. {@code lower(email)} matches the normalisation invitations are stored
     * under, so a mixed-case snapshot still compares equal.
     */
    @Query("SELECT t.id FROM Traveler t WHERE lower(t.email) = :email")
    List<UUID> findIdsByEmail(@Param("email") String email);
}
