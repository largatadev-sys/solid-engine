package com.largata.identity;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;


interface VanityPoolRepository extends JpaRepository<VanityPoolEntry, VanityPoolEntry.Key> {

    @Query(
            value =
                    """
                    SELECT pool_number FROM vanity_pool
                    WHERE cohort = :cohort AND claimed_at IS NULL
                    ORDER BY draw_order
                    FOR UPDATE SKIP LOCKED
                    LIMIT 1
                    """,
            nativeQuery = true)
    Optional<Integer> nextUnclaimed(@Param("cohort") short cohort);


    @Modifying
    @Query(
            value =
                    """
                    UPDATE vanity_pool SET claimed_at = now()
                    WHERE cohort = :cohort AND pool_number = :poolNumber AND claimed_at IS NULL
                    """,
            nativeQuery = true)
    int markClaimed(@Param("cohort") short cohort, @Param("poolNumber") int poolNumber);


    @Modifying
    @Query(
            value =
                    """
                    INSERT INTO vanity_pool (cohort, pool_number, draw_order)
                    SELECT :cohort, n, row_number() OVER (ORDER BY random()) - 1
                    FROM generate_series(:from, :to) AS n
                    ON CONFLICT (cohort, pool_number) DO NOTHING
                    """,
            nativeQuery = true)
    int generate(@Param("cohort") short cohort, @Param("from") int from, @Param("to") int to);


    @Query(value = "SELECT count(*) FROM vanity_pool WHERE cohort = :cohort", nativeQuery = true)
    long sizeOf(@Param("cohort") short cohort);


    @Query(
            value = "SELECT coalesce(max(pool_number), -1) FROM vanity_pool WHERE cohort = :cohort",
            nativeQuery = true)
    int highestNumberIn(@Param("cohort") short cohort);
}
