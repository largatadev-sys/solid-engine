package com.largata.identity;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;


interface TravelerRepository extends JpaRepository<Traveler, UUID> {

    Optional<Traveler> findByFirebaseUid(String firebaseUid);


    @Query("SELECT t.id FROM Traveler t WHERE lower(t.email) = :email")
    List<UUID> findIdsByEmail(@Param("email") String email);
}
