package com.largata.identity;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;


interface FollowRepository extends JpaRepository<Follow, Follow.Key> {

    @Modifying
    @Query(value = """
            INSERT INTO follow (follower_id, followee_id, created_at)
            VALUES (:followerId, :followeeId, :createdAt)
            ON CONFLICT DO NOTHING
            """, nativeQuery = true)
    int follow(
            @Param("followerId") UUID followerId,
            @Param("followeeId") UUID followeeId,
            @Param("createdAt") Instant createdAt);


    @Modifying
    @Query("DELETE FROM Follow f WHERE f.followerId = :followerId AND f.followeeId = :followeeId")
    int unfollow(@Param("followerId") UUID followerId, @Param("followeeId") UUID followeeId);


    @Query("SELECT count(f) FROM Follow f WHERE f.followeeId = :travelerId")
    long countFollowers(@Param("travelerId") UUID travelerId);


    @Query("SELECT count(f) FROM Follow f WHERE f.followerId = :travelerId")
    long countFollowing(@Param("travelerId") UUID travelerId);


    @Query("""
            SELECT count(f) FROM Follow f
            WHERE f.followerId = :followerId AND f.followeeId = :followeeId
            """)
    long edgeCount(@Param("followerId") UUID followerId, @Param("followeeId") UUID followeeId);


    @Query("""
            SELECT f.followeeId FROM Follow f
            WHERE f.followerId = :followerId AND f.followeeId IN :candidates
            """)
    List<UUID> followedAmong(
            @Param("followerId") UUID followerId, @Param("candidates") Collection<UUID> candidates);


    @Query(value = """
            SELECT * FROM follow f
            WHERE f.followee_id = :travelerId
              AND (CAST(:cursorAt AS timestamptz) IS NULL
                   OR (f.created_at, f.follower_id)
                      < (CAST(:cursorAt AS timestamptz), CAST(:cursorId AS uuid)))
            ORDER BY f.created_at DESC, f.follower_id DESC
            LIMIT :pageSize
            """, nativeQuery = true)
    List<Follow> followersPage(
            @Param("travelerId") UUID travelerId,
            @Param("cursorAt") Instant cursorAt,
            @Param("cursorId") UUID cursorId,
            @Param("pageSize") int pageSize);


    @Query(value = """
            SELECT * FROM follow f
            WHERE f.follower_id = :travelerId
              AND (CAST(:cursorAt AS timestamptz) IS NULL
                   OR (f.created_at, f.followee_id)
                      < (CAST(:cursorAt AS timestamptz), CAST(:cursorId AS uuid)))
            ORDER BY f.created_at DESC, f.followee_id DESC
            LIMIT :pageSize
            """, nativeQuery = true)
    List<Follow> followingPage(
            @Param("travelerId") UUID travelerId,
            @Param("cursorAt") Instant cursorAt,
            @Param("cursorId") UUID cursorId,
            @Param("pageSize") int pageSize);


    @Query("SELECT f.followeeId FROM Follow f WHERE f.followerId = :followerId")
    List<UUID> followeeIdsOf(@Param("followerId") UUID followerId);
}
