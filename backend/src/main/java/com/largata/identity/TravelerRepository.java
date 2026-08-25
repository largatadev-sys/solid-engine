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


    @Query("SELECT t FROM Traveler t WHERE lower(t.handle) = :handle")
    Optional<Traveler> findByHandle(@Param("handle") String handle);


    @Query("SELECT count(t) FROM Traveler t WHERE lower(t.handle) = :handle")
    long countByHandle(@Param("handle") String handle);


    @Query("SELECT count(t) FROM Traveler t WHERE lower(t.handle) = :handle AND t.id <> :exceptId")
    long countByHandleOtherThan(@Param("handle") String handle, @Param("exceptId") UUID exceptId);

    String PEOPLE_MATCH = """
            t.onboarding_completed_at IS NOT NULL
              AND t.handle IS NOT NULL
              AND t.id <> CAST(:callerId AS uuid)
              AND (lower(t.handle) LIKE :prefix || '%'
                   OR lower(t.display_name) LIKE :prefix || '%')
            """;


    String PEOPLE_RANK =
            "(CASE WHEN lower(t.handle) = :prefix THEN 0 "
                    + "WHEN lower(t.handle) LIKE :prefix || '%' THEN 1 ELSE 2 END)";


    String CURSOR_RANK =
            "(CASE WHEN lower(c.handle) = :prefix THEN 0 "
                    + "WHEN lower(c.handle) LIKE :prefix || '%' THEN 1 ELSE 2 END)";


    @Query(value = """
            SELECT * FROM traveler t
            WHERE
            """ + PEOPLE_MATCH + """
              AND (CAST(:cursorId AS uuid) IS NULL
                   OR (""" + PEOPLE_RANK + """
                      , lower(t.display_name), t.id) > (
                          SELECT """ + CURSOR_RANK + """
                               , lower(c.display_name), c.id
                          FROM traveler c WHERE c.id = CAST(:cursorId AS uuid)))
            ORDER BY """ + PEOPLE_RANK + """
                   , lower(t.display_name) ASC, t.id ASC
            LIMIT :pageSize
            """, nativeQuery = true)
    List<Traveler> searchPeople(
            @Param("prefix") String prefix,
            @Param("callerId") UUID callerId,
            @Param("cursorId") UUID cursorId,
            @Param("pageSize") int pageSize);
}
